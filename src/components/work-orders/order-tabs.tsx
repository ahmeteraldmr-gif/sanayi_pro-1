"use client";

import { useState } from "react";
import {
  Check,
  CircleAlert,
  Clock3,
  FileCheck2,
  Fuel,
  Gauge,
  History,
  ImagePlus,
  KeyRound,
  Lock,
  Package,
  Plus,
  ReceiptText,
  Send,
  X,
} from "lucide-react";
import {
  LaborEntry,
  PartEntry,
  PhotoEntry,
  ConsumePart,
  PartRequestEntry,
} from "./order-entry-actions";
import { QuickActions } from "@/components/app-shell/quick-actions";
import { RecordApproval } from "./order-actions";
import {
  approvalExample,
  deliveryLabel,
  effectiveQuoteStatus,
  money,
  number,
  partRequestStatuses,
  pendingApprovalAmount,
  quoteStatusMeta,
  type IntakePhoto,
  type PartRequestStatus,
  type QuoteStatus,
  type WorkOrder,
} from "@/lib/demo-data";
import { useDemo } from "@/components/app-shell/demo-provider";
import {
  inspectionItems,
  inspectionStateLabels,
  intakeChecklist,
} from "@/lib/intake-data";
import { useOperations } from "@/components/modules/operations-store";
import { dateLabel, EntryForm } from "@/components/modules/module-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export const detailTabs = [
  { id: "summary", label: "Özet" },
  { id: "labor", label: "İşlemler" },
  { id: "parts", label: "Parçalar" },
  { id: "history", label: "Geçmiş" },
] as const;

export type DetailTab =
  | (typeof detailTabs)[number]["id"]
  | "general"
  | "photos"
  | "approval"
  | "payments";

