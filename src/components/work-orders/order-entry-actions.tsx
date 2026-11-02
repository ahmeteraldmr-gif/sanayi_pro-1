"use client";
import { useRef, useState, type ReactNode } from "react";
import { Camera, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/app-shell/demo-provider";
import { useOperations } from "@/components/modules/operations-store";
import { EntryForm } from "@/components/modules/module-ui";
import { readPhoto } from "@/lib/photo-file";
import { money, nowTimeLabel, type WorkOrder } from "@/lib/demo-data";
import {
  persistUseInventoryPartAction,
  persistWorkOrderLaborAction,
} from "@/app/app/actions";

export function LaborEntry({ order }: { order: WorkOrder }) {
  const demo = useDemo();
  return (
    <EntryForm
      title="İşçilik Ekle"
      fields={[
        { name: "name", label: "İşlem", required: true },
        {
          name: "amount",
          label: "Tutar (₺)",
          type: "number",
          min: 0,
          step: "0.01",
          required: true,
        },
      ]}
      onSave={(v) => {
        const amount = Number(v.amount);
        if (!Number.isFinite(amount) || amount < 0 || !v.name.trim())
          return "İşlem ve tutarı kontrol edin.";
        const prevState = {
          labor: order.labor,
          total: order.total,
          quoteRevision: order.quoteRevision,
          quoteStatus: order.quoteStatus,
          approval: order.approval,
          timeline: order.timeline,
        };
        demo.updateOrder(order.id, {
          labor: [
            ...order.labor,
            { id: crypto.randomUUID(), name: v.name.trim(), amount },
          ],
          total: Math.round((order.total + amount) * 100) / 100,
          quoteRevision: order.quoteRevision + 1,
          quoteStatus: "PENDING_APPROVAL",
          approval: "PENDING",
          timeline: [
            ...order.timeline,
            {
              id: crypto.randomUUID(),
              time: nowTimeLabel(),
              text: `İşçilik eklendi: ${v.name.trim()}`,
            },
          ],
        });
        if (!demo.isDemo) {
          void persistWorkOrderLaborAction({
            workOrderId: order.id,
            name: v.name.trim(),
            hours: 1,
            hourlyRate: amount,
          })
            .then((res) => {
              if (!res.ok) {
                demo.updateOrder(order.id, prevState);
                demo.announce(res.error);
              } else {
                demo.announce("İşçilik eklendi. Teklif revizyonu güncellendi.");
              }
            })
            .catch(() => {
              demo.updateOrder(order.id, prevState);
              demo.announce("Sunucu bağlantısı kesildi. İşçilik kaydedilemedi.");
            });
          return;
        }
        demo.announce("İşçilik eklendi. Teklif revizyonu güncellendi.");
      }}
    />
  );
}

export function PartEntry({
  order,
  trigger,
}: {
  order: WorkOrder;
  trigger?: ReactNode;
}) {
  const demo = useDemo();
  const { data, update } = useOperations();
  const parts = data.parts.filter(
    (p) =>
      p.branchId === order.branchId && !order.parts.some((x) => x.id === p.id),
  );
  return (
    <EntryForm
      title="Parça Ekle"
      trigger={trigger}
      fields={[
        {
          name: "part",
          label: "Parça / Kullanılabilir",
          required: true,
          options: parts.map((p) => ({
            value: p.id,
            label: `${p.name} · ${p.physical - p.reserved} adet · ${money(p.price)}`,
          })),
        },
        {
          name: "quantity",
          label: "Miktar",
          type: "number",
          min: 1,
          step: "1",
          value: "1",
          required: true,
        },
        {
          name: "state",
          label: "İşlem",
          required: true,
          value: "RESERVED",
          options: [
            { value: "RESERVED", label: "İş için ayır" },
            { value: "CONSUMED", label: "Kullan" },
          ],
        },
      ]}
      onSave={(v) => {
        const part = parts.find((p) => p.id === v.part);
        const quantity = Number(v.quantity);
        const consumed = v.state === "CONSUMED";
        if (
          !part ||
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > part.physical - part.reserved
        )
          return "Kullanılabilir stok miktarını kontrol edin.";
        const prevParts = data.parts;
        const prevMovements = data.movements;
        const prevOrderState = {
          parts: order.parts,
          total: order.total,
          quoteRevision: order.quoteRevision,
          quoteStatus: order.quoteStatus,
          approval: order.approval,
          timeline: order.timeline,
        };
        update((s) => ({
          ...s,
          parts: s.parts.map((p) =>
            p.id === part.id
              ? {
                  ...p,
                  physical: p.physical - (consumed ? quantity : 0),
                  reserved: p.reserved + (consumed ? 0 : quantity),
                }
              : p,
          ),
          movements: [
            {
              id: crypto.randomUUID(),
              partId: part.id,
              amount: consumed ? -quantity : 0,
              at: new Date().toISOString(),
              note: consumed
                ? `${quantity} adet kullanıldı`
                : `${quantity} adet ayrıldı`,
              orderId: order.id,
            },
            ...s.movements,
          ],
        }));
        demo.updateOrder(order.id, {
          parts: [
            ...order.parts,
            {
              id: part.id,
              name: part.name,
              quantity,
              price: part.price,
              historicCost: part.cost,
              state: consumed ? "CONSUMED" : "RESERVED",
            },
          ],
          total: Math.round((order.total + part.price * quantity) * 100) / 100,
          quoteRevision: order.quoteRevision + 1,
          quoteStatus: "PENDING_APPROVAL",
          approval: "PENDING",
          timeline: [
            ...order.timeline,
            {
              id: crypto.randomUUID(),
              time: nowTimeLabel(),
              text: consumed
                ? `Stoktan ${part.name} (${quantity} adet) kullanıldı`
                : `${part.name} (${quantity} adet) iş için ayrıldı`,
            },
          ],
        });
        if (!demo.isDemo && consumed) {
          void persistUseInventoryPartAction({
            workOrderId: order.id,
            inventoryItemId: part.id,
            quantity,
            note: `${quantity} adet kullanıldı`,
          })
            .then((res) => {
              if (!res.ok) {
                update((s) => ({ ...s, parts: prevParts, movements: prevMovements }));
                demo.updateOrder(order.id, prevOrderState);
                demo.announce(res.error);
              } else {
                demo.announce("Parça kullanıldı.");
              }
            })
            .catch(() => {
              update((s) => ({ ...s, parts: prevParts, movements: prevMovements }));
              demo.updateOrder(order.id, prevOrderState);
              demo.announce("Sunucu bağlantısı kesildi. Parça kullanımı kaydedilemedi.");
            });
          return;
        }
        demo.announce(consumed ? "Parça kullanıldı." : "Parça ayrıldı.");
      }}
    />
  );
}

export function ConsumePart({
  order,
  partId,
}: {
  order: WorkOrder;
  partId: string;
}) {
  const demo = useDemo();
  const { data, update } = useOperations();
  const line = order.parts.find((p) => p.id === partId)!;
  const part = data.parts.find((p) => p.id === partId);
  if (!part || line.state !== "RESERVED") return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (part.physical < line.quantity || part.reserved < line.quantity) {
          demo.announce("Stok miktarını kontrol edin.");
          return;
        }
        const prevParts = data.parts;
        const prevMovements = data.movements;
        const prevOrderState = {
          parts: order.parts,
          timeline: order.timeline,
        };
        update((s) => ({
          ...s,
          parts: s.parts.map((p) =>
            p.id === partId
              ? {
                  ...p,
                  physical: p.physical - line.quantity,
                  reserved: p.reserved - line.quantity,
                }
              : p,
          ),
          movements: [
            {
              id: crypto.randomUUID(),
              partId,
              amount: -line.quantity,
              at: new Date().toISOString(),
              note: "Ayrılan parça kullanıldı",
              orderId: order.id,
            },
            ...s.movements,
          ],
        }));
        demo.updateOrder(order.id, {
          parts: order.parts.map((p) =>
            p.id === partId
              ? { ...p, state: "CONSUMED", historicCost: part.cost }
              : p,
          ),
          timeline: [
            ...order.timeline,
            {
              id: crypto.randomUUID(),
              time: nowTimeLabel(),
              text: `Stoktan ${line.name} kullanıldı`,
            },
          ],
        });
        if (!demo.isDemo) {
          void persistUseInventoryPartAction({
            workOrderId: order.id,
            inventoryItemId: partId,
            quantity: line.quantity,
            note: "Ayrılan parça kullanıldı",
          })
            .then((res) => {
              if (!res.ok) {
                update((s) => ({ ...s, parts: prevParts, movements: prevMovements }));
                demo.updateOrder(order.id, prevOrderState);
                demo.announce(res.error);
              } else {
                demo.announce("Parça kullanıldı.");
              }
            })
            .catch(() => {
              update((s) => ({ ...s, parts: prevParts, movements: prevMovements }));
              demo.updateOrder(order.id, prevOrderState);
              demo.announce("Sunucu bağlantısı kesildi. Parça kullanımı kaydedilemedi.");
            });
          return;
        }
        demo.announce("Parça kullanıldı.");
      }}
    >
      Kullan
    </Button>
  );
}

