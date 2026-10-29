"use client";

import { useState, useMemo, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CarFront,
  CheckCircle2,
  History,
  Phone,
  UserCheck,
  Wallet,
  X,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatPlate,
  isActive,
  money,
  normalizeSearch,
  number,
  defaultAppointmentTime,
  type Customer,
  type Vehicle,
} from "@/lib/demo-data";
import { useDemo } from "./demo-provider";
import { useOperations } from "@/components/modules/operations-store";

// Common Auto Service Templates (Hazır İşlem Şablonları)
export const SERVICE_TEMPLATES = [
  { id: "oil", label: "Yağ Bakımı", desc: "Motor yağı ve filtre değişimi", defaultPrice: 2800 },
  { id: "periodic", label: "Periyodik Bakım", desc: "10.000 / 15.000 km standart bakım", defaultPrice: 4200 },
  { id: "brake_check", label: "Fren Kontrolü", desc: "Ön / arka fren sistemi ve hidrolik kontrolü", defaultPrice: 850 },
  { id: "brake_pads", label: "Balata Değişimi", desc: "Ön fren balatası sökme / takma", defaultPrice: 3200 },
  { id: "ac", label: "Klima Bakımı", desc: "Klima gaz dolumu ve polen filtresi", defaultPrice: 1900 },
  { id: "battery", label: "Akü Kontrolü", desc: "Akü şarj ve marş sistemi ölçümü", defaultPrice: 600 },
  { id: "diag", label: "Arıza Tespiti", desc: "OBD cihazı ile bilgisayarlı arıza teşhisi", defaultPrice: 1200 },
  { id: "tire", label: "Lastik İşlemi", desc: "Balans, rotasyon ve hava basıncı", defaultPrice: 950 },
] as const;

interface QuickFlowDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlate?: string;
  initialVehicleId?: string;
  initialCustomerId?: string;
}

