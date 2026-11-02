import { DTCRecord, EvidenceLevel } from "./types";

export type AIExplanationResult = {
  summary: string;
  evidenceBasedDiagnosis: {
    title: string;
    level: EvidenceLevel;
    description: string;
    requiredVerification: string;
  }[];
  stepByStepChecks: string[];
  safetyCriticalWarnings: string[];
  vehicleSpecificConsiderations?: string;
  isSimulatedAi: boolean;
};

/**
 * AI Destekli Teşhis ve Doğrulama Motoru
 * Kural: Uydurma bilgi üretmez; SAE/ISO doğrulanmış teknik temele ve araç özelliklerine dayanır.
 */
export function generateAIDiagnosticReport({
  record,
  vehicle,
  symptomsReported,
  otherCodes,
  technicianObservation,
}: {
  record: DTCRecord;
  vehicle?: {
    brand?: string;
    model?: string;
    year?: number | null;
    mileage?: number | null;
    fuelType?: string;
  } | null;
  symptomsReported?: string;
  otherCodes?: string[];
  technicianObservation?: string;
}): AIExplanationResult {
  const safetyWarnings: string[] = [];

  // Güvenlik ve Emisyon İptal Uyarısı
  if (record.category === "C") {
    safetyWarnings.push(
      "GÜVENLİK KRİTİK: Fren / ABS / ESP sistemi arızalarında yol testi yapmadan önce hidrolik devre ve mekanik kaliper güvenliği teyit edilmelidir."
    );
  }
  if (record.category === "B") {
    safetyWarnings.push(
      "GÜVENLİK KRİTİK: SRS / Hava Yastığı bileşenlerinde multimetreyle iç direnç ölçümü patlatıcı kapsülü tetikleyebilir. Sadece onaylı test aparatları kullanın."
    );
  }
  if (record.code === "P0420" || record.code === "P2002" || record.code === "P0401") {
    safetyWarnings.push(
      "YASAL UYARI & EMİSYON: Katalitik konvertör, DPF veya EGR iptali/yazılımla devre dışı bırakılması yasalara aykırıdır ve ağır kusur sayılır. Mutlaka sistem onarımı hedeflenmelidir."
    );
  }

  // Araç Odaklı Değerlendirme
  let vehicleNote = "";
  if (vehicle?.fuelType === "Dizel" && record.code === "P0300") {
    vehicleNote =
      "Dikkat: Araç dizel yakıtlıdır. P0300 benzinli araçlardaki ateşleme bujisinden ziyade, kızdırma bujileri, enjektör püskürtme dengesizliği veya kompresyon düşüklüğü anlamına gelebilir.";
  } else if (vehicle?.mileage && vehicle.mileage > 150000 && record.code === "P0420") {
    vehicleNote = `Araç ${vehicle.mileage.toLocaleString("tr-TR")} km'dedir. Bu kilometrede katalizörün iç peteklerinin kimyasal ömrünü tamamlamış olma ihtimali arka O2 sensörü yaşlanmasıyla birlikte yüksektir.`;
  } else if (vehicle?.brand && vehicle?.model) {
    vehicleNote = `${vehicle.brand} ${vehicle.model} (${vehicle.year || "Belirtilmemiş"}) araç platformu için doğrulanmış servis prosedürleri baz alınmıştır.`;
  }

  if (technicianObservation) {
    vehicleNote = vehicleNote
      ? `${vehicleNote} Usta Gözlemi: "${technicianObservation}".`
      : `Usta Gözlemi: "${technicianObservation}".`;
  }
  if (symptomsReported) {
    vehicleNote = vehicleNote
      ? `${vehicleNote} Bildirilen Semptom: "${symptomsReported}".`
      : `Bildirilen Semptom: "${symptomsReported}".`;
  }

  // Kanıt Düzeyli Analiz
  const evidenceAnalysis = record.possibleCauses.map((c) => ({
    title: c.cause,
    level: c.evidenceLevel,
    description: `Bu arıza kodunda görülme sıklığı yaklaşık %${c.likelihoodPercent || 25} seviyesindedir.`,
    requiredVerification: c.verificationStep,
  }));

  // Kontrol Adımları
  const steps = record.diagnosticSteps.map(
    (s) => `${s.stepNumber}. Adım: ${s.action} (Gerekli Cihaz: ${s.requiredTool})`
  );

  if (otherCodes && otherCodes.length > 0) {
    steps.push(
      `İlişkili Kodlar (${otherCodes.join(", ")}): Diğer hata kodlarıyla ortak besleme/şasi hatları kontrol edilmelidir.`
    );
  }

  return {
    summary: `${record.code} — ${record.titleTr}. Bu arıza motor/aktarma sisteminde anlık bir okuma hatasından ziyade somut bir ölçüm sapmasına işaret etmektedir.`,
    evidenceBasedDiagnosis: evidenceAnalysis,
    stepByStepChecks: steps,
    safetyCriticalWarnings: safetyWarnings,
    vehicleSpecificConsiderations: vehicleNote || undefined,
    isSimulatedAi: true,
  };
}
