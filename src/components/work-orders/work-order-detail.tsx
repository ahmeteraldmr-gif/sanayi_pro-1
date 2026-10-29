"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  Clock3,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { useDemo } from "@/components/app-shell/demo-provider";
import { useOperations } from "@/components/modules/operations-store";
import { EntryForm } from "@/components/modules/module-ui";
import { Button } from "@/components/ui/button";
import { PhotoEntry, PartRequestEntry } from "./order-entry-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  branchName,
  deliveryLabel,
  effectiveQuoteStatus,
  money,
  pendingApprovalAmount,
  quoteStatusMeta,
} from "@/lib/demo-data";
import { AddNote, StatusActions } from "./order-actions";
import { QuickActions } from "@/components/app-shell/quick-actions";
import { findWorkOrderAcrossAllBranches } from "@/lib/branch-profiles";
import {
  ApprovalTab,
  detailTabs,
  HistoryTab,
  LaborTab,
  PartsTab,
  PaymentsTab,
  PhotosTab,
  SummaryTab,
  type DetailTab,
} from "./order-tabs";

export function WorkOrderDetail({
  id,
  initialTab = "general",
}: {
  id: string;
  initialTab?: DetailTab;
}) {
  const { orders, branchId, vehicleFor, customerFor, technicianFor, assignTechnician } = useDemo();
  const { data: operations } = useOperations();
  const activeTechnicians = operations.employees.filter((e) => e.active);
  const foundOrder = orders.find((item) => item.id.toUpperCase() === id.toUpperCase());
  const fallback = !foundOrder ? findWorkOrderAcrossAllBranches(id) : null;
  const order = foundOrder ?? fallback?.order;

  // Normalize initialTab so legacy URLs gracefully map to one of the 4 consolidated tabs
  const defaultTab: DetailTab =
    initialTab === "labor"
      ? "labor"
      : initialTab === "parts"
        ? "parts"
        : initialTab === "history"
          ? "history"
          : initialTab === "photos"
            ? "photos"
            : initialTab === "approval"
              ? "approval"
              : initialTab === "payments"
                ? "payments"
                : "summary";

  const [tab, setTab] = useState<DetailTab>(defaultTab);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!order)
    return (
      <div className="app-empty-state">
        <h1>İş emri bulunamadı.</h1>
        <Button asChild>
          <Link href="/app/work-orders">İş Emirlerine Dön</Link>
        </Button>
      </div>
    );

  const vehicle = fallback?.vehicle ?? vehicleFor(order);
  const customer = fallback?.customer ?? customerFor(order);
  const technician = technicianFor(order.technicianId);
  const pendingApproval = pendingApprovalAmount(order);
  const quoteStatus = effectiveQuoteStatus(order);
  const cost = order.parts
    .filter((part) => part.state === "CONSUMED")
    .reduce((sum, part) => sum + part.historicCost * part.quantity, 0);

  const remainingBalance = order.total - order.paid;

  function navigateTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % detailTabs.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + detailTabs.length) % detailTabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = detailTabs.length - 1;
    else return;
    event.preventDefault();
    setTab(detailTabs[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="app-order-detail">
      {/* 1. Üst Navigasyon & Kompakt Başlık */}
      <div className="app-breadcrumb">
        <Link href="/app/work-orders">
          <ArrowLeft size={14} />
          İş Emirleri
        </Link>
        <span>/</span>
        <span className="app-breadcrumb-id">#WO-{order.id}</span>
      </div>

      <header className="app-order-compact-header">
        <div className="app-order-header-main">
          <div className="app-plate-container">
            <span className="app-plate-display">{vehicle.plate}</span>
          </div>
          <div className="app-order-header-meta">
            <div className="app-order-title-row">
              <Link href={`/app/vehicles/${vehicle.id}`} className="app-order-vehicle-name">
                {vehicle.model} {vehicle.year ? `· ${vehicle.year}` : ""}
              </Link>
              <span className="app-order-code-tag">#WO-{order.id}</span>
            </div>
            <div className="app-order-submeta">
              <Link href={`/app/customers/${customer.id}`} className="app-customer-link">
                <UserRound size={13} />
                <span>{customer.name}</span>
              </Link>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="app-phone-link">
                  <Phone size={13} />
                  <span>{customer.phone}</span>
                </a>
              )}
              <span className="app-branch-tag">
                <MapPin size={13} />
                <span>{branchName(order.branchId)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="app-order-header-right">
          <div className="app-order-status-group">
            <StatusBadge status={order.status} />
            <span className="app-order-delivery">
              <Clock3 size={13} />
              <span>Teslim: <strong>{deliveryLabel(order.dueAt)}</strong></span>
            </span>
          </div>
          {pendingApproval > 0 && (
            <button
              type="button"
              className="app-pending-quote-pill"
              onClick={() => setTab("summary")}
            >
              Onay Bekleyen: <strong>{money(pendingApproval)}</strong>
            </button>
          )}
        </div>
      </header>

      {branchId !== order.branchId && (
        <p className="app-inline-info">
          Bu iş emri {branchName(order.branchId)} kaydıdır. Üst bardaki çalışma şubeniz farklı.
        </p>
      )}

      {/* 2. Sıradaki İşlem Bandı (Operasyon Şeridi) */}
      <section className="app-order-next-strip">
        <div className="app-next-strip-content">
          <div className="app-next-strip-desc">
            <span className="app-next-strip-label">Sıradaki İşlem</span>
            <p className="app-next-strip-text">
              {order.status === "AWAITING_APPROVAL" && order.approval === "PENDING"
                ? "Müşteri teklif onayı bekleniyor. Onay alındığında işlemi başlatabilirsiniz."
                : order.status === "RECEIVED"
                  ? "Araç kabulü yapıldı. Ön tespit ve arıza teşhisine başlayın."
                  : order.status === "DIAGNOSIS"
                    ? "Teşhis tamamlandı. Müşteri teklif onayına gönderilebilir."
                    : order.status === "IN_PROGRESS"
                      ? "Onarım devam ediyor. İşlemler bitince son kontrole aktarın."
                      : order.status === "WAITING_PARTS"
                        ? "Parça tedariği bekleniyor. Parçalar gelince işleme devam edin."
                        : order.status === "QUALITY_CONTROL"
                          ? "Son kontrol yapılıyor. Kontrol onaylandıktan sonra teslime hazır işaretleyin."
                          : order.status === "READY"
                            ? "Araç teslime hazır. Müşteri geldiğinde faturayı kapatıp teslim edin."
                            : order.status === "DELIVERED"
                              ? "Araç müşteriye teslim edildi. İş emri tamamlandı."
                              : "İşlem sonlandırıldı."}
            </p>
          </div>
          <div className="app-next-strip-actions" data-tour="order-primary-action">
            <StatusActions order={order} />
          </div>
        </div>

        <div className="app-next-strip-tools">
          <PartRequestEntry order={order} />
          <PhotoEntry order={order} />
          <div data-tour="order-add-note-btn">
            <AddNote orderId={order.id} />
          </div>
        </div>
      </section>

      {/* 3. İki Sütunlu Çalışma Alanı (Sol %70 / Sağ %30 Sticky Rail) */}
      <div className="app-detail-layout">
        <div className="app-panel app-detail-main">
          {/* 4 Temel Bölüm Sekmeleri */}
          <div
            className="app-detail-tabs"
            role="tablist"
            aria-label="İş emri bölümleri"
          >
            {detailTabs.map((item, index) => {
              const isActive =
                tab === item.id ||
                (item.id === "summary" &&
                  ["general", "photos", "approval", "payments"].includes(tab));
              return (
                <button
                  role="tab"
                  id={`order-tab-${item.id}`}
                  key={item.id}
                  aria-selected={isActive}
                  aria-controls="order-tab-panel"
                  tabIndex={isActive ? 0 : -1}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  onClick={() => setTab(item.id)}
                  onKeyDown={(event) => navigateTab(event, index)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div
            className="app-tab-content"
            role="tabpanel"
            id="order-tab-panel"
            aria-label={detailTabs.find((item) => item.id === tab)?.label}
            tabIndex={0}
          >
            {(tab === "summary" || tab === "general") && <SummaryTab order={order} />}
            {tab === "labor" && <LaborTab order={order} />}
            {tab === "parts" && <PartsTab order={order} />}
            {tab === "history" && <HistoryTab order={order} />}
            {tab === "photos" && <PhotosTab order={order} />}
            {tab === "approval" && <ApprovalTab order={order} />}
            {tab === "payments" && <PaymentsTab order={order} />}
          </div>
        </div>

        {/* Sağ Taraf: Bütünleşik Operasyon Kartı (Sticky) */}
        <aside className="app-detail-aside">
          <div className="app-order-rail-card">
            {/* 1. Bölüm: HESAP */}
            <section className="app-rail-section app-rail-finance">
              <div className="app-rail-header">
                <h3>İş Emri Hesabı</h3>
                <span className="app-quote-meta-pill">
                  {quoteStatusMeta[quoteStatus].label}
                </span>
              </div>
              <dl className="app-rail-finance-list">
                <div className="app-rail-finance-row">
                  <dt>Kesinleşen Hesap</dt>
                  <dd>{money(order.total)}</dd>
                </div>
                {pendingApproval > 0 && (
                  <div className="app-rail-finance-row is-pending">
                    <dt>Onay Bekleyen</dt>
                    <dd>{money(pendingApproval)}</dd>
                  </div>
                )}
                <div className="app-rail-finance-row">
                  <dt>Tahsil Edilen</dt>
                  <dd>{money(order.paid)}</dd>
                </div>
                <div
                  className={`app-rail-balance-card ${
                    remainingBalance > 0 ? "has-debt" : "is-cleared"
                  }`}
                >
                  <dt>Açık Bakiye</dt>
                  <dd>{money(remainingBalance)}</dd>
                </div>
              </dl>

              {remainingBalance > 0 && order.status !== "CANCELLED" && (
                <div className="app-rail-payment-action" data-tour="rail-payment-btn">
                  <QuickActions initial="payment" orderId={order.id} outline />
                </div>
              )}

              <div className="app-rail-profit-box">
                <div className="app-profit-head">
                  <span>Tahmini Brüt Kazanç</span>
                  <strong>{money(order.total - cost - order.additionalCosts)}</strong>
                </div>
                <div className="app-profit-sub">
                  <span>Kullanılan parça: {money(cost)}</span>
                  <span>Diğer maliyet: {money(order.additionalCosts)}</span>
                </div>
              </div>
            </section>

            {/* 2. Bölüm: SORUMLU */}
            <section className="app-rail-section app-rail-team">
              <div className="app-rail-header">
                <h3>Sorumlu Ekip</h3>
                <EntryForm
                  title="Usta Değiştir / Ata"
                  description="Bu iş emrinden sorumlu ana ustayı güncelleyin."
                  trigger={
                    <Button variant="ghost" size="sm" className="app-mini-action-btn">
                      Değiştir
                    </Button>
                  }
                  fields={[
                    {
                      name: "technicianId",
                      label: "Sorumlu Ana Usta",
                      required: true,
                      value: order.technicianId,
                      options: activeTechnicians.map((t) => ({
                        value: t.id,
                        label: `${t.name} · ${t.specialty}`,
                      })),
                    },
                  ]}
                  onSave={(values) => {
                    if (!values.technicianId) return "Lütfen bir usta seçin.";
                    assignTechnician(order.id, values.technicianId);
                  }}
                />
              </div>

              <div className="app-assigned-person primary">
                <span className="app-avatar">
                  {technician.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </span>
                <div className="app-assigned-person-info">
                  <strong>{technician.name}</strong>
                  <span>Ana Sorumlu Usta</span>
                </div>
                <span className="app-primary-technician-dot" />
              </div>

              {order.assigneeIds
                .filter((person) => person !== order.technicianId)
                .map((person) => (
                  <div className="app-assigned-person secondary" key={person}>
                    <span className="app-avatar secondary">
                      {technicianFor(person).initials}
                    </span>
                    <div className="app-assigned-person-info">
                      <strong>{technicianFor(person).name}</strong>
                      <span>Destek Usta</span>
                    </div>
                  </div>
                ))}
            </section>

            {/* 3. Bölüm: MÜŞTERİ */}
            <section className="app-rail-section app-rail-customer">
              <div className="app-rail-header">
                <h3>Müşteri İletişimi</h3>
              </div>
              <div className="app-rail-customer-body">
                <strong className="app-customer-rail-name">
                  <Link href={`/app/customers/${customer.id}`}>{customer.name}</Link>
                </strong>
                <span className="app-customer-rail-phone">
                  <Phone size={14} />
                  {customer.phone || "Telefon belirtilmemiş"}
                </span>
                {customer.phone && (
                  <Button asChild size="sm" variant="secondary" className="app-rail-call-btn">
                    <a href={`tel:${customer.phone}`}>
                      <Phone size={14} /> Müşteriyi Ara
                    </a>
                  </Button>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