export function SummaryTab({ order }: { order: WorkOrder }) {
  const { vehicleFor, updateOrder, announce } = useDemo();
  const previousMileage = vehicleFor(order).lastService?.mileage ?? 0;
  const pendingAmount = pendingApprovalAmount(order);
  const [showQuote, setShowQuote] = useState(pendingAmount > 0);
  const [selectedPhoto, setSelectedPhoto] = useState<IntakePhoto | null>(null);

  return (
    <div className="app-summary-tab">
      {/* 1. Müşteri Şikayeti */}
      <section className="app-summary-card">
        <span className="app-summary-section-label">Müşteri Şikâyeti</span>
        <p className="app-complaint-quote">“{order.complaint}”</p>
      </section>

      {/* 2. Ön Tespit & Teşhis */}
      <section className="app-summary-card">
        <div className="app-section-title">
          <span className="app-summary-section-label">Ön Tespit & Teşhis</span>
          <EntryForm
            title="Tespiti Düzenle"
            trigger={
              <Button variant="outline" size="sm">
                Düzenle
              </Button>
            }
            fields={[
              {
                name: "diagnosis",
                label: "Tespit",
                required: true,
                value: order.diagnosis,
              },
            ]}
            onSave={(v) => {
              if (!v.diagnosis.trim()) return "Tespit bilgisini girin.";
              updateOrder(order.id, { diagnosis: v.diagnosis.trim() });
              announce("Tespit kaydedildi.");
            }}
          />
        </div>
        <p className="app-diagnosis-text">{order.diagnosis}</p>
      </section>

      {/* 3. Araç Kabul Bilgileri (Tek temiz bar) */}
      <div className="app-order-metrics-bar">
        <div className="app-order-metric">
          <Clock3 size={17} className="text-muted-foreground shrink-0" />
          <div>
            <span className="app-metric-label">Teslim Hedefi</span>
            <strong className="app-metric-value">{deliveryLabel(order.dueAt)}</strong>
          </div>
        </div>
        <div className="app-order-metric">
          <Gauge size={17} className="text-muted-foreground shrink-0" />
          <div>
            <span className="app-metric-label">Kabul Kilometresi</span>
            <strong className="app-metric-value">{number(order.intakeMileage)} km</strong>
          </div>
        </div>
        <div className="app-order-metric">
          <Fuel size={17} className="text-muted-foreground shrink-0" />
          <div>
            <span className="app-metric-label">Yakıt Seviyesi</span>
            <strong className="app-metric-value">%{order.fuel}</strong>
          </div>
        </div>
      </div>

      {/* 4. Akıllı Kilometre Uyarısı */}
      {order.intakeMileage < previousMileage && (
        <div className="app-compact-warning">
          <CircleAlert size={16} className="text-amber-600 shrink-0" />
          <span>
            <strong>Kilometre kontrolü gerekli:</strong> Giriş {number(order.intakeMileage)} km, önceki servis {number(previousMileage)} km. Lütfen göstergeyi teyit edin.
          </span>
        </div>
      )}

      {/* 5. Kompakt Müşteri Onayı Bloğu */}
      {pendingAmount > 0 ? (
        <div className="app-summary-approval-banner is-pending">
          <div className="app-approval-banner-info">
            <span className="app-status app-status-warning">
              <span />
              Onay Bekliyor
            </span>
            <p>
              Müşteri onayı bekleyen tutar: <strong>{money(pendingAmount)}</strong>
            </p>
          </div>
          <div className="app-approval-banner-actions">
            <RecordApproval order={order} compact />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuote(!showQuote)}
            >
              {showQuote ? "Teklifi Gizle" : `Teklif Detayı (${(order.quoteItems ?? []).length})`}
            </Button>
          </div>
        </div>
      ) : order.approval === "APPROVED" ? (
        <div className="app-summary-approval-banner is-approved">
          <div className="app-approval-banner-info">
            <span className="app-status app-status-success">
              <span />
              Onaylandı
            </span>
            <p>
              Müşteri onayı alındı ({order.approvalChannel || "Telefon"}) · Kesinleşen Tutar: <strong>{money(order.total)}</strong>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQuote(!showQuote)}
          >
            {showQuote ? "Detayı Gizle" : "Teklif Kalemleri"}
          </Button>
        </div>
      ) : null}

      {/* Açılır Teklif Kalemleri Detayı */}
      {showQuote && (
        <section className="app-summary-card app-quote-embedded">
          <div className="app-section-title">
            <h3>Teklif & Onay Kalemleri</h3>
            <QuoteItemEntry order={order} />
          </div>
          <ApprovalTab order={order} embedded />
        </section>
      )}

      {/* 6. Araç Fotoğrafları Thumbnail Grubu */}
      <section className="app-summary-card">
        <div className="app-section-title">
          <div className="app-title-group">
            <span className="app-summary-section-label">Araç Fotoğrafları</span>
            <span className="app-badge-count">
              {order.intake?.photos.length ?? 0} fotoğraf
            </span>
          </div>
          <PhotoEntry order={order} />
        </div>
        <div className="app-photo-thumbnails-strip">
          {order.intake?.photos.length ? (
            order.intake.photos.map((photo, i) => (
              <button
                key={i}
                type="button"
                className="app-photo-thumbnail-card"
                onClick={() => setSelectedPhoto(photo)}
                title={`${photo.area} - Büyüt`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.dataUrl} alt={photo.area} />
                <span className="app-photo-thumbnail-caption">{photo.area}</span>
              </button>
            ))
          ) : (
            <div className="app-photo-empty-compact">
              <ImagePlus size={20} className="text-muted-foreground" />
              <span>Henüz araç kabul veya hasar fotoğrafı eklenmedi.</span>
            </div>
          )}
        </div>
      </section>

      {/* Fotoğraf Modal Görüntüleyici */}
      <Dialog
        open={Boolean(selectedPhoto)}
        onOpenChange={(open) => !open && setSelectedPhoto(null)}
      >
        <DialogContent className="app-photo-viewer-dialog">
          <DialogTitle className="app-dialog-title">
            {selectedPhoto?.area} · {selectedPhoto?.name}
          </DialogTitle>
          {selectedPhoto && (
            <div className="app-photo-viewer-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPhoto.dataUrl} alt={selectedPhoto.area} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. Araç Kabul Kontrol Kaydı */}
      {order.intake && (
        <section className="app-summary-card app-order-intake-details">
          <div className="app-section-title">
            <span className="app-summary-section-label">Araç Kabul Kontrol Kaydı</span>
          </div>
          <div className="app-intake-meta-grid">
            <div>
              <span>Mevcut Hasar</span>
              <strong>{order.intake.damage}</strong>
            </div>
            <div>
              <span>
                <KeyRound size={13} /> Teslim Alınan Anahtar
              </span>
              <strong>{order.intake.keyCount ?? 1} adet</strong>
            </div>
            <div>
              <span>Araçta Bırakılan Eşyalar</span>
              <strong>{order.intake.leftItems || "Belirtilmedi"}</strong>
            </div>
          </div>
          {order.intake.inspection && (
            <div className="app-inspection-summary-grid">
              {inspectionItems.map((item) => {
                const state = order.intake?.inspection?.[item.id] ?? "normal";
                return (
                  <div key={item.id} className="app-inspection-summary-chip">
                    <span>{item.label}</span>
                    <strong className={`is-${state}`}>
                      {inspectionStateLabels[state]}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
          <ul className="records-checklist-summary">
            {intakeChecklist.map((item) => (
              <li key={item.id}>
                <span>{item.label}</span>
                <strong>
                  {
                    { yes: "Evet", no: "Hayır", na: "Uygulanamaz" }[
                      order.intake!.checklist[item.id]
                    ]
                  }
                </strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function GeneralTab({ order }: { order: WorkOrder }) {
  return <SummaryTab order={order} />;
}

export function LaborTab({ order }: { order: WorkOrder }) {
  const { technicianFor } = useDemo();
  const tech = technicianFor(order.technicianId);

  return (
    <div className="app-labor-tab">
      <div className="app-tab-heading">
        <div>
          <h2>Yapılacak İşlemler</h2>
          <p>İş emrinin onaylanan ve devam eden operasyon adımları.</p>
        </div>
        <LaborEntry order={order} />
      </div>

      <div className="app-labor-checklist">
        {order.labor.map((line, index) => {
          let state: "done" | "in_progress" | "pending" = "pending";
          if (["READY", "DELIVERED", "QUALITY_CONTROL"].includes(order.status)) {
            state = "done";
          } else if (order.status === "IN_PROGRESS") {
            state = index === 0 ? "done" : index === 1 ? "in_progress" : "pending";
          } else if (order.status === "WAITING_PARTS") {
            state = index === 0 ? "in_progress" : "pending";
          }

          return (
            <div key={line.id} className={`app-labor-checklist-item is-${state}`}>
              <div className="app-labor-checklist-icon">
                {state === "done" ? (
                  <span className="app-labor-dot-done">
                    <Check size={14} />
                  </span>
                ) : state === "in_progress" ? (
                  <span className="app-labor-dot-progress" />
                ) : (
                  <span className="app-labor-dot-pending" />
                )}
              </div>
              <div className="app-labor-checklist-body">
                <strong className="app-labor-name">{line.name}</strong>
                <div className="app-labor-meta">
                  <span>{tech.name} (Sorumlu Usta)</span>
                  <span className="app-meta-sep">·</span>
                  <span className={`app-labor-status-pill is-${state}`}>
                    {state === "done"
                      ? "Tamamlandı"
                      : state === "in_progress"
                        ? "Devam Ediyor"
                        : "Henüz Başlamadı"}
                  </span>
                </div>
              </div>
              <div className="app-labor-amount">
                {money(line.amount)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="app-tab-total">
        <span>İşçilik Toplamı</span>
        <strong>
          {money(order.labor.reduce((sum, line) => sum + line.amount, 0))}
        </strong>
      </div>
    </div>
  );
}

export function PartsTab({ order }: { order: WorkOrder }) {
  const { vehicleFor, updatePartRequestStatus } = useDemo();
  const vehicle = vehicleFor(order);
  const requests = order.partRequests ?? [];

  return (
    <div className="app-parts-tab">
      <div className="app-tab-heading">
        <div>
          <h2>Parça Kullanımı & Talepler</h2>
          <p>Ayrılan/kullanılan parçalar ve atölye parça talepleri.</p>
        </div>
        <div className="app-tab-actions-group">
          <PartRequestEntry order={order} />
          <PartEntry order={order} />
        </div>
      </div>

      {requests.length > 0 && (
        <section className="app-part-requests-section">
          <div className="app-section-title">
            <h3>Parça Talepleri ({vehicle.plate})</h3>
            <span className="app-badge-count">{requests.length} talep</span>
          </div>
          <div className="app-part-request-list">
            {requests.map((req) => {
              const statusMeta = partRequestStatuses[req.status];
              return (
                <article key={req.id} className="app-part-request-card">
                  <div>
                    <strong>
                      {req.partName} · {req.quantity} adet
                    </strong>
                    <span>
                      {vehicle.plate} (#{order.id}) · Talep eden:{" "}
                      {req.requestedBy} ({req.requestedAt})
                      {req.note ? ` · ${req.note}` : ""}
                    </span>
                  </div>
                  <div className="app-part-request-actions">
                    <span
                      className={`app-status app-status-${statusMeta.tone}`}
                    >
                      <span />
                      {statusMeta.label}
                    </span>
                    <div className="app-inline-pills">
                      {(
                        [
                          "REQUESTED",
                          "PREPARING",
                          "DELIVERED",
                          "CANCELLED",
                        ] as PartRequestStatus[]
                      ).map((st) => (
                        <button
                          key={st}
                          type="button"
                          className={`module-pill-btn ${req.status === st ? "is-active" : ""}`}
                          onClick={() =>
                            updatePartRequestStatus(order.id, req.id, st)
                          }
                        >
                          {partRequestStatuses[st].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {order.parts.length ? (
        <div className="app-part-lines">
          {order.parts.map((part) => (
            <article key={part.id}>
              <span className="app-car-tile">
                <Package size={20} />
              </span>
              <div className="app-part-name">
                <h3>{part.name}</h3>
                <span>{part.quantity} adet</span>
              </div>
              <div>
                <span>Satış</span>
                <strong>{money(part.price)}</strong>
              </div>
              <div>
                <span>Tarihsel maliyet</span>
                <strong>
                  {part.state === "CONSUMED"
                    ? money(part.historicCost)
                    : "Tüketimde hesaplanır"}
                </strong>
              </div>
              <span
                className={`app-status app-status-${part.state === "CONSUMED" ? "success" : "info"}`}
              >
                <span />
                {part.state === "CONSUMED" ? "Kullanıldı" : "İş İçin Ayrıldı"}
              </span>
              <ConsumePart order={order} partId={part.id} />
            </article>
          ))}
        </div>
      ) : (
        <div className="app-empty-state">
          <Package size={28} />
          <h3>Parça kaydı yok.</h3>
          <p>
            Parça Ekle ile stoktan parça ayırabilir veya Parça Talebi
            oluşturabilirsiniz.
          </p>
        </div>
      )}
      <p className="app-tab-footnote">
        Tarihsel maliyet tüketim anını temsil eder. Rezervasyon gerçek stok
        tüketimi değildir.
      </p>
    </div>
  );
}

export function HistoryTab({ order }: { order: WorkOrder }) {
  const { addNote, technicianFor } = useDemo();
  const tech = technicianFor(order.technicianId);
  const [noteText, setNoteText] = useState("");
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [showFullNotes, setShowFullNotes] = useState(false);

  function handleSendNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    addNote(order.id, noteText.trim(), tech.name);
    setNoteText("");
  }

  const timelineEntries = showFullTimeline
    ? order.timeline
    : order.timeline.slice(-15);

  const visibleNotes = showFullNotes
    ? order.notes
    : order.notes.slice(-15);

  return (
    <div className="app-history-tab">
      {/* 1. Personel İç Notları (Chat Tarzı) */}
      <section className="app-summary-card app-chat-notes-section">
        <div className="app-section-title">
          <div className="app-title-group">
            <span className="app-summary-section-label">Personel İç Notları</span>
            <span className="app-internal-badge">
              <Lock size={12} /> Yalnız personel görür
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="app-badge-count">{order.notes.length} not</span>
            {order.notes.length > 15 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullNotes(!showFullNotes)}
              >
                {showFullNotes
                  ? "Son 15 Notu Göster"
                  : `Tüm Notları Gör (${order.notes.length})`}
              </Button>
            )}
          </div>
        </div>

        <div className="app-chat-notes-stream">
          {visibleNotes.length ? (
            visibleNotes.map((note) => (
              <div key={note.id} className="app-chat-note-bubble">
                <div className="app-chat-note-meta">
                  <strong className="app-chat-author">{note.author}</strong>
                  <span className="app-chat-time">
                    {note.createdAt || "Kayıtlı"}
                  </span>
                </div>
                <p className="app-chat-note-text">{note.text}</p>
              </div>
            ))
          ) : (
            <p className="app-muted text-xs">
              Bu iş emrinde henüz dahili not bulunmuyor. Usta veya danışman notlarını aşağıdan hızlıca ekleyin.
            </p>
          )}
        </div>

        <form onSubmit={handleSendNote} className="app-chat-quick-input">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={`Not yazın (${tech.name} olarak kaydedilir)...`}
            aria-label="Personel iç notu"
          />
          <Button type="submit" size="sm" disabled={!noteText.trim()}>
            <Send size={14} /> Gönder
          </Button>
        </form>
      </section>

      {/* 2. İş Emri Zaman Çizelgesi */}
      <section className="app-summary-card">
        <div className="app-section-title">
          <div className="app-title-group">
            <span className="app-summary-section-label">Zaman Çizelgesi</span>
            <History size={15} className="text-muted-foreground" />
          </div>
          {order.timeline.length > 15 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullTimeline(!showFullTimeline)}
            >
              {showFullTimeline
                ? "Son 15 Adımı Göster"
                : `Tüm Geçmişi Gör (${order.timeline.length})`}
            </Button>
          )}
        </div>
        <ol className="app-order-timeline is-compact">
          {timelineEntries.map((entry, idx) => (
            <li key={entry.id}>
              <time>{entry.time}</time>
              <span className="app-history-dot" />
              <div>
                <strong>{entry.text}</strong>
                <span>
                  Adım {String(idx + 1).padStart(2, "0")} ·{" "}
                  {entry.time === "Şimdi" ? "Güncel işlem" : "Otomatik kayıt"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export function PhotosTab({ order }: { order: WorkOrder }) {
  return (
    <>
      <div className="app-tab-heading">
        <div>
          <h2>İş Emri Fotoğrafları</h2>
          <p>Giriş, hasar ve işlem fotoğrafları için ortak alan.</p>
        </div>
        <PhotoEntry order={order} />
      </div>
      <div className="app-photo-grid">
        {order.intake?.photos.map((photo) => (
          <figure className="records-saved-photo" key={photo.area}>
            {/* Local data URLs are retained only in React state. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.dataUrl}
              alt={`${photo.area} · araç kabul fotoğrafı`}
            />
            <figcaption>
              {photo.area} · {photo.name}
            </figcaption>
          </figure>
        ))}
        {(!order.intake?.photos.length
          ? [
              "Giriş fotoğrafı",
              "Mevcut hasar",
              "İşlem sırasında",
              "İşlem sonrası",
            ]
          : []
        ).map((type) => (
          <div key={type}>
            <ImagePlus size={27} />
            <h3>{type}</h3>
            <span>Fotoğraf ekleyin</span>
          </div>
        ))}
      </div>
    </>
  );
}

function QuoteItemEntry({ order }: { order: WorkOrder }) {
  const { addQuoteItem } = useDemo();
  const { data } = useOperations();
  const branchParts = data.parts.filter((p) => p.branchId === order.branchId);
  return (
    <EntryForm
      title="Teklif Kalemi Ekle"
      description="Yapılacak işlemi, işçilik ve kullanılacak parça bilgilerini teklife ekleyin."
      trigger={
        <Button size="sm">
          <Plus size={16} /> Teklif Kalemi Ekle
        </Button>
      }
      fields={[
        {
          name: "operation",
          label: "Yapılacak İşlem",
          required: true,
          placeholder: "Örn. Ön Fren Balatası ve Disk Değişimi",
        },
        {
          name: "laborAmount",
          label: "İşçilik (₺)",
          type: "number",
          min: 0,
          step: "0.01",
          value: "1500",
          required: true,
        },
        {
          name: "stockPartId",
          label: "Stoktan Parça Seç (İsteğe bağlı)",
          options: branchParts.map((p) => ({
            value: p.id,
            label: `${p.name} · ${money(p.price)}`,
          })),
        },
        {
          name: "partName",
          label: "Kullanılacak Parça Adı",
          placeholder: "Örn. Ön Fren Balatası",
        },
        {
          name: "quantity",
          label: "Adet",
          type: "number",
          min: 1,
          step: "1",
          value: "1",
          required: true,
        },
        {
          name: "unitPrice",
          label: "Birim Fiyat (₺)",
          type: "number",
          min: 0,
          step: "0.01",
          value: "0",
          required: true,
        },
        {
          name: "note",
          label: "Teklif Notu",
          placeholder: "Örn. Orijinal ekipman parça garantili",
        },
      ]}
      onSave={(v) => {
        if (!v.operation.trim()) return "Yapılacak işlemi girin.";
        const selectedPart = branchParts.find((p) => p.id === v.stockPartId);
        const laborAmount = Number(v.laborAmount) || 0;
        const quantity = Number(v.quantity) || 1;
        const unitPrice =
          Number(v.unitPrice) > 0
            ? Number(v.unitPrice)
            : (selectedPart?.price ?? 0);
        addQuoteItem(order.id, {
          operation: v.operation.trim(),
          laborAmount,
          partId: selectedPart?.id,
          partName: v.partName.trim() || selectedPart?.name || "",
          quantity,
          unitPrice,
          note: v.note.trim(),
        });
      }}
    />
  );
}

export function ApprovalTab({
  order,
  embedded = false,
}: {
  order: WorkOrder;
  embedded?: boolean;
}) {
  const { setQuoteStatus, toggleQuoteItemStatus } = useDemo();
  const quoteStatus = effectiveQuoteStatus(order);
  const statusMeta = quoteStatusMeta[quoteStatus];
  const pendingAmount = pendingApprovalAmount(order);
  const quoteItems = order.quoteItems ?? [];

  return (
    <div className={embedded ? "app-quote-embedded-inner" : ""}>
      {!embedded && (
        <div className="app-tab-heading">
          <div>
            <h2>Teklif & Müşteri Onayı</h2>
            <p>
              Onaylanmamış teklif kalemleri tamamlanmış iş hesabına dahil edilmez.
            </p>
          </div>
          <div className="app-tab-actions-group">
            <span className="app-revision">
              Revizyon {Math.max(1, order.quoteRevision)}
            </span>
            <QuoteItemEntry order={order} />
          </div>
        </div>
      )}

      <div className="app-quote-summary-grid">
        <div className="app-quote-summary">
          <FileCheck2 size={24} />
          <div>
            <span>Onaylanan / Kesinleşen Tutar</span>
            <strong>{money(order.total)}</strong>
          </div>
          <span className={`app-status app-status-${statusMeta.tone}`}>
            <span />
            {statusMeta.label}
          </span>
        </div>
        <div
          className={`app-quote-pending-box ${pendingAmount > 0 ? "has-pending" : ""}`}
        >
          <span>Müşteri Onayı Bekleyen Tutar</span>
          <strong>{money(pendingAmount)}</strong>
          <small>
            {pendingAmount > 0
              ? "Müşteri onayı alındığında kesinleşen hesaba aktarılır."
              : "Onay bekleyen açık kalem yok."}
          </small>
        </div>
      </div>

      <div className="app-quote-status-bar">
        <span>Teklif Durumu:</span>
        <div className="app-inline-pills">
          {(
            [
              "DRAFT",
              "PENDING_APPROVAL",
              "APPROVED",
              "PARTIALLY_APPROVED",
              "REJECTED",
            ] as QuoteStatus[]
          ).map((st) => (
            <button
              key={st}
              type="button"
              className={`module-pill-btn ${quoteStatus === st ? "is-active" : ""}`}
              onClick={() => setQuoteStatus(order.id, st)}
            >
              {quoteStatusMeta[st].label}
            </button>
          ))}
        </div>
      </div>

      {quoteItems.length > 0 && (
        <div className="app-quote-items-table">
          <div className="app-quote-items-head">
            <span>Yapılacak İşlem & Not</span>
            <span>İşçilik</span>
            <span>Kullanılacak Parça</span>
            <span>Adet × Birim</span>
            <span>Toplam</span>
            <span>Kalem Durumu</span>
          </div>
          {quoteItems.map((item) => (
            <div key={item.id} className="app-quote-item-row">
              <div>
                <strong>{item.operation}</strong>
                {item.note && <small>{item.note}</small>}
              </div>
              <span>{money(item.laborAmount)}</span>
              <span>{item.partName || "—"}</span>
              <span>
                {item.partName || item.unitPrice > 0
                  ? `${item.quantity} × ${money(item.unitPrice)}`
                  : "—"}
              </span>
              <strong>{money(item.total)}</strong>
              <div className="app-quote-item-actions">
                <button
                  type="button"
                  className={`app-quote-mini-btn ${item.status === "APPROVED" ? "is-approved" : ""}`}
                  onClick={() =>
                    toggleQuoteItemStatus(order.id, item.id, "APPROVED")
                  }
                  title="Bu kalemi onayla"
                >
                  <Check size={14} /> Onayla
                </button>
                <button
                  type="button"
                  className={`app-quote-mini-btn ${item.status === "REJECTED" ? "is-rejected" : ""}`}
                  onClick={() =>
                    toggleQuoteItemStatus(order.id, item.id, "REJECTED")
                  }
                  title="Bu kalemi reddet"
                >
                  <X size={14} /> Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="app-quote-lines">
        {order.labor.map((line) => (
          <div key={line.id}>
            <span>{line.name} (İşçilik)</span>
            <strong>{money(line.amount)}</strong>
          </div>
        ))}
        {order.parts.map((part) => (
          <div key={part.id}>
            <span>
              {part.name} · {part.quantity} adet × {money(part.price)}
            </span>
            <strong>{money(part.price * part.quantity)}</strong>
          </div>
        ))}
      </div>

      {order.approval === "APPROVED" && pendingAmount === 0 ? (
        <dl className="app-approval-details">
          <div>
            <dt>Onay Kanalı</dt>
            <dd>{order.approvalChannel || "Telefon"} üzerinden</dd>
          </div>
          <div>
            <dt>Tarih</dt>
            <dd>
              {order.updatedLabel === "Az önce" &&
              order.timeline.some((entry) =>
                entry.text.includes("müşteri onayı kaydedildi"),
              )
                ? "Onay kaydedildi"
                : approvalExample.date}
            </dd>
          </div>
          <div>
            <dt>Kaydeden</dt>
            <dd>{approvalExample.recordedBy}</dd>
          </div>
          <div>
            <dt>Onaylanan Tutar</dt>
            <dd>{money(order.total)}</dd>
          </div>
        </dl>
      ) : (
        <div className="app-pending-approval">
          <p>
            Müşteri kararını aldıktan sonra bu revizyonun onayını tek tıkla
            kaydedin.
          </p>
          <RecordApproval order={order} />
        </div>
      )}
    </div>
  );
}

export function PaymentsTab({ order }: { order: WorkOrder }) {
  const { payments } = useDemo();
  const { data: operations } = useOperations();
  const entries = payments.filter((p) => p.orderId === order.id);
  const refunds = operations.expenses.filter(
    (e) => e.kind === "refund" && e.orderId === order.id,
  );
  const historic =
    order.paid +
    refunds.reduce((n, p) => n + p.amount, 0) -
    entries.reduce((n, p) => n + p.amount, 0);
  return (
    <>
      <div className="app-tab-heading">
        <div>
          <h2>Ödemeler</h2>
          <p>Kesinleşen hesap, tahsilat ve açık bakiye.</p>
        </div>
        <QuickActions initial="payment" orderId={order.id} outline />
      </div>
      <div className="app-payment-summary">
        <div>
          <span>Kesinleşen Hesap</span>
          <strong>{money(order.total)}</strong>
        </div>
        <div>
          <span>Tahsil Edilen</span>
          <strong>{money(order.paid)}</strong>
        </div>
        <div>
          <span>Açık Bakiye</span>
          <strong>{money(order.total - order.paid)}</strong>
        </div>
      </div>
      {historic > 0 && (
        <div className="app-payment-record">
          <ReceiptText size={20} />
          <div>
            <strong>{money(historic)}</strong>
            <span>Önceki tahsilatlar</span>
          </div>
        </div>
      )}
      {entries.map((entry) => (
        <div className="app-payment-record" key={entry.id}>
          <ReceiptText size={20} />
          <div>
            <strong>{money(entry.amount)}</strong>
            <span>Tahsilat</span>
          </div>
          <time>{dateLabel(entry.at)}</time>
          <span className="app-status app-status-success">Kaydedildi</span>
        </div>
      ))}
      {refunds.map((entry) => (
        <div className="app-payment-record" key={entry.id}>
          <ReceiptText size={20} />
          <div>
            <strong>−{money(entry.amount)}</strong>
            <span>{entry.title}</span>
          </div>
          <time>{dateLabel(entry.at)}</time>
          <span>İade</span>
        </div>
      ))}
      {!historic && !entries.length && !refunds.length && (
        <div className="app-empty-state">
          <ReceiptText size={28} />
          <h3>Tahsilat kaydı yok.</h3>
          <p>Açık bakiye {money(order.total - order.paid)}.</p>
        </div>
      )}
    </>
  );
}
