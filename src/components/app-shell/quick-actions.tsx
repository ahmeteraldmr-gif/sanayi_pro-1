"use client";

import Link from "next/link";
import { useState, useRef, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  CarFront,
  ClipboardList,
  History,
  Plus,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOperations } from "@/components/modules/operations-store";
import { useDemo, useRecentPaths } from "./demo-provider";
import { defaultAppointmentTime, isActive, money } from "@/lib/demo-data";
import { PlateScannerModal } from "@/components/plate-reader/plate-scanner-modal";
import { QuickFlowDrawer } from "@/components/app-shell/quick-flow-drawer";

type Action = "menu" | "appointment" | "payment" | "order";

export function QuickActions({
  mobile = false,
  initial = "menu",
  orderId = "",
  outline = false,
  onCompleted,
}: {
  mobile?: boolean;
  initial?: Action;
  orderId?: string;
  outline?: boolean;
  onCompleted?: (at?: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={outline ? "outline" : "default"}
        className={
          mobile
            ? "app-bottom-create"
            : initial === "menu"
              ? "ux-quick-trigger"
              : ""
        }
        aria-label={
          initial === "menu" ? "Hızlı işlem menüsünü aç" : undefined
        }
        onClick={() => setOpen(true)}
      >
        {initial === "menu" ? (
          <>
            <Plus size={20} />
            <span>{mobile ? "İşlem" : "Hızlı İşlem"}</span>
          </>
        ) : initial === "payment" ? (
          <>
            <Wallet size={17} /> Tahsilat Ekle
          </>
        ) : (
          <>
            <Plus size={17} /> Randevu
          </>
        )}
      </Button>
      <QuickActionsDialog
        open={open}
        onOpenChange={setOpen}
        initial={initial}
        orderId={orderId}
        onCompleted={onCompleted}
      />
    </>
  );
}

function QuickActionsDialog({
  open,
  onOpenChange,
  initial,
  orderId,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  initial: Action;
  orderId: string;
  onCompleted?: (at?: string) => void;
}) {
  const demo = useDemo();
  const [recent] = useRecentPaths();
  const { data: operations } = useOperations();
  const [action, setAction] = useState<Action>(initial);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const [selectedOrder, setSelectedOrder] = useState(orderId);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPlate, setDrawerPlate] = useState("");

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setAction(initial);
      setError("");
    }
  }

  const payable = demo.orders.filter(
    (o) =>
      o.branchId === demo.branchId &&
      o.total > o.paid &&
      o.status !== "CANCELLED",
  );
  const selected = payable.find((o) => o.id === selectedOrder);
  const available = demo.vehicles.filter(
    (v) => !demo.orders.some((o) => o.vehicleId === v.id && isActive(o.status)),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const data = new FormData(event.currentTarget);
    const appointmentAt = String(data.get("at") ?? "");
    const success =
      action === "payment"
        ? demo.collectPayment(
            String(data.get("order")),
            Number(data.get("amount")),
          )
        : demo.addAppointment(
            String(data.get("vehicle")),
            appointmentAt,
            String(data.get("note") ?? ""),
            String(data.get("technician") ?? ""),
          );
    if (!success) {
      setError(
        action === "payment"
          ? "İş emrini ve açık bakiyeyi aşmayan tutarı kontrol edin."
          : "Araç ve tarihi kontrol edin. Aynı araç ve saatte ikinci randevu oluşturulamaz.",
      );
      return;
    }
    lock.current = true;
    onCompleted?.(action === "appointment" ? appointmentAt : undefined);
    onOpenChange(false);
  }

  const title =
    action === "menu"
      ? "Bir sonraki işiniz, tek adım ötede."
      : action === "appointment"
        ? "Randevu oluştur"
        : action === "payment"
          ? "Tahsilat kaydet"
          : "İş emri başlat";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ux-quick-dialog">
        {action !== "menu" && (
          <button
            className="ux-back"
            onClick={() => {
              setAction("menu");
              setError("");
            }}
          >
            <ArrowLeft size={17} /> Hızlı işlemler
          </button>
        )}
        <p className="app-overline">HIZLI İŞLEMLER</p>
        <DialogTitle className="app-dialog-title">{title}</DialogTitle>
        <DialogDescription className="app-dialog-description">
          İhtiyacınız olan işleme buradan ulaşın.
        </DialogDescription>
        {action === "menu" ? (
          <>
            <div className="ux-quick-grid">
              <button
                type="button"
                className="ux-quick-highlight-btn"
                onClick={() => {
                  onOpenChange(false);
                  setScannerOpen(true);
                }}
              >
                <Camera />
                <strong>Plaka Oku</strong>
                <span>Kamera ile araç tanı</span>
                <ArrowRight />
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setDrawerPlate("");
                  setDrawerOpen(true);
                }}
              >
                <CarFront />
                <strong>Araç Kabul</strong>
                <span>Tek dokunuşla kabul</span>
                <ArrowRight />
              </button>
              <Link
                href="/app/customers/new"
                onClick={() => onOpenChange(false)}
              >
                <Plus />
                <strong>Yeni Müşteri & Araç</strong>
                <span>Tek formda kaydet</span>
                <ArrowRight />
              </Link>
              <button onClick={() => setAction("order")}>
                <ClipboardList />
                <strong>Hızlı İş Emri</strong>
                <span>Kayıtlı araçla başla</span>
                <ArrowRight />
              </button>
              <button onClick={() => setAction("payment")}>
                <Wallet />
                <strong>Tahsilat Al</strong>
                <span>Açık bakiyeyi kapat</span>
                <ArrowRight />
              </button>
              <button onClick={() => setAction("appointment")}>
                <CalendarDays />
                <strong>Randevu Oluştur</strong>
                <span>Gelişi planla</span>
                <ArrowRight />
              </button>
            </div>
            <div className="ux-recents">
              <h3>
                <History size={16} /> Son görüntülenenler
              </h3>
              {recent.length ? (
                recent.map((path) => {
                  const [, , kind, id] = path.split("/");
                  const record =
                    kind === "vehicles"
                      ? demo.vehicles.find((v) => v.id === id)
                      : kind === "customers"
                        ? demo.customers.find((c) => c.id === id)
                        : demo.orders.find((o) => o.id === id);
                  if (!record) return null;
                  const label =
                    "plate" in record
                      ? record.plate
                      : "name" in record
                        ? record.name
                        : demo.vehicleFor(record).plate;
                  return (
                    <Link
                      key={path}
                      href={path}
                      onClick={() => onOpenChange(false)}
                    >
                      <span>{label}</span>
                      <small>
                        {kind === "vehicles"
                          ? "Araç"
                          : kind === "customers"
                            ? "Müşteri"
                            : `İş emri · ${id}`}
                      </small>
                      <ArrowRight size={16} />
                    </Link>
                  );
                })
              ) : (
                <p>Açtığınız araçlar, müşteriler ve işler burada görünür.</p>
              )}
            </div>
          </>
        ) : action === "order" ? (
          <div className="ux-order-choices">
            {available.length ? (
              available.map((v) => (
                <Link
                  key={v.id}
                  href={`/app/intake?vehicle=${v.id}`}
                  onClick={() => onOpenChange(false)}
                >
                  <CarFront size={19} />
                  <span>
                    <strong>{v.plate}</strong>
                    <small>
                      {demo.customers.find((c) => c.id === v.customerId)?.name}
                    </small>
                  </span>
                  <ArrowRight size={17} />
                </Link>
              ))
            ) : (
              <p>
                Tüm araçların açık iş emri var. Plaka aramasından mevcut işe
                devam edin.
              </p>
            )}
            <Button asChild variant="outline">
              <Link href="/app/intake" onClick={() => onOpenChange(false)}>
                Yeni araçla başla <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <form className="records-form ux-quick-form" onSubmit={submit}>
            {action === "payment" ? (
              <>
                <label>
                  İş emri
                  <select
                    name="order"
                    required
                    value={selectedOrder}
                    onChange={(e) => {
                      setSelectedOrder(e.target.value);
                      setError("");
                    }}
                  >
                    <option value="">İş emri seçin</option>
                    {payable.map((o) => (
                      <option key={o.id} value={o.id}>
                        {demo.vehicleFor(o).plate} · {money(o.total - o.paid)}
                      </option>
                    ))}
                  </select>
                </label>
                {selected && (
                  <div className="ux-balance">
                    <span>
                      {demo.customerFor(selected).name} · Açık bakiye
                    </span>
                    <strong>{money(selected.total - selected.paid)}</strong>
                  </div>
                )}
                <label>
                  Tutar (₺)
                  <input
                    key={selectedOrder}
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    max={
                      selected
                        ? Math.round((selected.total - selected.paid) * 100) /
                          100
                        : undefined
                    }
                    defaultValue={
                      selected
                        ? Math.round((selected.total - selected.paid) * 100) /
                          100
                        : ""
                    }
                    required
                    placeholder="0,00"
                  />
                </label>
                {!payable.length && (
                  <p className="records-help">Bu şubede açık bakiye yok.</p>
                )}
              </>
            ) : (
              <>
                <label>
                  Araç
                  <select name="vehicle" required>
                    <option value="">Plaka / müşteri seçin</option>
                    {demo.vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} ·{" "}
                        {
                          demo.customers.find((c) => c.id === v.customerId)
                            ?.name
                        }
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Usta
                  <select name="technician">
                    <option value="">Atanmamış</option>
                    {operations.employees
                      .filter((e) => e.active && e.branchId === demo.branchId)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Tarih ve saat
                  <input
                    name="at"
                    type="datetime-local"
                    required
                    defaultValue={defaultAppointmentTime()}
                  />
                </label>
                <label>
                  Not <span className="ux-optional">İsteğe bağlı</span>
                  <input
                    name="note"
                    maxLength={200}
                    placeholder="Örn. Periyodik bakım"
                  />
                </label>
              </>
            )}
            {error && (
              <p className="records-error" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={action === "payment" && !selected}
              data-tour={action === "appointment" ? "calendar-save-btn" : undefined}
            >
              {action === "payment" ? "Tahsilatı Kaydet" : "Randevuyu Kaydet"}
              <ArrowRight />
            </Button>
            {action === "appointment" &&
              demo.demoAppointments.filter((a) => a.branchId === demo.branchId)
                .length > 0 && (
                <div className="ux-recents">
                  <h3>Kayıtlı randevular</h3>
                  {demo.demoAppointments
                    .filter((a) => a.branchId === demo.branchId)
                    .map((a) => (
                      <p key={a.id}>
                        <strong>
                          {
                            demo.vehicles.find((v) => v.id === a.vehicleId)
                              ?.plate
                          }
                        </strong>{" "}
                        ·{" "}
                        {new Date(a.at).toLocaleString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    ))}
                </div>
              )}
          </form>
        )}
      </DialogContent>
    </Dialog>
    <PlateScannerModal
      open={scannerOpen}
      onOpenChange={setScannerOpen}
      onPlateConfirmed={(plate) => {
        setDrawerPlate(plate);
        setDrawerOpen(true);
      }}
    />
    <QuickFlowDrawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      initialPlate={drawerPlate}
    />
  </>
  );
}
