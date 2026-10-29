"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCheck, Package } from "lucide-react";
import { useDemo } from "@/components/app-shell/demo-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  deliveryLabel,
  isActive,
  isOverdue,
  money,
  nowTimeLabel,
  statuses,
  type WorkOrder,
} from "@/lib/demo-data";
import { useOperations } from "@/components/modules/operations-store";
import { StatusActions } from "./order-actions";
import { ConsumePart, PartRequestEntry } from "./order-entry-actions";

function QuickPartModal({
  order,
  technicianName,
}: {
  order: WorkOrder;
  technicianName: string;
}) {
  const demo = useDemo();
  const { data, update } = useOperations();
  const [open, setOpen] = useState(false);
  const vehicle = demo.vehicleFor(order);
  const reservedParts = order.parts.filter((p) => p.state === "RESERVED");
  const availableStock = data.parts.filter(
    (p) => p.branchId === order.branchId && p.physical - p.reserved > 0,
  );

  function consumeStockPart(partId: string) {
    const part = data.parts.find((p) => p.id === partId);
    if (!part || part.physical - part.reserved < 1) {
      demo.announce("Kullanılabilir stok yeterli değil.");
      return;
    }
    update((s) => ({
      ...s,
      parts: s.parts.map((p) =>
        p.id === part.id ? { ...p, physical: p.physical - 1 } : p,
      ),
      movements: [
        {
          id: crypto.randomUUID(),
          partId: part.id,
          amount: -1,
          at: new Date().toISOString(),
          note: `${technicianName} tarafından hızlı kullanıldı`,
          orderId: order.id,
        },
        ...s.movements,
      ],
    }));
    const existingLine = order.parts.find((p) => p.id === part.id);
    const nextParts = existingLine
      ? order.parts.map((p) =>
          p.id === part.id
            ? {
                ...p,
                quantity: p.quantity + 1,
                state: "CONSUMED" as const,
                historicCost: part.cost,
              }
            : p,
        )
      : [
          ...order.parts,
          {
            id: part.id,
            name: part.name,
            quantity: 1,
            price: part.price,
            historicCost: part.cost,
            state: "CONSUMED" as const,
          },
        ];
    demo.updateOrder(order.id, {
      parts: nextParts,
      total: Math.round((order.total + part.price) * 100) / 100,
      timeline: [
        ...order.timeline,
        {
          id: crypto.randomUUID(),
          time: nowTimeLabel(),
          text: `Stoktan ${part.name} kullanıldı (${technicianName})`,
        },
      ],
    });
    demo.announce(`${part.name} kullanıldı.`);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="assigned-quick-btn">
          <Package size={12} /> Parça Kullan
        </button>
      </DialogTrigger>
      <DialogContent className="app-demo-dialog">
        <DialogTitle className="app-dialog-title">
          {vehicle.plate} · Hızlı Parça Kullanımı
        </DialogTitle>
          <DialogDescription className="app-dialog-description">
            İş emrine ayrılan parçaları tek tıkla kullanın veya stoktan ekleyin.
          </DialogDescription>

          {reservedParts.length > 0 && (
            <div className="assigned-quick-parts-box">
              <strong>Bu İş İçin Ayrılan Parçalar</strong>
              {reservedParts.map((part) => (
                <div key={part.id} className="assigned-quick-part-item">
                  <span>
                    {part.name} · {part.quantity} adet
                  </span>
                  <ConsumePart order={order} partId={part.id} />
                </div>
              ))}
            </div>
          )}

          <div className="assigned-quick-parts-box">
            <strong>Stoktan Tek Tıkla Kullan (1 Adet)</strong>
            {availableStock.length > 0 ? (
              availableStock.map((part) => (
                <div key={part.id} className="assigned-quick-part-item">
                  <span>
                    {part.name} · Kalan: {part.physical - part.reserved} adet (
                    {money(part.price)})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => consumeStockPart(part.id)}
                  >
                    Kullan
                  </Button>
                </div>
              ))
            ) : (
              <p className="app-muted">Bu şubede kullanılabilir stok yok.</p>
            )}
          </div>

          <div className="app-dialog-actions">
            <PartRequestEntry
              order={order}
              trigger={
                <Button variant="outline" size="sm">
                  Stokta Yoksa Parça Talep Et
                </Button>
              }
            />
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Kapat
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
    </Dialog>
  );
}

