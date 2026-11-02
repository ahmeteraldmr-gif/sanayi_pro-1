"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Car,
  History,
  Sparkles,
  Cpu,
  Layers,
  ClipboardList,
  Check,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/app-shell/demo-provider";
import { lookupDTC } from "@/lib/fault-finder/dtc-database";
import {
  generateAIDiagnosticReport,
  type AIExplanationResult,
} from "@/lib/fault-finder/ai-diagnostic";
import type { DTCRecord } from "@/lib/fault-finder/types";
import type { WorkOrder, Vehicle, Customer } from "@/lib/demo-data";

const QUICK_CODES = ["P0300", "P0420", "P0401", "P2002", "U0100", "C0035", "B1000", "P1101"];

type VehicleSelection = {
  brand?: string;
  model?: string;
  year?: number | null;
  fuelType?: string;
  engine?: string;
  plate?: string;
};

export function FaultFinderPage() {
  const {
    vehicles,
    orders,
    faultHistory,
    saveFaultQuery,
    attachFaultToWorkOrder,
    branchId,
    vehicleFor,
    customerFor,
  } = useDemo();

  // Search input state
  const [inputCode, setInputCode] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("none");
  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customYear, setCustomYear] = useState("");
  const [customFuel, setCustomFuel] = useState("");
  const [customEngine, setCustomEngine] = useState("");

  // Result & UI state
  const [searchResult, setSearchResult] = useState<ReturnType<typeof lookupDTC> | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [techNotes, setTechNotes] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [attachSuccess, setAttachSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    causes: true,
    steps: true,
    symptoms: true,
    ai: true,
  });

  // Active branch active orders
  const branchOrders = useMemo(
    () => orders.filter((o) => o.branchId === branchId),
    [orders, branchId],
  );

  // Selected vehicle object
  const activeVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId),
    [vehicles, selectedVehicleId],
  );

  // Effective vehicle context
  const effectiveVehicle: VehicleSelection | undefined = useMemo(() => {
    if (activeVehicle) {
      return {
        plate: activeVehicle.plate,
        brand: activeVehicle.brand,
        model: activeVehicle.model,
        year: activeVehicle.year,
        fuelType: activeVehicle.fuelType,
      };
    }
    if (customBrand || customModel) {
      return {
        brand: customBrand,
        model: customModel,
        year: customYear ? Number(customYear) : undefined,
        fuelType: customFuel || undefined,
        engine: customEngine || undefined,
      };
    }
    return undefined;
  }, [activeVehicle, customBrand, customModel, customYear, customFuel, customEngine]);

  // Execute lookup
  const handleSearch = useCallback(
    (codeToSearch?: string) => {
      const target = (codeToSearch ?? inputCode).trim().toUpperCase();
      if (!target) return;

      setInputCode(target);
      const res = lookupDTC(target, effectiveVehicle);
      setSearchResult(res);
      setHasSearched(true);
      setAttachSuccess(false);

      if (res.exactMatch) {
        saveFaultQuery({
          code: res.exactMatch.code,
          vehiclePlate: effectiveVehicle?.plate,
          vehicleModel: effectiveVehicle?.model,
          technicianNotes: techNotes,
        });
      }
    },
    [inputCode, effectiveVehicle, saveFaultQuery, techNotes],
  );

  // Quick chips
  const handleQuickChip = (code: string) => {
    setInputCode(code);
    handleSearch(code);
  };

  // AI Diagnostic output memoized
  const aiDiagnosis = useMemo<AIExplanationResult | null>(() => {
    if (!searchResult?.exactMatch) return null;
    return generateAIDiagnosticReport({
      record: searchResult.exactMatch,
      vehicle: effectiveVehicle,
      technicianObservation: techNotes || undefined,
    });
  }, [searchResult, effectiveVehicle, techNotes]);

  // Work order attachment
  const handleAttachToOrder = () => {
    if (!searchResult?.exactMatch || !selectedOrderId) return;
    const rec = searchResult.exactMatch;
    const checklist = rec.diagnosticSteps.map((s) => `${s.action} (Ekipman: ${s.requiredTool})`);

    attachFaultToWorkOrder(selectedOrderId, rec.code, rec.titleTr, checklist);
    setAttachSuccess(true);
    setTimeout(() => setAttachSuccess(false), 4000);
  };

  // Toggle sections
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="fault-finder-container">
      {/* Top Header */}
      <div className="fault-header-section">
        <div className="fault-header-content">
          <div className="fault-header-badge">
            <Cpu size={15} />
            <span>OBD-II / EOBD Teşhis Sistemi</span>
          </div>
          <h1 className="fault-header-title">Arıza Bul & Teşhis Kılavuzu</h1>
          <p className="fault-header-desc">
            Standart SAE J2012 ve üreticiye (OEM) özel arıza kodlarını doğrulayın, kanıt düzeyli
            nedenleri ve güvenli sıralı teşhis adımlarını doğrudan iş emirlerinize aktarın.
          </p>
        </div>
      </div>

      {/* Main Grid: Search & Context Form */}
      <div className="fault-grid">
        {/* Left Column: Search & Vehicle Context */}
        <div className="fault-sidebar-col">
          {/* Card: DTC Input */}
          <div className="fault-card">
            <h2 className="fault-card-title">
              <Search size={18} className="text-primary" />
              <span>Arıza Kodu Sorgula</span>
            </h2>
            <p className="fault-card-subtitle">
              P, C, B veya U ile başlayan 5 karakterli OBD-II kodunu girin.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="fault-search-form"
            >
              <div className="fault-input-wrapper">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  placeholder="Örn: P0420, P0300, C0035, U0100"
                  className="fault-search-input"
                  maxLength={7}
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button type="submit" className="fault-search-button">
                  <Search size={16} />
                  <span>Sorgula</span>
                </Button>
              </div>

              {/* Quick Chips */}
              <div className="fault-quick-chips">
                <span className="fault-chips-label">Hızlı Kodlar:</span>
                <div className="fault-chips-list">
                  {QUICK_CODES.map((code) => (
                    <button
                      key={code}
                      type="button"
                      className={`fault-chip ${inputCode === code ? "active" : ""}`}
                      onClick={() => handleQuickChip(code)}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* Card: Vehicle Context */}
          <div className="fault-card">
            <h2 className="fault-card-title">
              <Car size={18} className="text-primary" />
              <span>Araç Bağlamı (Opsiyonel / OEM İçin Önemli)</span>
            </h2>
            <p className="fault-card-subtitle">
              Üreticiye özel kodlar (P1xxx vb.) için marka ve motor tipi doğrulaması gereklidir.
            </p>

            <div className="fault-vehicle-select-group">
              <label className="fault-field-label">Kayıtlı Araçlardan Seç:</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => {
                  setSelectedVehicleId(e.target.value);
                  if (e.target.value !== "none") {
                    setCustomBrand("");
                    setCustomModel("");
                    setCustomYear("");
                    setCustomFuel("");
                    setCustomEngine("");
                  }
                }}
                className="fault-select-input"
              >
                <option value="none">-- Araç Seçmeden Genel Sorgu --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.brand} {v.model} ({v.year ?? "-"})
                  </option>
                ))}
              </select>
            </div>

            {selectedVehicleId === "none" && (
              <div className="fault-manual-vehicle">
                <div className="fault-form-row">
                  <div className="fault-form-col">
                    <label className="fault-field-label">Marka:</label>
                    <input
                      type="text"
                      placeholder="Örn: Opel, Ford, Renault"
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      className="fault-text-input"
                    />
                  </div>
                  <div className="fault-form-col">
                    <label className="fault-field-label">Model:</label>
                    <input
                      type="text"
                      placeholder="Örn: Astra J, Focus, Megane"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="fault-text-input"
                    />
                  </div>
                </div>

                <div className="fault-form-row">
                  <div className="fault-form-col">
                    <label className="fault-field-label">Yıl:</label>
                    <input
                      type="number"
                      placeholder="Örn: 2016"
                      value={customYear}
                      onChange={(e) => setCustomYear(e.target.value)}
                      className="fault-text-input"
                    />
                  </div>
                  <div className="fault-form-col">
                    <label className="fault-field-label">Yakıt / Motor:</label>
                    <select
                      value={customFuel}
                      onChange={(e) => setCustomFuel(e.target.value)}
                      className="fault-select-input"
                    >
                      <option value="">Yakıt Seçin</option>
                      <option value="Benzin">Benzin</option>
                      <option value="Dizel">Dizel</option>
                      <option value="LPG">Benzin / LPG</option>
                      <option value="Hibrit">Hibrit</option>
                      <option value="Elektrik">Tam Elektrik</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {effectiveVehicle && (
              <div className="fault-active-context-badge">
                <Check size={14} className="text-emerald-500" />
                <span>
                  Aktif Bağlam: <strong>{effectiveVehicle.brand ?? "Genel"}</strong>{" "}
                  {effectiveVehicle.model} {effectiveVehicle.fuelType}
                </span>
              </div>
            )}
          </div>

          {/* Card: History */}
          <div className="fault-card">
            <div className="fault-card-header-row">
              <h2 className="fault-card-title">
                <History size={18} className="text-primary" />
                <span>Son Teşhis Geçmişi</span>
              </h2>
              <span className="fault-history-count">{faultHistory.length} kayıt</span>
            </div>
            {faultHistory.length === 0 ? (
              <p className="fault-empty-history">Bu işletmede henüz arıza sorgusu yapılmadı.</p>
            ) : (
              <div className="fault-history-list">
                {faultHistory.slice(0, 5).map((item) => (
                  <div key={item.id} className="fault-history-item">
                    <div className="fault-history-item-top">
                      <span className="fault-history-code">{item.code}</span>
                      <span className="fault-history-date">
                        {new Date(item.queriedAt).toLocaleDateString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {item.vehiclePlate && (
                      <span className="fault-history-plate">
                        🚗 {item.vehiclePlate} ({item.vehicleModel ?? ""})
                      </span>
                    )}
                    {item.technicianNotes && (
                      <p className="fault-history-title">Not: {item.technicianNotes}</p>
                    )}
                    <button
                      type="button"
                      className="fault-history-reload-btn"
                      onClick={() => handleQuickChip(item.code)}
                    >
                      <RotateCcw size={12} /> Tekrar İncele
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Teşhis Sonuç Ekranı */}
        <div className="fault-main-col">
          {!hasSearched ? (
            <div className="fault-welcome-card">
              <div className="fault-welcome-icon">
                <BookOpen size={40} />
              </div>
              <h3>OBD-II Arıza Kodu Teşhisine Başlayın</h3>
              <p>
                Sol taraftan bir kod girin veya sık karşılaşılan kodlardan birine tıklayın. Standart
                ve OEM bültenlerine dayalı doğrulanmış kontrol adımlarını adım adım uygulayın.
              </p>
              <div className="fault-supported-info">
                <span>Veritabanında Desteklenen Standartlar:</span>
                <div className="fault-supported-tags">
                  <span className="fault-tag">SAE J2012:2020</span>
                  <span className="fault-tag">ISO 15031-6</span>
                  <span className="fault-tag">P, C, B, U Aileleri</span>
                  <span className="fault-tag">OEM TSB Bültenleri</span>
                </div>
              </div>
            </div>
          ) : !searchResult?.isValidFormat ? (
            /* Format Error Card */
            <div className="fault-error-card">
              <div className="fault-error-icon">
                <AlertTriangle size={32} />
              </div>
              <div className="fault-error-body">
                <h3>Geçersiz veya Eksik Kod Formatı</h3>
                <p>{searchResult?.unsupportedReason}</p>

                <div className="fault-format-guide">
                  <strong>Standart Format:</strong> İlk hane sistem (P: Güç aktarma, C: Şasi, B:
                  Gövde, U: İletişim), ardından 4 haneli alfanümerik tanımlayıcı (Örn: P0420, C0035,
                  U0100). Sistem eksik girdilerde tahmin yürütmez.
                </div>
              </div>
            </div>
          ) : !searchResult?.exactMatch ? (
            /* Unknown Code Card */
            <div className="fault-unknown-card">
              <div className="fault-unknown-icon">
                <ShieldAlert size={32} />
              </div>
              <div className="fault-unknown-body">
                <div className="fault-unknown-code-badge">{searchResult.formattedCode}</div>
                <h3>Doğrulanmış Açıklama Bulunamadı</h3>
                <p>{searchResult.unsupportedReason}</p>

                {searchResult.similarMatches.length > 0 && (
                  <div className="fault-suggestions-box">
                    <span>Aynı Gruptaki Doğrulanmış Kodlar:</span>
                    <div className="fault-suggestion-chips">
                      {searchResult.similarMatches.map((sug) => (
                        <button
                          key={sug.code}
                          type="button"
                          className="fault-suggestion-chip"
                          onClick={() => handleQuickChip(sug.code)}
                        >
                          {sug.code} - {sug.titleTr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="fault-unknown-suggestions">
                  <p>Şunları kontrol edebilirsiniz:</p>
                  <ul>
                    <li>Arıza tespit cihazınızın (diagnostik cihazı) sunduğu tam kodu teyit edin.</li>
                    <li>Aracın marka/modeline özel üretici servis bültenlerini (TSB) referans alın.</li>
                    <li>Kodun P, C, B veya U ön ekini doğru yazdığınızdan emin olun.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* Successful Matched DTC Result */
            <DTCResultDisplay
              record={searchResult.exactMatch}
              requiresVehicleInfo={searchResult.requiresVehicleInfo}
              aiDiagnosis={aiDiagnosis}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              branchOrders={branchOrders}
              vehicleFor={vehicleFor}
              customerFor={customerFor}
              selectedOrderId={selectedOrderId}
              setSelectedOrderId={setSelectedOrderId}
              techNotes={techNotes}
              setTechNotes={setTechNotes}
              handleAttachToOrder={handleAttachToOrder}
              attachSuccess={attachSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Result Component Subview
function DTCResultDisplay({
  record,
  requiresVehicleInfo,
  aiDiagnosis,
  expandedSections,
  toggleSection,
  branchOrders,
  vehicleFor,
  customerFor,
  selectedOrderId,
  setSelectedOrderId,
  techNotes,
  setTechNotes,
  handleAttachToOrder,
  attachSuccess,
}: {
  record: DTCRecord;
  requiresVehicleInfo: boolean;
  aiDiagnosis: AIExplanationResult | null;
  expandedSections: { causes: boolean; steps: boolean; symptoms: boolean; ai: boolean };
  toggleSection: (sec: "causes" | "steps" | "symptoms" | "ai") => void;
  branchOrders: readonly WorkOrder[];
  vehicleFor: (order: WorkOrder) => Vehicle;
  customerFor: (order: WorkOrder) => Customer;
  selectedOrderId: string;
  setSelectedOrderId: (id: string) => void;
  techNotes: string;
  setTechNotes: (notes: string) => void;
  handleAttachToOrder: () => void;
  attachSuccess: boolean;
}) {
  const categoryNames: Record<string, string> = {
    P: "Güç Aktarma Organları & Motor (Powertrain)",
    C: "Şasi & Fren / Süspansiyon (Chassis)",
    B: "Gövde & İç Donanım (Body)",
    U: "Ağ & CAN-Bus İletişimi (Network)",
  };

  return (
    <div className="fault-result-container">
      {/* Disclaimer Banner */}
      <div className="fault-disclaimer-banner">
        <AlertTriangle size={18} className="shrink-0" />
        <div>
          <strong>UYARI & TEŞHİS İLKESİ:</strong> {record.disclaimer}
        </div>
      </div>

      {/* OEM Warning Banner if applicable */}
      {requiresVehicleInfo && (
        <div className="fault-oem-warning-banner">
          <ShieldAlert size={18} className="shrink-0 text-amber-500" />
          <div>
            Bu arıza kodu üreticiye özeldir (OEM). En doğru teşhis için lütfen sol taraftan aracın
            markasını ve motor tipini seçiniz.
          </div>
        </div>
      )}

      {/* Primary DTC Header Card */}
      <div className="fault-result-header-card">
        <div className="fault-badge-row">
          <span className="fault-code-pill">{record.code}</span>
          <span className={`fault-type-pill ${record.type}`}>
            {record.type === "GENERIC" ? "Standart SAE J2012" : "Üreticiye Özel (OEM)"}
          </span>
          <span className="fault-category-pill">{categoryNames[record.category]}</span>
          <span className="fault-branch-pill">Usta: {record.craftsmanBranch}</span>
        </div>

        <h2 className="fault-result-title">{record.titleTr}</h2>
        <div className="fault-result-subtitle">
          <span>Orijinal Teknik Tanım:</span> <em>{record.titleEn}</em>
        </div>

        <div className="fault-meta-bar">
          <div className="fault-meta-item">
            <span className="fault-meta-lbl">İlişkili Sistem:</span>
            <span className="fault-meta-val">{record.systemAffected}</span>
          </div>
          <div className="fault-meta-item">
            <span className="fault-meta-lbl">Kaynak & Versiyon:</span>
            <span className="fault-meta-val">
              {record.source} ({record.sourceVersion})
            </span>
          </div>
          {record.manufacturer && (
            <div className="fault-meta-item">
              <span className="fault-meta-lbl">Üretici Grubu:</span>
              <span className="fault-meta-val">{record.manufacturer}</span>
            </div>
          )}
        </div>
      </div>

      {/* Symptoms Section */}
      <div className="fault-accordion-card">
        <button
          type="button"
          className="fault-accordion-header"
          onClick={() => toggleSection("symptoms")}
        >
          <div className="fault-accordion-title">
            <AlertTriangle size={17} className="text-amber-500" />
            <span>Olası Belirtiler ve Araç Davranışı</span>
            <span className="fault-badge-count">{record.symptoms.length}</span>
          </div>
          {expandedSections.symptoms ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSections.symptoms && (
          <div className="fault-accordion-body">
            <ul className="fault-symptom-list">
              {record.symptoms.map((symptom, idx) => (
                <li key={idx} className="fault-symptom-item">
                  <span className="fault-symptom-bullet">•</span>
                  <span>{symptom}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Evidence-Level Causes Section */}
      <div className="fault-accordion-card">
        <button
          type="button"
          className="fault-accordion-header"
          onClick={() => toggleSection("causes")}
        >
          <div className="fault-accordion-title">
            <Layers size={17} className="text-blue-500" />
            <span>Kanıt Düzeyli Olası Nedenler & Doğrulama Metotları</span>
            <span className="fault-badge-count">{record.possibleCauses.length}</span>
          </div>
          {expandedSections.causes ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSections.causes && (
          <div className="fault-accordion-body">
            <div className="fault-causes-grid">
              {record.possibleCauses.map((item, idx) => (
                <div key={idx} className="fault-cause-card">
                  <div className="fault-cause-top">
                    <span className={`fault-evidence-badge ${item.evidenceLevel.toLowerCase()}`}>
                      {item.evidenceLevel === "HIGH"
                        ? "Yüksek Öncelik"
                        : item.evidenceLevel === "MEDIUM"
                          ? "Orta Öncelik"
                          : item.evidenceLevel === "LOW"
                            ? "Düşük / İkincil"
                            : "Önlem"}
                    </span>
                    <span className="fault-cause-idx">#{idx + 1}</span>
                  </div>
                  <h4 className="fault-cause-desc">{item.cause}</h4>
                  <div className="fault-cause-verify">
                    <span className="fault-verify-lbl">Nasıl Doğrulanır:</span>
                    <p className="fault-verify-txt">{item.verificationStep}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step Diagnostic Sequence */}
      <div className="fault-accordion-card">
        <button
          type="button"
          className="fault-accordion-header"
          onClick={() => toggleSection("steps")}
        >
          <div className="fault-accordion-title">
            <Wrench size={17} className="text-emerald-500" />
            <span>Önerilen Sıralı Fiziksel ve Elektriksel Teşhis Adımları</span>
            <span className="fault-badge-count">{record.diagnosticSteps.length}</span>
          </div>
          {expandedSections.steps ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSections.steps && (
          <div className="fault-accordion-body">
            <div className="fault-steps-timeline">
              {record.diagnosticSteps.map((step) => (
                <div key={step.stepNumber} className="fault-step-item">
                  <div className="fault-step-num">{step.stepNumber}</div>
                  <div className="fault-step-content">
                    <p className="fault-step-action">{step.action}</p>

                    <div className="fault-step-footer">
                      <div className="fault-step-tools">
                        <Wrench size={14} className="text-slate-400" />
                        <span>Gerekli Ekipman: {step.requiredTool}</span>
                      </div>
                      {step.safetyWarning && (
                        <div className="fault-step-safety">
                          <ShieldAlert size={14} className="text-rose-500 shrink-0" />
                          <span>{step.safetyWarning}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Diagnostic Synthesis Card */}
      {aiDiagnosis && (
        <div className="fault-accordion-card fault-ai-card">
          <button
            type="button"
            className="fault-accordion-header"
            onClick={() => toggleSection("ai")}
          >
            <div className="fault-accordion-title">
              <Sparkles size={17} className="text-amber-400" />
              <span>Yapay Zeka Destekli Usta Asistanı Teşhisi</span>
              <span className="fault-badge-ai">Akıllı Teşhis</span>
            </div>
            {expandedSections.ai ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {expandedSections.ai && (
            <div className="fault-accordion-body">
              <div className="fault-ai-reasoning">
                <h4>Sistemik Analiz & Mantık Yürütme:</h4>
                <p>{aiDiagnosis.summary}</p>
              </div>

              {aiDiagnosis.vehicleSpecificConsiderations && (
                <div className="fault-ai-conditions">
                  <h4>Araç / Motor Tipi Özel Durumları:</h4>
                  <p>{aiDiagnosis.vehicleSpecificConsiderations}</p>
                </div>
              )}

              {aiDiagnosis.safetyCriticalWarnings.length > 0 && (
                <div className="fault-ai-precautions">
                  <h4>
                    <ShieldAlert size={15} className="inline mr-1 text-rose-500" />
                    Kritik Emniyet & Parça Değişim Önlemleri:
                  </h4>
                  <ul>
                    {aiDiagnosis.safetyCriticalWarnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Work Order Attachment & Technician Notes */}
      <div className="fault-action-card">
        <h3 className="fault-action-title">
          <ClipboardList size={18} className="text-primary" />
          <span>İş Emrine Aktarma ve Usta Teşhis Notu</span>
        </h3>
        <p className="fault-action-desc">
          Bu arıza kodunu, doğrulanan kontrol listesini ve teşhis notlarınızı doğrudan aktif bir iş
          emrinin zaman çizelgesine ve teşhis raporuna bağlayın.
        </p>

        <div className="fault-notes-field">
          <label className="fault-field-label">Usta Teşhis Notu (Opsiyonel):</label>
          <textarea
            value={techNotes}
            onChange={(e) => setTechNotes(e.target.value)}
            placeholder="Örn: 2 numaralı silindir buji tırnak aralığı 1.3mm ölçüldü, bobin yer değiştirildiğinde arıza 2'de kaldı..."
            className="fault-textarea"
            rows={3}
          />
        </div>

        <div className="fault-attach-row">
          <div className="fault-attach-select-col">
            <label className="fault-field-label">Aktif İş Emri Seçin:</label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="fault-select-input"
            >
              <option value="">-- İş Emri Seçiniz --</option>
              {branchOrders.map((ord) => {
                const veh = vehicleFor(ord);
                const cust = customerFor(ord);
                return (
                  <option key={ord.id} value={ord.id}>
                    #{ord.id.slice(0, 8)} — {veh?.plate || "Plaka Yok"} ({cust?.name || "Müşteri"}) - {ord.complaint}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="fault-attach-btn-col">
            <Button
              type="button"
              disabled={!selectedOrderId}
              onClick={handleAttachToOrder}
              className="fault-attach-submit-btn"
            >
              <ClipboardList size={16} />
              <span>İş Emrine Teşhisi Ekle</span>
            </Button>
          </div>
        </div>

        {attachSuccess && (
          <div className="fault-attach-success-banner">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>
              Arıza teşhisi ve kontrol adımları başarıyla #{selectedOrderId} numaralı iş emrine
              eklendi!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