export function PartRequestEntry({
  order,
  trigger,
}: {
  order: WorkOrder;
  trigger?: ReactNode;
}) {
  const demo = useDemo();
  const { data } = useOperations();
  const vehicle = demo.vehicleFor(order);
  const technician = demo.technicianFor(order.technicianId);
  const branchParts = data.parts.filter((p) => p.branchId === order.branchId);
  return (
    <EntryForm
      title="Parça Talebi Oluştur"
      description={`${vehicle.plate} · #${order.id} iş emri için depodan veya tedarikçiden parça talep edin.`}
      trigger={
        trigger ?? (
          <Button variant="outline">
            <PackagePlus size={16} /> Parça Talebi
          </Button>
        )
      }
      fields={[
        {
          name: "stockPartId",
          label: "Kayıtlı Stok Parçası (İsteğe bağlı)",
          value: branchParts[0]?.id ?? "",
          options: branchParts.map((p) => ({
            value: p.id,
            label: `${p.name} · Stok: ${p.physical - p.reserved} adet`,
          })),
        },
        {
          name: "partName",
          label: "Parça Adı (Stokta yoksa yazın)",
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
          name: "note",
          label: "Not",
          placeholder: "Örn. Sağ ve sol takım olarak",
        },
      ]}
      onSave={(v) => {
        const selectedPart = branchParts.find((p) => p.id === v.stockPartId);
        const partName = v.partName.trim() || selectedPart?.name || "";
        const quantity = Number(v.quantity);
        if (!partName) return "Stoktan bir parça seçin veya parça adını yazın.";
        if (!Number.isInteger(quantity) || quantity < 1)
          return "Geçerli bir adet girin.";
        demo.createPartRequest(order.id, {
          partId: selectedPart?.id,
          partName,
          quantity,
          requestedBy: technician.name,
          note: v.note,
        });
      }}
    />
  );
}