export function MyJobs() {
  const {
    orders,
    branchId,
    vehicleFor,
    customerFor,
    quickTechnicianAction,
  } = useDemo();
  const { data: operations } = useOperations();
  const technicians = operations.employees.filter((e) => e.active);
  const [technicianId, setTechnician] = useState("mehmet");
  const currentTechnicianName =
    technicians.find((t) => t.id === technicianId)?.name ?? "Usta";
  const jobs = orders
    .filter(
      (order) =>
        order.branchId === branchId &&
        order.assigneeIds.includes(technicianId) &&
        isActive(order.status),
    )
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const overdue = jobs.filter(isOverdue).length;

  return (
    <div className="assigned-jobs-page">
      <div className="app-page-heading assigned-heading">
        <div>
          <p className="app-overline">USTA ÇALIŞMA ALANI · HIZLI MOD</p>
          <h1>Bana Atanan İşler</h1>
        </div>
        <label className="assigned-technician">
          <span>Usta</span>
          <select
            aria-label="Usta seçin"
            value={technicianId}
            onChange={(event) => setTechnician(event.target.value)}
          >
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section
        className="app-panel assigned-list-panel"
        aria-label="Atanmış aktif işler"
      >
        <div className="assigned-list-toolbar">
          <div>
            <strong>{jobs.length} aktif iş</strong>
            {overdue > 0 && (
              <span className="assigned-overdue-count">{overdue} geciken</span>
            )}
          </div>
          <span>Tek tıkla: Başlat · Parça Kullan · Beklemeye Al · Son Kontrol · Hazır</span>
        </div>
        {jobs.length ? (
          <>
            <div className="assigned-list-columns" aria-hidden="true">
              <span>Plaka / Araç</span>
              <span>Müşteri</span>
              <span>Durum</span>
              <span>Teslim</span>
              <span>Sonraki işlem</span>
            </div>
            <ul className="assigned-job-list">
              {jobs.map((order) => {
                const vehicle = vehicleFor(order),
                  customer = customerFor(order);
                return (
                  <li className="assigned-job-row" key={order.id}>
                    <div className="assigned-vehicle">
                      <h2>{vehicle.plate}</h2>
                      <span title={vehicle.model}>{vehicle.model}</span>
                    </div>
                    <span className="assigned-customer" title={customer.name}>
                      {customer.name}
                    </span>
                    <span className="assigned-status">
                      <StatusBadge status={order.status} short />
                    </span>
                    <span
                      className={`assigned-delivery ${isOverdue(order) ? "is-late" : ""}`}
                    >
                      {deliveryLabel(order.dueAt)}
                    </span>
                    <div className="assigned-row-action">
                      <StatusActions order={order} compact />
                      <div
                        className="assigned-quick-bar"
                        aria-label="Usta hızlı işlem butonları"
                      >
                        <button
                          type="button"
                          className={`assigned-quick-btn ${order.status === "IN_PROGRESS" ? "is-current" : ""}`}
                          disabled={order.status === "IN_PROGRESS"}
                          onClick={() =>
                            quickTechnicianAction(
                              order.id,
                              "IN_PROGRESS",
                              currentTechnicianName,
                            )
                          }
                        >
                          Başlat
                        </button>
                        <QuickPartModal
                          order={order}
                          technicianName={currentTechnicianName}
                        />
                        <button
                          type="button"
                          className={`assigned-quick-btn ${order.status === "WAITING_PARTS" ? "is-current" : ""}`}
                          disabled={order.status === "WAITING_PARTS"}
                          onClick={() =>
                            quickTechnicianAction(
                              order.id,
                              "WAITING_PARTS",
                              currentTechnicianName,
                            )
                          }
                        >
                          Beklemeye Al
                        </button>
                        <button
                          type="button"
                          className={`assigned-quick-btn ${order.status === "QUALITY_CONTROL" ? "is-current" : ""}`}
                          disabled={order.status === "QUALITY_CONTROL"}
                          onClick={() =>
                            quickTechnicianAction(
                              order.id,
                              "QUALITY_CONTROL",
                              currentTechnicianName,
                            )
                          }
                        >
                          Son Kontrol
                        </button>
                        <button
                          type="button"
                          className={`assigned-quick-btn ${order.status === "READY" ? "is-current" : ""}`}
                          disabled={order.status === "READY"}
                          onClick={() =>
                            quickTechnicianAction(
                              order.id,
                              "READY",
                              currentTechnicianName,
                            )
                          }
                        >
                          Hazır
                        </button>
                      </div>
                    </div>
                    <Link
                      className="assigned-row-link"
                      href={`/app/work-orders/${order.id}`}
                      aria-label={`${vehicle.plate} · ${vehicle.model} · ${customer.name} · ${statuses[order.status].label} · ${deliveryLabel(order.dueAt)} · Detayı aç`}
                    >
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="assigned-empty">
            <CheckCheck size={24} />
            <h2>Atanmış aktif iş yok.</h2>
            <p>Seçili usta ve şube için işler burada görünecek.</p>
          </div>
        )}
      </section>
    </div>
  );
}
