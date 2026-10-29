"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDemo } from "@/components/app-shell/demo-provider";
import { useOperations } from "@/components/modules/operations-store";
import {
  allowedTransitions,
  money,
  nextActions,
  pendingApprovalAmount,
  statuses,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/lib/demo-data";

export function StatusActions({ order, compact = false }: { order: WorkOrder; compact?: boolean }) {
  const { changeStatus } = useDemo();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<WorkOrderStatus | "">("");
  const [checked, setChecked] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const next = nextActions[order.status];
  const blocked = target === "IN_PROGRESS" && order.approval === "PENDING";
  const requiresCheck =
    target === "READY" || target === "DELIVERED" || target === "CANCELLED";

  function handleTransition(status: WorkOrderStatus, event?: React.MouseEvent<HTMLButtonElement>) {
    // If transition requires safety confirmation or is blocked
    const needsDialog = status === "READY" || status === "DELIVERED" || status === "CANCELLED" || (status === "IN_PROGRESS" && order.approval === "PENDING");
    if (needsDialog) {
      if (event) triggerRef.current = event.currentTarget;
      setTarget(status);
      setChecked(false);
      setOpen(true);
    } else {
      // 1-touch instant transition
      changeStatus(order.id, status);
    }
  }

  function show(
    event: React.MouseEvent<HTMLButtonElement>,
    value: WorkOrderStatus | "",
  ) {
    triggerRef.current = event.currentTarget;
    setTarget(value);
    setChecked(false);
    setOpen(true);
  }

  // Quick transition candidates based on current status for 1-touch speed
  const allowed = allowedTransitions[order.status];

  return (
    <>
      <div className={compact ? "app-status-actions assigned-actions" : "app-status-actions ux-next-action"}>
        {!compact && <span className="ux-next-label">{next ? "Sıradaki İşlem" : "İş tamamlandı"}</span>}
        {order.status === "AWAITING_APPROVAL" && order.approval === "PENDING" ? (
          <RecordApproval order={order} compact={compact} />
        ) : next && (
          <Button
            className="app-next-action"
            onClick={(event) => handleTransition(next.status, event)}
          >
            {compact
              ? ({
                  RECEIVED: "Tespiti Başlat",
                  DIAGNOSIS: "Onaya Gönder",
                  AWAITING_APPROVAL: "İşlemi Başlat",
                  IN_PROGRESS: "Son Kontrol",
                  WAITING_PARTS: "Devam Et",
                  QUALITY_CONTROL: "Hazır İşaretle",
                  READY: "Teslim Et",
                  DELIVERED: "Tamamlandı",
                  CANCELLED: "İptal",
                }[order.status] || next.label)
              : next.label}
            <ArrowRight />
          </Button>
        )}

        {/* 1-touch alternative status shortcuts if available */}
        {!compact && allowed.length > 1 && (
          <div className="ux-quick-status-pills">
            {allowed
              .filter((st) => st !== next?.status && st !== "CANCELLED")
              .map((st) => (
                <button
                  key={st}
                  type="button"
                  className="ux-status-quick-pill"
                  onClick={(e) => handleTransition(st, e)}
                  title={`Doğrudan ${statuses[st].label} durumuna geçir`}
                >
                  {statuses[st].label}
                </button>
              ))}
          </div>
        )}

        {allowed.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={compact ? `${order.id} diğer durum işlemleri` : undefined}
            title={compact ? "Durumu değiştir" : undefined}
            onClick={(event) => show(event, "")}
            disabled={!allowed.length}
          >
            {compact ? <span aria-hidden="true">···</span> : "Diğer..."}
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="app-demo-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus({ preventScroll: true });
          }}
        >
          <DialogTitle className="app-dialog-title">
            İş Durumunu Değiştir
          </DialogTitle>
          <DialogDescription className="app-dialog-description">
            İşin ilerleyişine uygun sonraki durumu seçip onaylayın.
          </DialogDescription>
          <div className="app-status-change-form">
            <p>
              Mevcut durum: <strong>{statuses[order.status].label}</strong>
            </p>
            <label>
              Sonraki durum
              <select
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value as WorkOrderStatus | "");
                  setChecked(false);
                }}
              >
                <option value="">Bir durum seçin</option>
                {allowedTransitions[order.status].map((status) => (
                  <option key={status} value={status}>
                    {statuses[status].label}
                  </option>
                ))}
              </select>
            </label>
            {blocked && (
              <p className="app-inline-warning">
                <CircleAlert size={17} />
                Önce Teklif ve Onay sekmesinden müşteri onayını kaydedin.
              </p>
            )}
            {requiresCheck && (
              <label className="app-checkbox-label">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => setChecked(event.target.checked)}
                />
                {target === "READY"
                  ? "Son kontrolün tamamlandığını doğruluyorum."
                  : target === "DELIVERED"
                    ? `${money(order.total - order.paid)} açık bakiye ile teslimi onaylıyorum.`
                    : "İşin iptal edileceğini; parça ve ödeme kayıtlarının korunacağını anladım."}
              </label>
            )}
          </div>
          <div className="app-dialog-actions">
            <DialogClose asChild>
              <Button variant="outline">Vazgeç</Button>
            </DialogClose>
            <Button
              disabled={!target || blocked || (requiresCheck && !checked)}
              onClick={() => {
                if (target) changeStatus(order.id, target);
                setOpen(false);
              }}
            >
              Durumu Güncelle <Check />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddNote({
  orderId,
  compact = false,
}: {
  orderId: string;
  compact?: boolean;
}) {
  const { addNote, orders, technicianFor } = useDemo();
  const { data: operations } = useOperations();
  const order = orders.find((o) => o.id === orderId);
  const defaultAuthor = order
    ? technicianFor(order.technicianId).name
    : "Ahmet";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(defaultAuthor);
  const staffOptions = operations.employees.filter((e) => e.active);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MessageSquarePlus />
          {compact ? "Not" : "Not Ekle"}
        </Button>
      </DialogTrigger>
      <DialogContent className="app-demo-dialog">
        <DialogTitle className="app-dialog-title">
          Personel İç Notu Ekle
        </DialogTitle>
        <DialogDescription className="app-dialog-description">
          Bu not yalnız servis personeli tarafından görülür; müşteriye gösterilmez.
        </DialogDescription>
        <form
          className="app-local-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) return;
            addNote(orderId, text, author);
            setText("");
            setOpen(false);
          }}
        >
          <label htmlFor="order-note-author" className="app-field-label">
            Yazan Personel
            <select
              id="order-note-author"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
            >
              {staffOptions.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="order-note">Dahili Not İçeriği</label>
          <textarea
            id="order-note"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            rows={4}
            required
            placeholder="Örneğin: Sağ ön disk de kontrol edilmeli."
          />
          <span>{text.length} / 2000</span>
          <Button type="submit" disabled={!text.trim()}>
            Notu Ekle <Check />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RecordApproval({
  order,
  compact = false,
}: {
  order: WorkOrder;
  compact?: boolean;
}) {
  const { recordApproval } = useDemo();
  const [channel, setChannel] = useState("Telefon");
  const [open, setOpen] = useState(false);
  const pendingAmount = pendingApprovalAmount(order);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          {compact ? "Onayı Kaydet" : "Müşteri Onayını Kaydet"} <Check />
        </Button>
      </DialogTrigger>
      <DialogContent className="app-demo-dialog">
        <DialogTitle className="app-dialog-title">
          Revizyon {order.quoteRevision} · Müşteri Onayı
        </DialogTitle>
        <DialogDescription className="app-dialog-description">
          {money(pendingAmount > 0 ? pendingAmount : order.total)} tutarındaki
          teklif için alınan müşteri onayını kaydedin.
        </DialogDescription>
        <label className="app-field-label">
          Onay kanalı
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          >
            <option>Telefon</option>
            <option>WhatsApp</option>
            <option>Yüz yüze</option>
          </select>
        </label>
        <Button
          onClick={() => {
            recordApproval(order.id, channel);
            setOpen(false);
          }}
        >
          Onayı Kaydet <Check />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