export function PhotoEntry({ order }: { order: WorkOrder }) {
  const demo = useDemo(),
    ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => ref.current?.click()}
      >
        <Camera size={17} />
        {busy ? "İşleniyor…" : "Fotoğraf Ekle"}
      </Button>
      <input
        hidden
        ref={ref}
        aria-label="İş emri fotoğrafı seçin"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = "";
          setError("");
          if (
            file.size > 5 * 1024 * 1024 ||
            !["image/jpeg", "image/png", "image/webp"].includes(file.type)
          ) {
            setError("JPG, PNG veya WebP seçin. En fazla 5 MB.");
            return;
          }
          if ((order.intake?.photos.length ?? 0) >= 12) {
            setError("Bir iş emrine en fazla 12 fotoğraf ekleyebilirsiniz.");
            return;
          }
          setBusy(true);
          try {
            const dataUrl = await readPhoto(file);
            demo.updateOrder(order.id, {
              intake: {
                damage: order.intake?.damage ?? "",
                keyCount: order.intake?.keyCount,
                leftItems: order.intake?.leftItems,
                inspection: order.intake?.inspection,
                checklist: order.intake?.checklist ?? {},
                photos: [
                  ...(order.intake?.photos ?? []),
                  {
                    area: `İşlem ${(order.intake?.photos.length ?? 0) + 1}`,
                    name: file.name,
                    dataUrl,
                  },
                ],
              },
              timeline: [
                ...order.timeline,
                {
                  id: crypto.randomUUID(),
                  time: nowTimeLabel(),
                  text: "İş emri fotoğrafı eklendi",
                },
              ],
            });
            demo.announce("Fotoğraf eklendi.");
          } catch {
            setError("Fotoğraf okunamadı. Başka bir dosya seçin.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {error && (
        <p className="records-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