export function QuickFlowDrawer({
  open,
  onOpenChange,
  initialPlate = "",
  initialVehicleId = "",
  initialCustomerId = "",
}: QuickFlowDrawerProps) {
  const router = useRouter();
  const demo = useDemo();
  const { data: operations } = useOperations();

  // Active drawer mode
  const [activeTab, setActiveTab] = useState<
    "intake" | "appointment" | "history" | "payment" | "new_vehicle"
  >("intake");

  // Selected template & technician
  const activeTemplates = useMemo(() => {
    if (demo.activeBranchProfile?.quickActions?.length) {
      return demo.activeBranchProfile.quickActions.map((qa) => ({
        id: qa.id,
        label: qa.title,
        desc: qa.description,
        defaultPrice: qa.defaultPrice,
      }));
    }
    return SERVICE_TEMPLATES;
  }, [demo.activeBranchProfile]);

  const [selectedTemplateOverride, setSelectedTemplateOverride] = useState<string | null>(null);
  const selectedTemplate = selectedTemplateOverride ?? (activeTemplates[0]?.id || "oil");
  const setSelectedTemplate = setSelectedTemplateOverride;

  const [customComplaint, setCustomComplaint] = useState("");
  const [mileageInput, setMileageInput] = useState<string>("");
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [appointmentAt, setAppointmentAt] = useState<string>(defaultAppointmentTime());
  const [appointmentNote, setAppointmentNote] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [newVehiclePlate, setNewVehiclePlate] = useState<string>(initialPlate);
  const [drawerError, setDrawerError] = useState<string>("");

  // Resolve matching vehicle & customer
  const { foundVehicle, foundCustomer, activeOrder, allCustomerVehicles } = useMemo(() => {
    let v: Vehicle | undefined;
    let c: Customer | undefined;

    if (initialVehicleId) {
      v = demo.vehicles.find((item) => item.id === initialVehicleId);
      if (v) c = demo.customers.find((item) => item.id === v!.customerId);
    } else if (initialPlate) {
      const formatted = formatPlate(initialPlate) || initialPlate;
      v = demo.vehicles.find(
        (item) => normalizeSearch(item.plate) === normalizeSearch(formatted),
      );
      if (v) c = demo.customers.find((item) => item.id === v!.customerId);
    } else if (initialCustomerId) {
      c = demo.customers.find((item) => item.id === initialCustomerId);
      if (c) {
        v = demo.vehicles.find((item) => item.customerId === c!.id && item.active !== false);
      }
    }

    const order = v
      ? demo.orders.find(
          (o) => o.vehicleId === v!.id && o.branchId === demo.branchId && isActive(o.status),
        )
      : undefined;

    const custVehicles = c
      ? demo.vehicles.filter((item) => item.customerId === c!.id)
      : [];

    return {
      foundVehicle: v,
      foundCustomer: c,
      activeOrder: order,
      allCustomerVehicles: custVehicles,
    };
  }, [initialVehicleId, initialPlate, initialCustomerId, demo.vehicles, demo.customers, demo.orders, demo.branchId]);

  // Set initial default mileage and available technician
  const branchTechs = operations.employees.filter(
    (e) => e.branchId === demo.branchId && e.active,
  );

  // Sort technicians so idle ones appear first
  const sortedTechs = useMemo(() => {
    return [...branchTechs].sort((a, b) => {
      const aBusy = demo.orders.filter(
        (o) => (o.technicianId === a.id || o.assigneeIds.includes(a.id)) && isActive(o.status),
      ).length;
      const bBusy = demo.orders.filter(
        (o) => (o.technicianId === b.id || o.assigneeIds.includes(b.id)) && isActive(o.status),
      ).length;
      return aBusy - bBusy;
    });
  }, [branchTechs, demo.orders]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (typeof document !== "undefined") {
        if (document.body.style.pointerEvents === "none") {
          document.body.style.pointerEvents = "";
        }
        if (document.body.style.overflow === "hidden") {
          document.body.style.overflow = "";
        }
      }
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  // Handle instant 1-touch Intake & Work Order
  const handleQuickIntakeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!foundVehicle) return;

    const km = Number(mileageInput) || foundVehicle.mileage || foundVehicle.lastService?.mileage || 85000;
    const template = activeTemplates.find((t) => t.id === selectedTemplate);
    const complaintText = selectedTemplate === "other"
      ? (customComplaint || "Periyodik kontrol ve servis talebi")
      : (template?.label ? `${template.label} (${template.desc})` : "Genel kontrol ve bakım");

    const techId = selectedTechId || sortedTechs[0]?.id || "mehmet";

    const result = demo.acceptVehicle({
      vehicleId: foundVehicle.id,
      mileage: km,
      fuel: 50,
      damage: "Genel kontrol yapıldı, araç kabulü tamamlandı.",
      complaint: complaintText,
      technicianId: techId,
      dueAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      checklist: {
        registration: "yes",
        key: "yes",
        spare: "yes",
        tools: "yes",
        valuables: "yes",
      },
      photos: [],
    });

    if (result.error) {
      setDrawerError(result.error);
      return;
    }

    demo.announce(`${foundVehicle.plate} için araç kabulü yapıldı ve iş emri başlatıldı.`);
    onOpenChange(false);
    if (result.orderId) {
      router.push(`/app/work-orders/${result.orderId}`);
    }
  };

  // Handle instant appointment in drawer
  const handleAppointmentSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!foundVehicle) return;
    const success = demo.addAppointment(
      foundVehicle.id,
      appointmentAt,
      appointmentNote || "Servis ve bakım randevusu",
      selectedTechId || sortedTechs[0]?.id,
    );
    if (!success) {
      setDrawerError("Randevu kaydedilemedi. Tarihi veya mevcut randevuları kontrol edin.");
      return;
    }
    demo.announce("Randevu kaydedildi.");
    onOpenChange(false);
  };

  // Handle instant payment in drawer
  const handlePaymentSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    const amt = Number(paymentAmount);
    const success = demo.collectPayment(activeOrder.id, amt);
    if (!success) {
      setDrawerError("Tahsilat tutarını kontrol edin.");
      return;
    }
    demo.announce(`${money(amt)} tahsilat alındı.`);
    setPaymentAmount("");
  };

  // Handle fast registration if vehicle not found
  const handleNewVehicleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const plate = String(form.get("plate") || newVehiclePlate);
    const name = String(form.get("name") || "");
    const phone = String(form.get("phone") || "");
    const model = String(form.get("model") || "");
    const mileage = Number(form.get("mileage") || 0);

    const res = demo.createRecord({
      customerId: "",
      name,
      phone,
      plate,
      model,
      year: 2021,
      mileage,
      fuelType: "Dizel",
    });

    if (res.error) {
      setDrawerError(res.error);
      return;
    }

    if (res.vehicle) {
      demo.announce("Müşteri ve araç oluşturuldu. Şimdi kabul işlemini tamamlayabilirsiniz.");
      setActiveTab("intake");
      setMileageInput(String(mileage || ""));
    }
  };

  return (
    <div className="ux-drawer-backdrop" onClick={() => onOpenChange(false)}>
      <aside
        className="ux-quick-flow-drawer"
        role="dialog"
        aria-label="Hızlı İşlem Çekmecesi"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="ux-drawer-head">
          <div>
            <span className="app-overline">HIZLI SERVİS MASASI</span>
            <h2>{foundVehicle ? foundVehicle.plate : "Plaka Sorgulama"}</h2>
          </div>
          <button
            type="button"
            className="app-icon-button"
            onClick={() => onOpenChange(false)}
            aria-label="Çekmeceyi kapat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Araç Bilgi Kartı (Bulunduysa) */}
        {foundVehicle && foundCustomer ? (
          <div className="ux-drawer-vehicle-summary">
            <div className="ux-drawer-plate-row">
              <strong className="ux-plate-chip is-large">{foundVehicle.plate}</strong>
              <div>
                <strong>{foundVehicle.model} {foundVehicle.year || ""}</strong>
                <small>
                  {foundVehicle.mileage ? `${number(foundVehicle.mileage)} km` : "Km belirtilmedi"}
                  {foundVehicle.fuelType ? ` · ${foundVehicle.fuelType}` : ""}
                </small>
              </div>
            </div>

            <div className="ux-drawer-customer-row">
              <div className="ux-drawer-cust-info">
                <span className="app-avatar">
                  {foundCustomer.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div>
                  <strong>{foundCustomer.name}</strong>
                  <small>{foundCustomer.phone || "Telefon eklenmedi"}</small>
                </div>
              </div>
              {foundCustomer.phone && (
                <a
                  href={`tel:${foundCustomer.phone.replace(/\s+/g, "")}`}
                  className="ux-drawer-call-btn"
                  title="Müşteriyi Ara"
                >
                  <Phone size={14} /> Ara
                </a>
              )}
            </div>

            {/* Durum & Açık İş */}
            <div className="ux-drawer-status-strip">
              <div>
                <span>Açık İş Emri:</span>
                {activeOrder ? (
                  <Link href={`/app/work-orders/${activeOrder.id}`} className="ux-drawer-active-order-link">
                    <strong>#{activeOrder.id}</strong> <StatusBadge status={activeOrder.status} short />
                  </Link>
                ) : (
                  <strong className="ux-text-success">Yok (Hemen kabul açılabilir)</strong>
                )}
              </div>
              <div>
                <span>Son Servis:</span>
                <strong>
                  {foundVehicle.lastService
                    ? `${foundVehicle.lastService.date} (${foundVehicle.lastService.title})`
                    : "Kayıt yok"}
                </strong>
              </div>
            </div>

            {/* Müşterinin Diğer Araçları */}
            {allCustomerVehicles.length > 1 && (
              <div className="ux-drawer-other-vehicles" style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", fontSize: "12px", marginBottom: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Diğer araçları:</span>
                {allCustomerVehicles
                  .filter((v) => v.id !== foundVehicle.id)
                  .map((otherV) => (
                    <span
                      key={otherV.id}
                      style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}
                    >
                      {otherV.plate} · {otherV.model}
                    </span>
                  ))}
              </div>
            )}

            {/* Çekmece İçi Hızlı Sekmeler */}
            <div className="ux-drawer-tabs" role="tablist">
              <button
                type="button"
                className={activeTab === "intake" ? "is-active" : ""}
                onClick={() => { setActiveTab("intake"); setDrawerError(""); }}
              >
                <CarFront size={15} /> Araç Kabul
              </button>
              <button
                type="button"
                className={activeTab === "appointment" ? "is-active" : ""}
                onClick={() => { setActiveTab("appointment"); setDrawerError(""); }}
              >
                <CalendarDays size={15} /> Randevu
              </button>
              {activeOrder && activeOrder.total > activeOrder.paid && (
                <button
                  type="button"
                  className={activeTab === "payment" ? "is-active" : ""}
                  onClick={() => { setActiveTab("payment"); setDrawerError(""); }}
                >
                  <Wallet size={15} /> Tahsilat ({money(activeOrder.total - activeOrder.paid)})
                </button>
              )}
              <button
                type="button"
                className={activeTab === "history" ? "is-active" : ""}
                onClick={() => { setActiveTab("history"); setDrawerError(""); }}
              >
                <History size={15} /> Geçmiş
              </button>
            </div>
          </div>
        ) : (
          /* Araç Kayıtlı Değilse: Otomatik Doldurmalı Hızlı Kayıt */
          <div className="ux-drawer-unregistered-box">
            <div className="ux-unregistered-alert">
              <AlertTriangle size={24} className="ux-warn-icon" />
              <div>
                <strong>Bu araç henüz kayıtlı değil.</strong>
                <p>Plaka hazırlandı. Sadece müşteri adı ve modelini girerek hemen kabul açabilirsiniz.</p>
              </div>
            </div>

            <form onSubmit={handleNewVehicleSubmit} className="records-form ux-drawer-quick-reg">
              <label>
                Plaka
                <input
                  name="plate"
                  defaultValue={initialPlate || newVehiclePlate}
                  required
                  className="records-plate-input"
                  onChange={(e) => setNewVehiclePlate(e.target.value)}
                />
              </label>
              <label>
                Müşteri Adı Soyadı
                <input name="name" required placeholder="Örn. Mehmet Demir" minLength={2} />
              </label>
              <label>
                Telefon Numarası
                <input name="phone" type="tel" placeholder="05xx xxx xx xx" />
              </label>
              <label>
                Araç Marka / Model
                <input name="model" required placeholder="Örn. Fiat Egea 1.4" />
              </label>
              <label>
                Kilometre
                <input name="mileage" type="number" placeholder="85000" />
              </label>

              {drawerError && <p className="records-error">{drawerError}</p>}

              <Button type="submit" className="ux-full-btn">
                <CheckCircle2 size={16} /> Müşteri ve Aracı Kaydet → Kabul Aç
              </Button>
            </form>
          </div>
        )}

        {/* Tab 1: Hızlı Araç Kabul & İş Emri (Hazır Şablonlar + Usta Kartları) */}
        {foundVehicle && activeTab === "intake" && (
          <form onSubmit={handleQuickIntakeSubmit} className="ux-drawer-form-flow">
            {/* Kilometre Girişi */}
            <div className="ux-drawer-field-group">
              <label className="ux-drawer-field-label">
                Araç Kilometresi
                <span className="ux-field-hint">Son kayıt: {foundVehicle.mileage ? `${number(foundVehicle.mileage)} km` : "Yeni"}</span>
              </label>
              <input
                type="number"
                required
                className="ux-drawer-large-input"
                defaultValue={foundVehicle.mileage || foundVehicle.lastService?.mileage || ""}
                placeholder="Örn. 86200"
                onChange={(e) => setMileageInput(e.target.value)}
              />
            </div>

            {/* Hazır İşlem Şablonları (Tek Dokunuş) */}
            <div className="ux-drawer-field-group">
              <label className="ux-drawer-field-label">
                <Sparkles size={14} /> Hazır İşlem Şablonu Seçin
              </label>
              <div className="ux-template-pills-grid">
                {activeTemplates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    className={`ux-template-pill ${selectedTemplate === tmpl.id ? "is-selected" : ""}`}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                  >
                    <strong>{tmpl.label}</strong>
                    <small>{tmpl.desc}</small>
                  </button>
                ))}
                <button
                  type="button"
                  className={`ux-template-pill is-custom ${selectedTemplate === "other" ? "is-selected" : ""}`}
                  onClick={() => setSelectedTemplate("other")}
                >
                  <strong>Diğer / Özel</strong>
                  <small>Manuel şikayet yaz</small>
                </button>
              </div>

              {selectedTemplate === "other" && (
                <textarea
                  className="ux-custom-complaint-input"
                  placeholder="Müşteri şikayetini ve yapılacak işlemleri yazın..."
                  rows={2}
                  value={customComplaint}
                  onChange={(e) => setCustomComplaint(e.target.value)}
                  autoFocus
                />
              )}
            </div>

            {/* Usta Atama (Küçük Kartlar, Boşta Olanlar Üstte, Tek Dokunuş) */}
            <div className="ux-drawer-field-group">
              <label className="ux-drawer-field-label">
                <UserCheck size={14} /> Sorumlu Usta (Boşta Olanlar Öncelikli)
              </label>
              <div className="ux-tech-cards-grid">
                {sortedTechs.map((tech) => {
                  const busyOrders = demo.orders.filter(
                    (o) => (o.technicianId === tech.id || o.assigneeIds.includes(tech.id)) && isActive(o.status),
                  );
                  const isBusy = busyOrders.length > 0;
                  const isChosen = (selectedTechId || sortedTechs[0]?.id) === tech.id;

                  return (
                    <button
                      key={tech.id}
                      type="button"
                      className={`ux-tech-selector-card ${isChosen ? "is-chosen" : ""} ${isBusy ? "is-busy" : "is-available"}`}
                      onClick={() => setSelectedTechId(tech.id)}
                    >
                      <div className="ux-tech-card-top">
                        <strong>{tech.name}</strong>
                        <span className={`ux-tech-pill ${isBusy ? "is-busy" : "is-free"}`}>
                          {isBusy ? `${busyOrders.length} aktif iş` : "Boşta"}
                        </span>
                      </div>
                      <small>{tech.specialty}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            {drawerError && <p className="records-error">{drawerError}</p>}

            {/* Tek Dokunuş Onay Butonu */}
            <Button type="submit" size="lg" className="ux-full-btn ux-intake-submit-btn">
              <CheckCircle2 size={18} /> Kabul Et ve İş Emrini Başlat (1 Tık)
            </Button>
          </form>
        )}

        {/* Tab 2: Hızlı Randevu */}
        {foundVehicle && activeTab === "appointment" && (
          <form onSubmit={handleAppointmentSubmit} className="ux-drawer-form-flow">
            <div className="ux-drawer-field-group">
              <label className="ux-drawer-field-label">Randevu Tarih ve Saati</label>
              <input
                type="datetime-local"
                required
                className="ux-drawer-large-input"
                defaultValue={appointmentAt}
                onChange={(e) => setAppointmentAt(e.target.value)}
              />
            </div>
            <div className="ux-drawer-field-group">
              <label className="ux-drawer-field-label">Yapılacak İşlem / Not</label>
              <input
                type="text"
                placeholder="Örn. 90.000 km periyodik bakım"
                value={appointmentNote}
                onChange={(e) => setAppointmentNote(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="ux-full-btn">
              <CalendarDays size={18} /> Randevuyu Kaydet
            </Button>
          </form>
        )}

        {/* Tab 3: Hızlı Tahsilat */}
        {foundVehicle && activeTab === "payment" && activeOrder && (
          <form onSubmit={handlePaymentSubmit} className="ux-drawer-form-flow">
            <div className="ux-balance-callout">
              <span>İş Emri #{activeOrder.id} Açık Bakiye</span>
              <strong>{money(activeOrder.total - activeOrder.paid)}</strong>
            </div>
            <div className="ux-drawer-field-group">
              <label className="ux-drawer-field-label">Tahsilat Tutarı (₺)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={activeOrder.total - activeOrder.paid}
                required
                defaultValue={activeOrder.total - activeOrder.paid}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="ux-drawer-large-input"
              />
            </div>
            <Button type="submit" size="lg" className="ux-full-btn">
              <Wallet size={18} /> Tahsilatı Kaydet
            </Button>
          </form>
        )}

        {/* Tab 4: Servis Geçmişi */}
        {foundVehicle && activeTab === "history" && (
          <div className="ux-drawer-history-list">
            <h4>Önceki Servis Kayıtları</h4>
            {foundVehicle.lastService ? (
              <div className="ux-drawer-history-item">
                <time>{foundVehicle.lastService.date}</time>
                <strong>{foundVehicle.lastService.title}</strong>
                <small>{number(foundVehicle.lastService.mileage)} km</small>
              </div>
            ) : (
              <p className="records-help">Bu araca ait geçmiş kayıt bulunmuyor.</p>
            )}
          </div>
        )}

        {/* Çekmece Altı Hızlı Link */}
        {foundCustomer && (
          <div className="ux-drawer-footer">
            <Link
              href={`/app/customers/${foundCustomer.id}?vehicle=${foundVehicle?.id || ""}`}
              onClick={() => onOpenChange(false)}
            >
              Müşteri & Araç Detayına Git →
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
