"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CarFront,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Package,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  UsersRound,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { StatusBadge } from "@/components/ui/status-badge";
import {
  branchName,
  demoAlerts,
  isActive,
  money,
  number,
  statuses,
  type WorkOrderStatus,
} from "@/lib/demo-data";
import { useDemo } from "@/components/app-shell/demo-provider";
import { useState } from "react";
import { useOperations } from "@/components/modules/operations-store";
import { QuickActions } from "@/components/app-shell/quick-actions";
import { PlateScannerModal } from "@/components/plate-reader/plate-scanner-modal";
import { QuickFlowDrawer } from "@/components/app-shell/quick-flow-drawer";

export function Dashboard() {
  const {
    orders,
    branchId,
    vehicleFor,
    customerFor,
    demoAppointments,
    vehicles,
    payments,
    technicianFor,
    currentUser,
    quickTechnicianAction,
    activeBranchProfile,
  } = useDemo();
  const { data: operations } = useOperations();
  const critical = operations.parts.find(
    (p) => p.branchId === branchId && p.physical - p.reserved < p.minimum,
  );
  const [filter, setFilter] = useState<WorkOrderStatus | "ALL">("ALL");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPlate, setDrawerPlate] = useState("");
  const [deskQuery, setDeskQuery] = useState("");
  const active = orders.filter(
    (order) => order.branchId === branchId && isActive(order.status),
  );
  const visible = active.filter(
    (order) => filter === "ALL" || order.status === filter,
  );
  const approvalOrder = active.find(
    (order) =>
      order.status === "AWAITING_APPROVAL" && order.approval === "PENDING",
  );
  const scoped = orders.filter((o) => o.branchId === branchId && o.status !== "CANCELLED");
  const summary = {
    collected: payments
      .filter(
        (p) =>
          scoped.some((o) => o.id === p.orderId) &&
          p.at.slice(0, 10) === new Date().toISOString().slice(0, 10),
      )
      .reduce((n, p) => n + p.amount, 0),
    balance: scoped.reduce((n, o) => n + o.total - o.paid, 0),
    revenue: scoped.filter((o) => o.status === "DELIVERED").reduce((n, o) => n + o.total, 0),
  };
  const shownStatuses = (
    [
      "IN_PROGRESS",
      "AWAITING_APPROVAL",
      "WAITING_PARTS",
      "READY",
      "RECEIVED",
      "DIAGNOSIS",
      "QUALITY_CONTROL",
    ] as const
  ).filter((status) => active.some((order) => order.status === status));

  const branchTechnicians = operations.employees.filter(
    (e) => e.branchId === branchId && e.active,
  );
  const techStatusList = branchTechnicians.map((tech) => {
    const techActiveOrders = active.filter(
      (o) => o.technicianId === tech.id || o.assigneeIds.includes(tech.id),
    );
    const currentOrder = techActiveOrders[0] ?? null;
    const currentVehicle = currentOrder ? vehicleFor(currentOrder) : null;
    return {
      tech,
      techActiveOrders,
      currentOrder,
      currentVehicle,
      isBusy: techActiveOrders.length > 0,
    };
  });

  // Usta odaklı aktif iş eşleştirmesi
  const myTech =
    branchTechnicians.find(
      (t) =>
        t.name.toLowerCase().includes("mehmet") ||
        t.id === "mehmet" ||
        t.role.toLowerCase().includes("usta"),
    ) ?? branchTechnicians[0];

  const myActiveOrders = active.filter(
    (o) => o.technicianId === myTech?.id || o.assigneeIds.includes(myTech?.id),
  );
  const myPrimaryOrder =
    myActiveOrders.find((o) => o.status === "IN_PROGRESS") ??
    myActiveOrders[0] ??
    null;
  const myPrimaryVehicle = myPrimaryOrder ? vehicleFor(myPrimaryOrder) : null;
  const myPrimaryCustomer = myPrimaryOrder ? customerFor(myPrimaryOrder) : null;

  return (
    <>
      <div className="app-page-heading">
        <div>
          <p className="app-overline">
            {activeBranchProfile?.category.toUpperCase() ||
              (currentUser.isTechnician
                ? "ATÖLYE MASASI & OPERASYON"
                : "GÜNLÜK OPERASYON")}
          </p>
          <h1>
            {currentUser.isTechnician
              ? `${currentUser.name} · ${activeBranchProfile?.name || "Atölye"}`
              : activeBranchProfile?.dashboardTitle || "Genel Bakış"}
          </h1>
          <p>
            {new Date().toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {activeBranchProfile?.businessName || branchName(branchId)}{" "}
            {currentUser.isTechnician ? "· Atölye Yetkisi" : ""}
          </p>
        </div>
        <div className="app-heading-actions">
          <Button
            type="button"
            variant="secondary"
            className="ux-scanner-trigger-btn"
            data-tour="plate-scanner-btn"
            onClick={() => setScannerOpen(true)}
          >
            <Camera size={18} /> Plaka Oku
          </Button>
          <QuickActions initial="appointment" outline />
          <Button asChild>
            <Link href="/app/intake">
              <Plus size={17} /> Araç Kabul
            </Link>
          </Button>
        </div>
      </div>

      {/* ATÖLYE MASASI & OPERASYON: ÜZERİNDE ÇALIŞILAN / ÇALIŞTIĞINIZ ARAÇ */}
      {myPrimaryOrder && (
        <section className="app-panel ux-technician-focus-panel" aria-label="Aktif Operasyon">
          <div className="ux-tech-focus-header">
            <div className="ux-tech-focus-title-group">
              <span className="ux-tech-focus-badge">
                <Wrench size={13} /> {currentUser.isTechnician ? "Atölye Masanız" : "Atölye Masası"}
              </span>
              <h2>{currentUser.isTechnician ? "Üzerinde Çalıştığınız Araç" : "Üzerinde Çalışılan Araç"}</h2>
            </div>
            <StatusBadge status={myPrimaryOrder.status} />
          </div>

          {myPrimaryVehicle ? (
            <div className="ux-tech-focus-body">
              <div className="ux-tech-focus-car">
                <div className="ux-tech-focus-plate-row">
                  <span className="app-car-tile">
                    <CarFront size={22} aria-hidden="true" />
                  </span>
                  <strong className="ux-plate-chip is-large">{myPrimaryVehicle.plate}</strong>
                  <div className="ux-tech-focus-model">
                    <strong>{myPrimaryVehicle.model} {myPrimaryVehicle.year || ""}</strong>
                    <span>
                      {myPrimaryCustomer ? `${myPrimaryCustomer.name} · ` : ""}
                      {myPrimaryVehicle.mileage ? `${number(myPrimaryVehicle.mileage)} km` : ""}
                    </span>
                  </div>
                </div>

                <div className="ux-tech-focus-job">
                  <span className="ux-tech-focus-label">Yapılacak İşlem / Teşhis:</span>
                  <p>
                    {myPrimaryOrder.labor.map((l) => l.name).join(", ") || myPrimaryOrder.complaint || "Genel Kontrol"}
                  </p>
                </div>
              </div>

              {/* 1-Dokunuş Usta Hızlı Aksiyonları */}
              <div className="ux-tech-focus-actions">
                {myPrimaryOrder.status !== "IN_PROGRESS" &&
                  myPrimaryOrder.status !== "READY" &&
                  myPrimaryOrder.status !== "DELIVERED" && (
                    <Button
                      type="button"
                      className="ux-tech-btn-start"
                      onClick={() =>
                        quickTechnicianAction(
                          myPrimaryOrder.id,
                          "IN_PROGRESS",
                          currentUser.name,
                        )
                      }
                    >
                      <Play size={16} /> İşi Başlat
                    </Button>
                  )}

                {myPrimaryOrder.status === "IN_PROGRESS" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="ux-tech-btn-pause"
                      onClick={() =>
                        quickTechnicianAction(
                          myPrimaryOrder.id,
                          "WAITING_PARTS",
                          currentUser.name,
                        )
                      }
                    >
                      <Pause size={15} /> Parça Bekle
                    </Button>
                    <Button
                      type="button"
                      className="ux-tech-btn-qc"
                      onClick={() =>
                        quickTechnicianAction(
                          myPrimaryOrder.id,
                          "QUALITY_CONTROL",
                          currentUser.name,
                        )
                      }
                    >
                      <CheckCircle2 size={16} /> Son Kontrol
                    </Button>
                  </>
                )}

                {myPrimaryOrder.status === "WAITING_PARTS" && (
                  <Button
                    type="button"
                    className="ux-tech-btn-start"
                    onClick={() =>
                      quickTechnicianAction(
                        myPrimaryOrder.id,
                        "IN_PROGRESS",
                        currentUser.name,
                      )
                    }
                  >
                    <Play size={16} /> Devam Et
                  </Button>
                )}

                {myPrimaryOrder.status === "QUALITY_CONTROL" && (
                  <Button
                    type="button"
                    className="ux-tech-btn-ready"
                    onClick={() =>
                      quickTechnicianAction(
                        myPrimaryOrder.id,
                        "READY",
                        currentUser.name,
                      )
                    }
                  >
                    <Check size={16} /> Hazır İşaretle
                  </Button>
                )}

                <Button asChild variant="outline" className="ux-tech-btn-detail">
                  <Link href={`/app/work-orders/${myPrimaryOrder.id}`}>
                    İş Emri Detayı <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>

              {myActiveOrders.length > 1 && (
                <div className="ux-tech-extra-jobs">
                  <span>Size atanan diğer işler ({myActiveOrders.length - 1}):</span>
                  {myActiveOrders
                    .filter((o) => o.id !== myPrimaryOrder.id)
                    .map((otherOrder) => {
                      const otherVehicle = vehicleFor(otherOrder);
                      return (
                        <Link
                          key={otherOrder.id}
                          href={`/app/work-orders/${otherOrder.id}`}
                          className="ux-tech-other-job-chip"
                        >
                          <strong>{otherVehicle.plate}</strong> · {statuses[otherOrder.status].short}
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          ) : (
            <div className="ux-tech-empty-card">
              <Wrench size={24} className="text-muted" />
              <div>
                <strong>Şu anda üzerinizde aktif iş bulunmuyor</strong>
                <p>Yeni bir iş emrini atayabilir veya servise yeni gelen aracı kabul edebilirsiniz.</p>
              </div>
              <Button asChild size="sm">
                <Link href="/app/work-orders">İş Listesine Bak</Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* PLAKA OKU / ARAÇ BUL (AÇIK RENK KART) */}
      <section className="app-panel ux-service-desk-panel" aria-label="Plaka Oku / Araç Bul">
        <div className="ux-service-desk-header">
          <div className="ux-service-desk-title-group">
            <span className="ux-service-desk-icon">
              <Search size={16} />
            </span>
            <div>
              <h2>Plaka Oku / Araç Bul</h2>
              <p>Plaka, telefon veya müşteri adı girerek arayın veya kamerayla anında tarayın.</p>
            </div>
          </div>
        </div>

        <div className="ux-service-desk-body">
          <Button
            type="button"
            className="ux-desk-plate-btn"
            onClick={() => setScannerOpen(true)}
          >
            <Camera size={18} />
            <span>Plaka Oku</span>
          </Button>

          <form
            className="ux-desk-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (deskQuery.trim()) {
                setDrawerPlate(deskQuery.trim());
                setDrawerOpen(true);
              }
            }}
          >
            <Search size={18} className="ux-desk-search-icon" />
            <input
              type="text"
              placeholder="Plaka, telefon veya müşteri adı girin (Örn. 31 ABC 123)..."
              value={deskQuery}
              onChange={(e) => setDeskQuery(e.target.value)}
              className="ux-desk-input"
            />
            <Button type="submit" size="sm" variant="default" className="ux-desk-submit-btn">
              Hızlı Aç <ArrowRight size={14} />
            </Button>
          </form>
        </div>

        <div className="ux-desk-quick-templates">
          <span className="ux-desk-hint">
            <Sparkles size={13} /> Sık Kullanılanlar:
          </span>
          <button
            type="button"
            className="ux-desk-pill"
            data-tour="demo-plate-chip"
            onClick={() => {
              setDrawerPlate("31 ABC 123");
              setDrawerOpen(true);
            }}
          >
            31 ABC 123 (Hızlı İşlem)
          </button>
          <button
            type="button"
            className="ux-desk-pill"
            onClick={() => {
              setDrawerPlate("34 XYZ 456");
              setDrawerOpen(true);
            }}
          >
            34 XYZ 456
          </button>
          <button
            type="button"
            className="ux-desk-pill is-new"
            onClick={() => {
              setDrawerPlate("31 SAN 999");
              setDrawerOpen(true);
            }}
          >
            + Yeni Araç Kabulü
          </button>
        </div>
      </section>
      <div className="app-dashboard-grid">
        <section
          className="app-panel app-operation-panel"
          aria-labelledby="operation-heading"
        >
          <div className="app-panel-heading">
            <div>
              <h2 id="operation-heading">{activeBranchProfile?.activeJobsLabel || "Servisteki Araçlar"}</h2>
              <p>{activeBranchProfile?.dashboardSubtitle || "İşin durumu, sorumlusu ve sonraki adımı."}</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/work-orders">
                Tüm İşler <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="app-operation-summary">
            <button
              aria-pressed={filter === "ALL"}
              className={filter === "ALL" ? "selected" : ""}
              onClick={() => setFilter("ALL")}
            >
              <strong>{active.length}</strong>
              <span>Aktif Araç</span>
            </button>
            {shownStatuses.map((status) => (
              <button
                key={status}
                className={filter === status ? "selected" : ""}
                aria-pressed={filter === status}
                onClick={() => setFilter(filter === status ? "ALL" : status)}
              >
                <strong className={`app-number-${statuses[status].tone}`}>
                  {active.filter((order) => order.status === status).length}
                </strong>
                <span>
                  {status === "READY"
                    ? "Teslime Hazır"
                    : statuses[status].short}
                </span>
              </button>
            ))}
          </div>
          <div className="app-operation-head" aria-hidden="true">
            <span>Plaka</span>
            <span>Araç & Müşteri</span>
            <span>İşlem / Teşhis</span>
            <span>Durum</span>
            <span>Sorumlu</span>
          </div>
          <div className="app-operation-list">
            {visible.map((order) => {
              const vehicle = vehicleFor(order);
              const customer = customerFor(order);
              const technician = technicianFor(order.technicianId);
              const jobDescription =
                order.labor.map((l) => l.name).join(", ") ||
                order.complaint ||
                "Genel Servis";

              return (
                <Link
                  className="app-operation-row"
                  key={order.id}
                  href={`/app/work-orders/${order.id}`}
                >
                  <div className="app-row-plate-col">
                    <strong className="ux-plate-chip">{vehicle.plate}</strong>
                  </div>
                  <div className="app-row-vehicle-col">
                    <strong>{vehicle.model}</strong>
                    <small>{customer.name}</small>
                  </div>
                  <div className="app-row-job-col">
                    <span>{jobDescription}</span>
                  </div>
                  <div className="app-row-status-col">
                    <StatusBadge status={order.status} short />
                  </div>
                  <div className="app-row-tech-col">
                    <span className="app-row-tech-name">{technician.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          {!visible.length && (
            <div className="app-empty-state">
              <CarFront size={26} />
              <h3>Bu aşamada araç yok.</h3>
              <button
                className="app-text-button"
                onClick={() => setFilter("ALL")}
              >
                Tüm aktif araçları göster
              </button>
            </div>
          )}
          <div className="app-panel-footer">
            <span>
              <span className="app-small-dot" /> Seçili şubedeki işler
            </span>
            <span>{visible.length} araç gösteriliyor</span>
          </div>
        </section>
        <aside className="app-dashboard-aside">
          {/* ŞU ANDA ÇALIŞAN USTALAR */}
          <section
            className="app-panel app-appointments ux-dashboard-techs"
            aria-labelledby="techs-heading"
          >
            <div className="app-panel-heading">
              <div>
                <h2 id="techs-heading">Şu Anda Çalışan Ustalar</h2>
                <p>
                  {techStatusList.filter((t) => t.isBusy).length} usta araç
                  başında · {techStatusList.filter((t) => !t.isBusy).length}{" "}
                  boşta
                </p>
              </div>
              <UsersRound size={18} aria-hidden="true" />
            </div>

            <div className="ux-dashboard-tech-list">
              {techStatusList.map(
                ({ tech, currentOrder, currentVehicle, isBusy }) => (
                  <div key={tech.id} className="ux-dashboard-tech-row">
                    <div className="ux-dashboard-tech-left">
                      <span className="app-avatar small">
                        {tech.name
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div className="ux-dashboard-tech-info">
                        <strong>{tech.name}</strong>
                        <small>
                          {isBusy && currentVehicle
                            ? currentVehicle.model
                            : tech.specialty}
                        </small>
                      </div>
                    </div>
                    {isBusy && currentOrder && currentVehicle ? (
                      <Link
                        href={`/app/work-orders/${currentOrder.id}`}
                        className="ux-dashboard-tech-job"
                      >
                        <strong className="ux-plate-chip">
                          {currentVehicle.plate}
                        </strong>
                        <span
                          className="ux-tech-dot is-busy"
                          title="Araç Başında"
                        />
                      </Link>
                    ) : (
                      <Link
                        href="/app/team"
                        className="ux-dashboard-tech-idle"
                      >
                        <span className="ux-tech-idle-text">Boşta</span>
                        <span
                          className="ux-tech-dot is-idle"
                          title="Müsait"
                        />
                      </Link>
                    )}
                  </div>
                ),
              )}
            </div>

            <Link className="module-dashboard-link" href="/app/team">
              Tüm Ekip & Atölye Durumu <ArrowRight />
            </Link>
          </section>

          <section
            className="app-panel app-appointments"
            aria-labelledby="appointments-heading"
          >
            <div className="app-panel-heading">
              <h2 id="appointments-heading">Bugünün Randevuları</h2>
              <CalendarDays size={18} aria-hidden="true" />
            </div>

            {demoAppointments.filter(a => a.branchId === branchId && a.status!=="İptal" && a.at.slice(0,10)===new Date().toISOString().slice(0,10)).map(a => <div className="app-appointment-row" key={a.id}><time>{new Date(a.at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}<br />{new Date(a.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</time><div><strong>{vehicles.find(v => v.id === a.vehicleId)?.plate}</strong><p>{a.note || "Servis randevusu"}</p><span>Planlandı</span></div></div>)}
            <Link className="module-dashboard-link" href="/app/calendar">
              Takvimi Gör <ArrowRight />
            </Link>
          </section>
          <section className="app-day-note">
            <Clock3 size={19} aria-hidden="true" />
            <h3>Günün odağı</h3>
            <p>Önce bekleyen onayları ve geciken teslimleri kontrol edin.</p>
            <Link href="/app/work-orders?quick=late">
              Geciken işleri incele <ArrowRight size={14} />
            </Link>
          </section>
        </aside>
      </div>
      <section className="app-attention" aria-labelledby="attention-heading">
        <div className="app-section-title">
          <CircleAlert size={18} aria-hidden="true" />
          <h2 id="attention-heading">Dikkat Gerektirenler</h2>
          <span>Sayıların ötesinde, yapılacak işler.</span>
        </div>
        <div className="app-attention-grid">
          {critical && (
            <div>
              <span className="app-attention-icon">
                <Package size={19} />
              </span>
              <h3>{critical?.name}</h3>
              <p>
                Kullanılabilir: <strong>{critical ? critical.physical-critical.reserved : 0}</strong> ·
                Minimum: {critical?.minimum}
              </p>
              <Link className="module-dashboard-link" href="/app/stock">
                Stoğu Gör <ArrowRight />
              </Link>
            </div>
          )}
          {approvalOrder && (
            <div>
              <span className="app-attention-icon">
                <Clock3 size={19} />
              </span>
              <h3>#{approvalOrder.id}</h3>
              <p>
                {customerFor(approvalOrder).name} · Müşteri onayı bekleniyor
              </p>
              <Button asChild variant="ghost">
                <Link
                  href={`/app/work-orders/${approvalOrder.id}?tab=approval`}
                >
                  Onayı Kaydet <ArrowRight />
                </Link>
              </Button>
            </div>
          )}
          {branchId === "dortyol" && (
            <div>
              <span className="app-attention-icon">
                <CarFront size={19} />
              </span>
              <h3>{demoAlerts.maintenance.plate}</h3>
              <p>Bakım zamanı {demoAlerts.maintenance.days} gün sonra</p>
              <Link className="module-dashboard-link" href={`/app/vehicles/${vehicles.find(v=>v.plate===demoAlerts.maintenance.plate)?.id??vehicles[0].id}`}>
                Aracı Gör <ArrowRight />
              </Link>
            </div>
          )}
          {branchId !== "dortyol" && !approvalOrder && (
            <p className="app-attention-empty">
              Bu şubede dikkat gerektiren kayıt yok.
            </p>
          )}
        </div>
      </section>
      {!currentUser.isTechnician && (
        <section
          className="app-finance-strip"
          aria-label="Şubenin finans özeti"
        >
          <div>
            <span>Bugünkü Tahsilat</span>
            <strong>{money(summary.collected)}</strong>
          </div>
          <div>
            <span>Açık Bakiye</span>
            <strong>{money(summary.balance)}</strong>
          </div>
          <div>
            <span>Kesinleşen Hizmet Geliri</span>
            <strong>{money(summary.revenue)}</strong>
          </div>
          <span className="app-finance-disclaimer">
            Finans özeti
            <br />
            Seçili şubenin kayıtları.
          </span>
        </section>
      )}

      {/* PLAKA OKUMA MODALI */}
      <PlateScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onPlateConfirmed={(plate) => {
          setDrawerPlate(plate);
          setDrawerOpen(true);
        }}
      />

      {/* AKILLI HIZLI İŞLEM ÇEKMECESİ */}
      <QuickFlowDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initialPlate={drawerPlate}
      />
    </>
  );
}
