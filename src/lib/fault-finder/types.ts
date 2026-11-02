/**
 * SANAYİPRO 2.0 — Doğrulanmış OBD-II / EOBD DTC Veri Modeli
 * Standart: SAE J2012 / ISO 15031-6 uyumlu
 */

export type DTCCategory = "P" | "C" | "B" | "U";

export type DTCType = "GENERIC" | "MANUFACTURER_SPECIFIC";

export type EvidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "PRECAUTIONARY";

export type DTCPossibleCause = {
  cause: string;
  evidenceLevel: EvidenceLevel;
  likelihoodPercent?: number;
  verificationStep: string;
};

export type DTCDiagnosticStep = {
  stepNumber: number;
  action: string;
  requiredTool: string;
  safetyWarning?: string;
};

export type DTCRecord = {
  code: string; // e.g. "P0300"
  standardCode: string;
  category: DTCCategory; // Powertrain, Chassis, Body, Network
  type: DTCType; // Standart (Generic) vs Üreticiye Özel (Manufacturer)
  manufacturer?: string; // e.g. "VAG", "Ford", "BMW", "Renault" (üreticiye özel ise)
  engineVariant?: string; // Bilinen motor varyantı (opsiyonel)
  
  titleTr: string; // Doğrulanmış Türkçe Açıklama
  titleEn: string; // Orijinal Teknik SAE/ISO Açıklaması
  systemAffected: string; // İlgili Araç Sistemi (Ateşleme, Yakıt, Emisyon, vb.)
  craftsmanBranch: string; // İlgilenmesi Önerilen Usta Branşı (Motor & Mekanik, Oto Elektrik, vb.)
  
  symptoms: readonly string[]; // Muhtemel Belirtiler
  possibleCauses: readonly DTCPossibleCause[]; // Olası Nedenler (Kanıt düzeyli)
  diagnosticSteps: readonly DTCDiagnosticStep[]; // Önerilen Kontrol Sırası
  requiredTools: readonly string[]; // Gerekli Test Cihazları
  
  source: string; // Kaynak (SAE J2012, ISO 15031-6, OEM Technical Service Bulletin)
  sourceVersion: string; // Kaynak Sürümü
  lastVerifiedDate: string; // Son Doğrulama Tarihi (ISO format)
  verifiedCompatibility: boolean; // Araç uyumluluğunun kesinliği
  disclaimer: string; // Yasal / Teşhis Ayrımı
};

export type FaultQueryHistoryItem = {
  id: string;
  code: string;
  queriedAt: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  technicianNotes?: string;
  attachedToOrderId?: string;
};
