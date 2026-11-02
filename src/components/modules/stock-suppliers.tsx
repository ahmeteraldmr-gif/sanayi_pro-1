"use client";

import Link from "next/link";
import { useState, useMemo, type ReactNode } from "react";
import { ArrowUpRight, Package, Phone, Truck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/app-shell/demo-provider";
import {
  money,
  partRequestStatuses,
  type PartRequestStatus,
} from "@/lib/demo-data";
import { useOperations, type StockPart } from "./operations-store";
import {
  persistAdjustInventoryStockAction,
  persistCreateInventoryItemAction,
  persistUpsertSupplierAction,
} from "@/app/app/actions";
import {
  EntryForm,
  Filter,
  Missing,
  ModuleHeading,
  Row,
  Rows,
  Summary,
  dateLabel,
  getInitials,
  type Field,
} from "./module-ui";

export function StockEntry({
  partId,
  correction = false,
  trigger,
}: {
  partId?: string;
  correction?: boolean;
  trigger?: ReactNode;
}) {
  const { data, update } = useOperations();
  const demo = useDemo();
  const parts = data.parts.filter((p) => p.branchId === demo.branchId);
  return (
    <EntryForm
      title={correction ? "Stok Düzeltmesi" : "Stok Girişi"}
      description={
        correction
          ? "Sayım sonrası gerçek fiziksel stok miktarını güncelleyin."
          : "Tedarikçiden gelen yeni parça miktarını stoğa ekleyin."
      }
      trigger={
        trigger ??
        (correction ? (
          <Button variant="outline">Stok Düzeltmesi</Button>
        ) : (
          <Button variant="outline" data-tour="stock-entry-trigger">Stok Girişi</Button>
        ))
      }
      fields={[
        {
          name: "part",
          label: "Parça",
          required: true,
          value: partId,
          options: parts.map((p) => ({
            value: p.id,
            label: `${p.name} · ${p.code}`,
          })),
        },
        {
          name: "quantity",
          label: correction ? "Sayılan fiziksel stok" : "Giriş miktarı",
          type: "number",
          min: correction ? 0 : 1,
          step: "1",
          required: true,
        },
        {
          name: "note",
          label: correction ? "Düzeltme nedeni" : "Açıklama",
          required: correction,
        },
      ]}
      onSave={(v) => {
        const part = data.parts.find((p) => p.id === v.part);
        const n = Number(v.quantity);
        if (
          !part ||
          !Number.isInteger(n) ||
          n < (correction ? part.reserved : 1)
        )
          return "Miktarı kontrol edin. Fiziksel stok rezervasyondan az olamaz.";
        const prevParts = data.parts;
        const prevMovements = data.movements;
        update((s) => ({
          ...s,
          parts: s.parts.map((p) =>
            p.id === part.id
              ? { ...p, physical: correction ? n : p.physical + n }
              : p,
          ),
          movements: [
            {
              id: crypto.randomUUID(),
              partId: part.id,
              amount: correction ? n - part.physical : n,
              at: new Date().toISOString(),
              note: v.note || "Stok girişi",
            },
            ...s.movements,
          ],
        }));
        if (!demo.isDemo) {
          void persistAdjustInventoryStockAction({
            inventoryItemId: part.id,
            mode: correction ? "count" : "entry",
            quantity: n,
            note: v.note || (correction ? "Sayım düzeltmesi" : "Stok girişi"),
          })
            .then((res) => {
              if (!res.ok) {
                update((s) => ({ ...s, parts: prevParts, movements: prevMovements }));
                demo.announce(res.error);
              } else {
                demo.announce("Stok güncellendi.");
              }
            })
            .catch(() => {
              update((s) => ({ ...s, parts: prevParts, movements: prevMovements }));
              demo.announce("Sunucu bağlantısı kesildi. Stok hareketi kaydedilemedi.");
            });
          return;
        }
        demo.announce("Stok güncellendi.");
      }}
    />
  );
}

function partCells(p: StockPart, supplierName?: string) {
  const available = p.physical - p.reserved;
  const isCritical = available < p.minimum;
  return [
    {
      label: "Parça",
      value: (
        <div className="module-entity">
          <span className="module-avatar is-subtle">
            <Package size={16} />
          </span>
          <div>
            <strong>{p.name}</strong>
            {supplierName && <small>{supplierName}</small>}
          </div>
        </div>
      ),
    },
    {
      label: "Kod / OEM",
      value: <span className="module-code-badge">{p.code}</span>,
    },
    { label: "Fiziksel", value: <strong>{p.physical}</strong> },
    {
      label: "Rezerve",
      value: p.reserved > 0 ? <span className="module-chip">{p.reserved}</span> : "0",
    },
    {
      label: "Kullanılabilir",
      value: (
        <strong className={isCritical ? "is-overdue" : ""}>{available}</strong>
      ),
    },
    { label: "Minimum", value: p.minimum },
    {
      label: "Durum",
      value: (
        <span
          className={`module-chip ${isCritical ? "is-warning" : "is-success"}`}
        >
          {isCritical ? "Kritik" : "Yeterli"}
        </span>
      ),
    },
    {
      label: "Satış fiyatı",
      value: <strong className="module-price">{money(p.price)}</strong>,
    },
  ];
}

export function StockPage({
  id,
  initialTab = "parts",
}: {
  id?: string;
  initialTab?: "parts" | "movements" | "suppliers";
}) {
  const { data, update } = useOperations();
  const demo = useDemo();
  const [activeTab, setActiveTab] = useState<
    "parts" | "movements" | "suppliers"
  >(initialTab);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<
    "all" | "critical" | "reserved"
  >("all");
  const { branchParts, partsById, branchPartIdSet, criticalCount, totalAvailable, totalReserved } = useMemo(() => {
    const bp = data.parts.filter((p) => p.branchId === demo.branchId);
    const map = new Map<string, StockPart>();
    const idSet = new Set<string>();
    let crit = 0;
    let avail = 0;
    let res = 0;
    for (const p of bp) {
      map.set(p.id, p);
      idSet.add(p.id);
      if (p.physical - p.reserved < p.minimum) crit++;
      avail += Math.max(0, p.physical - p.reserved);
      res += p.reserved;
    }
    return {
      branchParts: bp,
      partsById: map,
      branchPartIdSet: idSet,
      criticalCount: crit,
      totalAvailable: avail,
      totalReserved: res,
    };
  }, [data.parts, demo.branchId]);

  const part = id ? partsById.get(id) : undefined;

  const list = useMemo(() => {
    const q = query.toLocaleLowerCase("tr").trim();
    return branchParts.filter((p) => {
      if (q && !`${p.name} ${p.code}`.toLocaleLowerCase("tr").includes(q)) {
        return false;
      }
      if (stockFilter === "critical") return p.physical - p.reserved < p.minimum;
      if (stockFilter === "reserved") return p.reserved > 0;
      return true;
    });
  }, [branchParts, query, stockFilter]);

  const branchMovements = useMemo(
    () => data.movements.filter((m) => branchPartIdSet.has(m.partId)),
    [data.movements, branchPartIdSet],
  );

  const filteredMovements = useMemo(() => {
    const q = query.toLocaleLowerCase("tr").trim();
    if (!q) return branchMovements;
    return branchMovements.filter((m) => {
      const p = partsById.get(m.partId);
      return `${p?.name ?? ""} ${p?.code ?? ""} ${m.note ?? ""} ${m.orderId ?? ""}`
        .toLocaleLowerCase("tr")
        .includes(q);
    });
  }, [branchMovements, partsById, query]);

  const fields: Field[] = [
    { name: "name", label: "Parça adı", required: true },
    { name: "code", label: "Kod / OEM", required: true },
    {
      name: "physical",
      label: "Başlangıç stoğu",
      type: "number",
      min: 0,
      step: "1",
      required: true,
    },
    {
      name: "minimum",
      label: "Minimum",
      type: "number",
      min: 0,
      step: "1",
      required: true,
      value: data.settings.minimum,
    },
    {
      name: "price",
      label: "Satış fiyatı (₺)",
      type: "number",
      min: 0,
      step: "0.01",
      required: true,
    },
    {
      name: "cost",
      label: "Alış maliyeti (₺)",
      type: "number",
      min: 0,
      step: "0.01",
      required: true,
    },
    {
      name: "supplierId",
      label: "Tedarikçi",
      required: true,
      options: data.suppliers.map((s) => ({ value: s.id, label: s.name })),
    },
  ];
  if (id && !part) return <Missing back="/app/stock" />;
  return (
    <div className="module-page">
      <ModuleHeading
        overline="STOK, HAREKET & TEDARİK"
        title={part ? part.name : "Stok & Tedarikçi"}
        subtitle={
          part
            ? `OEM / Parça Kodu: ${part.code}`
            : "Parçalar, stok hareketleri ve tedarikçiler tek modülde."
        }
        back={part ? "/app/stock" : undefined}
        action={
          part ? (
            <div className="module-actions">
              <StockEntry partId={id} />
              <StockEntry partId={id} correction />
            </div>
          ) : (
            <div className="module-actions">
              <StockEntry />
              <EntryForm
                title="Parça Ekle"
                description="Şube envanterine yeni yedek parça veya sarf malzemesi tanımlayın."
                fields={fields}
                onSave={(v) => {
                  if (!v.name.trim() || !v.code.trim())
                    return "Parça adı ve kodunu girin.";
                  if (
                    data.parts.some(
                      (p) =>
                        p.branchId === demo.branchId &&
                        p.code.toLowerCase() === v.code.trim().toLowerCase(),
                    )
                  )
                    return "Bu kod zaten kayıtlı.";
                  if (
                    !Number.isInteger(Number(v.physical)) ||
                    !Number.isInteger(Number(v.minimum))
                  )
                    return "Stok ve minimum tam sayı olmalı.";
                  const newPart: StockPart = {
                    id: crypto.randomUUID(),
                    name: v.name.trim(),
                    code: v.code.trim(),
                    physical: Number(v.physical),
                    reserved: 0,
                    minimum: Number(v.minimum),
                    price: Number(v.price),
                    cost: Number(v.cost),
                    supplierId: v.supplierId,
                    branchId: demo.branchId,
                  };
                  const prevParts = data.parts;
                  const prevMovements = data.movements;
                  update((s) => ({
                    ...s,
                    parts: [...s.parts, newPart],
                    movements: [
                      {
                        id: crypto.randomUUID(),
                        partId: newPart.id,
                        amount: newPart.physical,
                        at: new Date().toISOString(),
                        note: "Stok açılışı",
                      },
                      ...s.movements,
                    ],
                  }));
                  if (!demo.isDemo) {
                    void persistCreateInventoryItemAction({
                      supplierId: newPart.supplierId || null,
                      sku: newPart.code,
                      name: newPart.name,
                      stockQty: newPart.physical,
                      minStockQty: newPart.minimum,
                      unitPrice: newPart.price,
                      unitCost: newPart.cost,
                    })
                      .then((res) => {
                        if (!res.ok) {
                          update((s) => ({
                            ...s,
                            parts: prevParts,
                            movements: prevMovements,
                          }));
                          demo.announce(res.error);
                        } else {
                          demo.announce("Parça kaydedildi.");
                        }
                      })
                      .catch(() => {
                        update((s) => ({
                          ...s,
                          parts: prevParts,
                          movements: prevMovements,
                        }));
                        demo.announce(
                          "Sunucu bağlantısı kesildi. Parça kaydedilemedi.",
                        );
                      });
                    return;
                  }
                  demo.announce("Parça kaydedildi.");
                }}
              />
            </div>
          )
        }
      />
      {part ? (
        <>
          <Summary
            items={[
              {
                label: "Fiziksel",
                value: part.physical,
                hint: "Raftaki toplam adet",
                tone: "primary",
              },
              {
                label: "Rezerve",
                value: part.reserved,
                hint: "Açık işlere ayrılan",
              },
              {
                label: "Kullanılabilir",
                value: part.physical - part.reserved,
                hint: `Minimum eşik: ${part.minimum}`,
                tone:
                  part.physical - part.reserved < part.minimum
                    ? "warning"
                    : "success",
              },
              {
                label: "Satış fiyatı",
                value: money(part.price),
                hint: `Alış maliyeti: ${money(part.cost)}`,
              },
            ]}
          />
          <section className="app-panel module-section">
            <h2>Tedarikçi</h2>
            <Link
              className="module-supplier-card-link"
              href={`/app/suppliers/${part.supplierId}`}
            >
              <span className="module-avatar">
                {getInitials(
                  data.suppliers.find((s) => s.id === part.supplierId)?.name ||
                    "TD",
                )}
              </span>
              <div>
                <strong>
                  {data.suppliers.find((s) => s.id === part.supplierId)?.name}
                </strong>
                <small>Tedarikçi detayını ve bağlı parçaları görüntüle</small>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          </section>
          <section className="module-subblock">
            <h2 className="module-subheading">Rezervasyonlar</h2>
            <Rows headers={["İş emri", "Miktar"]} empty={part.reserved === 0}>
              {demo.orders
                .filter((o) =>
                  o.parts.some(
                    (p) => p.id === part.id && p.state === "RESERVED",
                  ),
                )
                .map((o) => (
                  <Row
                    key={o.id}
                    href={`/app/work-orders/${o.id}`}
                    cells={[
                      {
                        label: "İş emri",
                        value: `${demo.vehicleFor(o).plate} · ${o.id}`,
                      },
                      {
                        label: "Miktar",
                        value: o.parts
                          .filter(
                            (p) => p.id === part.id && p.state === "RESERVED",
                          )
                          .reduce((n, p) => n + p.quantity, 0),
                      },
                    ]}
                  />
                ))}
              {part.reserved >
                demo.orders.reduce(
                  (n, o) =>
                    n +
                    o.parts
                      .filter((p) => p.id === part.id && p.state === "RESERVED")
                      .reduce((a, p) => a + p.quantity, 0),
                  0,
                ) && (
                <Row
                  cells={[
                    { label: "İş emri", value: "Şube rezervasyonu" },
                    {
                      label: "Miktar",
                      value:
                        part.reserved -
                        demo.orders.reduce(
                          (n, o) =>
                            n +
                            o.parts
                              .filter(
                                (p) =>
                                  p.id === part.id && p.state === "RESERVED",
                              )
                              .reduce((a, p) => a + p.quantity, 0),
                          0,
                        ),
                    },
                  ]}
                />
              )}
            </Rows>
          </section>
          <section className="module-subblock">
            <h2 className="module-subheading">Hareket geçmişi</h2>
            <Rows
              headers={["Tarih", "Miktar", "Açıklama"]}
              empty={!data.movements.some((m) => m.partId === part.id)}
            >
              {data.movements
                .filter((m) => m.partId === part.id)
                .map((m) => (
                  <Row
                    key={m.id}
                    cells={[
                      { label: "Tarih", value: dateLabel(m.at) },
                      {
                        label: "Miktar",
                        value: (
                          <span
                            className={`module-chip ${m.amount > 0 ? "is-success" : "is-warning"}`}
                          >
                            {m.amount > 0 ? `+${m.amount}` : m.amount}
                          </span>
                        ),
                      },
                      {
                        label: "Açıklama",
                        value: m.orderId ? (
                          <Link href={`/app/work-orders/${m.orderId}`}>
                            {m.note} → {m.orderId}
                          </Link>
                        ) : (
                          m.note
                        ),
                      },
                    ]}
                  />
                ))}
            </Rows>
          </section>
        </>
      ) : (
        <>
          <div className="ux-stock-tabs-strip" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "parts"}
              className={activeTab === "parts" ? "is-active" : ""}
              onClick={() => setActiveTab("parts")}
            >
              Parçalar ({branchParts.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "movements"}
              className={activeTab === "movements" ? "is-active" : ""}
              onClick={() => setActiveTab("movements")}
            >
              Stok Hareketleri ({branchMovements.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "suppliers"}
              data-tour="nav-suppliers-tab"
              className={activeTab === "suppliers" ? "is-active" : ""}
              onClick={() => setActiveTab("suppliers")}
            >
              Tedarikçiler ({data.suppliers.length})
            </button>
          </div>

          {activeTab === "parts" && (
            <>
              <Summary
                items={[
                  {
                    label: "Parça çeşidi",
                    value: branchParts.length,
                    hint: "Şube envanterinde kayıtlı",
                    tone: "primary",
                  },
                  {
                    label: "Kullanılabilir stok",
                    value: totalAvailable,
                    hint: "Serviste hemen kullanılabilir",
                    tone: "success",
                  },
                  {
                    label: "Rezerve parça",
                    value: totalReserved,
                    hint: "Açık iş emirlerine ayrılan",
                  },
                  {
                    label: "Kritik stok",
                    value: criticalCount,
                    hint:
                      criticalCount > 0
                        ? "Minimum seviyenin altında"
                        : "Kritik eksik yok",
                    tone: criticalCount > 0 ? "warning" : "default",
                  },
                ]}
              />
              {demo.orders.some(
                (o) =>
                  o.branchId === demo.branchId &&
                  (o.partRequests?.length ?? 0) > 0,
              ) && (
                <section className="app-panel module-section app-part-requests-section">
                  <div className="app-section-title">
                    <h2>İş Emri Parça Talepleri</h2>
                    <span>Usta talepleri ve hazırlık durumu</span>
                  </div>
                  <div className="app-part-request-list">
                    {demo.orders
                      .filter(
                        (o) =>
                          o.branchId === demo.branchId &&
                          (o.partRequests?.length ?? 0) > 0,
                      )
                      .flatMap((o) =>
                        (o.partRequests ?? []).map((req) => ({
                          order: o,
                          vehicle: demo.vehicleFor(o),
                          req,
                        })),
                      )
                      .map(({ order, vehicle, req }) => {
                        const meta = partRequestStatuses[req.status];
                        return (
                          <article
                            key={req.id}
                            className="app-part-request-card"
                          >
                            <div>
                              <strong>
                                {req.partName} · {req.quantity} adet
                              </strong>
                              <span>
                                <Link
                                  href={`/app/work-orders/${order.id}?tab=parts`}
                                >
                                  {vehicle.plate} iş emri (#{order.id})
                                </Link>{" "}
                                · {req.requestedBy} ({req.requestedAt})
                                {req.note ? ` · ${req.note}` : ""}
                              </span>
                            </div>
                            <div className="app-part-request-actions">
                              <span
                                className={`app-status app-status-${meta.tone}`}
                              >
                                <span />
                                {meta.label}
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
                                      demo.updatePartRequestStatus(
                                        order.id,
                                        req.id,
                                        st,
                                      )
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
              <Filter
                value={query}
                onChange={setQuery}
                placeholder="Parça veya OEM kodu ara"
                extra={
                  <div className="module-filter-pills">
                    <button
                      type="button"
                      className={`module-pill-btn ${stockFilter === "all" ? "is-active" : ""}`}
                      onClick={() => setStockFilter("all")}
                    >
                      Tümü <span>{branchParts.length}</span>
                    </button>
                    <button
                      type="button"
                      className={`module-pill-btn ${stockFilter === "critical" ? "is-active" : ""}`}
                      onClick={() => setStockFilter("critical")}
                    >
                      Kritik Stok <span>{criticalCount}</span>
                    </button>
                    <button
                      type="button"
                      className={`module-pill-btn ${stockFilter === "reserved" ? "is-active" : ""}`}
                      onClick={() => setStockFilter("reserved")}
                    >
                      Rezerve Olanlar{" "}
                      <span>
                        {branchParts.filter((p) => p.reserved > 0).length}
                      </span>
                    </button>
                  </div>
                }
              />
              <Rows
                headers={[
                  "Parça",
                  "Kod / OEM",
                  "Fiziksel",
                  "Rezerve",
                  "Kullanılabilir",
                  "Minimum",
                  "Durum",
                  "Satış fiyatı",
                ]}
                empty={!list.length}
              >
                {list.map((p, idx) => (
                  <Row
                    key={p.id}
                    data-tour={idx === 0 ? "stock-item-first" : undefined}
                    href={`/app/stock/${p.id}`}
                    cells={partCells(
                      p,
                      data.suppliers.find((s) => s.id === p.supplierId)?.name,
                    )}
                  />
                ))}
              </Rows>
            </>
          )}

          {activeTab === "movements" && (
            <>
              <Summary
                items={[
                  {
                    label: "Toplam Stok Hareketi",
                    value: branchMovements.length,
                    hint: "Şube parça giriş ve çıkışları",
                    tone: "primary",
                  },
                  {
                    label: "Toplam Giriş Hareketi",
                    value: branchMovements.filter((m) => m.amount > 0).length,
                    hint: "Stoğa eklenen parçalar",
                    tone: "success",
                  },
                  {
                    label: "Toplam Kullanım / Çıkış",
                    value: branchMovements.filter((m) => m.amount < 0).length,
                    hint: "İş emirlerinde tüketilenler",
                    tone: "warning",
                  },
                ]}
              />
              <Filter
                value={query}
                onChange={setQuery}
                placeholder="Parça adı, kod veya açıklama ara..."
              />
              <Rows
                headers={[
                  "Tarih",
                  "Parça / Kod",
                  "Miktar",
                  "Açıklama / Neden",
                  "İş Emri",
                ]}
                empty={!filteredMovements.length}
              >
                {filteredMovements.map((m) => {
                  const p = branchParts.find((x) => x.id === m.partId);
                  return (
                    <Row
                      key={m.id}
                      cells={[
                        { label: "Tarih", value: dateLabel(m.at) },
                        {
                          label: "Parça / Kod",
                          value: (
                            <div>
                              <strong>{p?.name ?? "Bilinmeyen Parça"}</strong>
                              {p?.code && (
                                <small className="module-code-badge">
                                  {p.code}
                                </small>
                              )}
                            </div>
                          ),
                        },
                        {
                          label: "Miktar",
                          value: (
                            <span
                              className={`module-chip ${m.amount > 0 ? "is-success" : "is-warning"}`}
                            >
                              {m.amount > 0 ? `+${m.amount}` : m.amount}
                            </span>
                          ),
                        },
                        { label: "Açıklama / Neden", value: m.note },
                        {
                          label: "İş Emri",
                          value: m.orderId ? (
                            <Link href={`/app/work-orders/${m.orderId}`}>
                              #{m.orderId} ↗
                            </Link>
                          ) : (
                            <span className="records-secondary">—</span>
                          ),
                        },
                      ]}
                    />
                  );
                })}
              </Rows>
            </>
          )}

          {activeTab === "suppliers" && <SuppliersPage />}
        </>
      )}
    </div>
  );
}

export function SuppliersPage({ id }: { id?: string }) {
  const { data, update } = useOperations();
  const demo = useDemo();
  const [query, setQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<
    "all" | "active" | "critical"
  >("all");
  const supplier = data.suppliers.find((s) => s.id === id);
  const fields: Field[] = [
    { name: "name", label: "Firma", required: true },
    { name: "contact", label: "Yetkili", required: true },
    { name: "phone", label: "Telefon", type: "tel", required: true },
    { name: "email", label: "E-posta", type: "email" },
  ];
  if (id && !supplier) return <Missing back="/app/stock?tab=suppliers" />;

  const branchParts = data.parts.filter((p) => p.branchId === demo.branchId);
  const activeSuppliersCount = data.suppliers.filter((s) =>
    branchParts.some((p) => p.supplierId === s.id),
  ).length;

  const branchPartIds = new Set(branchParts.map((p) => p.id));
  const latestMovement = data.movements
    .filter((m) => branchPartIds.has(m.partId))
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  const latestPart = latestMovement
    ? branchParts.find((p) => p.id === latestMovement.partId)
    : undefined;
  const latestSupplier = latestPart
    ? data.suppliers.find((s) => s.id === latestPart.supplierId)
    : data.suppliers[0];

  const list = data.suppliers.filter((s) => {
    const matchesQuery = `${s.name} ${s.contact} ${s.phone}`
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr"));
    if (!matchesQuery) return false;
    const sParts = branchParts.filter((p) => p.supplierId === s.id);
    if (supplierFilter === "active") return sParts.length > 0;
    if (supplierFilter === "critical")
      return sParts.some((p) => p.physical - p.reserved < p.minimum);
    return true;
  });

  const supplierParts = supplier
    ? branchParts.filter((p) => p.supplierId === supplier.id)
    : [];

  return (
    <div className="module-page">
      <ModuleHeading
        overline="TEDARİK & PARÇA AĞI"
        title={supplier ? supplier.name : "Tedarikçiler"}
        subtitle={
          supplier
            ? `${supplier.contact} · Kurumsal parça tedarikçisi ve stok bağlantıları.`
            : "Parça tedarikçileri, iletişim yetkilileri ve şube bazlı tedarik edilen parça dağılımı."
        }
        back={supplier ? "/app/stock?tab=suppliers" : undefined}
        action={
          <EntryForm
            title={supplier ? "Tedarikçiyi Düzenle" : "Tedarikçi Ekle"}
            description="Tedarikçi firma bilgilerini ve iletişim yetkilisini kaydedin."
            fields={fields.map((f) => ({
              ...f,
              value: supplier?.[f.name as keyof typeof supplier],
            }))}
            onSave={(v) => {
              if (v.name.trim().length < 2)
                return "Firma adını kontrol edin.";
              const entry = {
                id: supplier?.id ?? crypto.randomUUID(),
                name: v.name.trim(),
                contact: v.contact,
                phone: v.phone,
                email: v.email,
              };
              const prevSuppliers = data.suppliers;
              update((s) => ({
                ...s,
                suppliers: supplier
                  ? s.suppliers.map((x) => (x.id === id ? entry : x))
                  : [...s.suppliers, entry],
              }));
              if (!demo.isDemo) {
                void persistUpsertSupplierAction({
                  id: entry.id,
                  name: entry.name,
                  contactName: entry.contact,
                  phone: entry.phone,
                  email: entry.email,
                })
                  .then((res) => {
                    if (!res.ok) {
                      update((s) => ({ ...s, suppliers: prevSuppliers }));
                      demo.announce(res.error);
                    } else {
                      demo.announce("Tedarikçi kaydedildi.");
                    }
                  })
                  .catch(() => {
                    update((s) => ({ ...s, suppliers: prevSuppliers }));
                    demo.announce(
                      "Sunucu bağlantısı kesildi. Tedarikçi kaydedilemedi.",
                    );
                  });
                return;
              }
              demo.announce("Tedarikçi kaydedildi.");
            }}
          />
        }
      />
      {supplier ? (
        <>
          <Summary
            items={[
              {
                label: "Yetkili",
                value: supplier.contact,
                hint: "Birincil iletişim kişisi",
                tone: "primary",
              },
              {
                label: "Telefon",
                value: <a href={`tel:${supplier.phone}`}>{supplier.phone}</a>,
                hint: "Doğrudan sipariş hattı",
              },
              {
                label: "E-posta",
                value: supplier.email || "—",
                hint: "Fatura & teklif adresi",
              },
              {
                label: "Bağlı Parça Çeşidi",
                value: supplierParts.length,
                hint: "Seçili şubedeki aktif kalemler",
                tone: "success",
              },
            ]}
          />
          <Rows
            headers={[
              "Parça",
              "Kod / OEM",
              "Fiziksel Stok",
              "Kullanılabilir",
              "Durum",
              "Satış Fiyatı",
            ]}
            empty={!supplierParts.length}
          >
            {supplierParts.map((p) => {
              const avail = p.physical - p.reserved;
              const isCrit = avail < p.minimum;
              return (
                <Row
                  key={p.id}
                  href={`/app/stock/${p.id}`}
                  cells={[
                    {
                      label: "Parça",
                      value: (
                        <div className="module-entity">
                          <span className="module-avatar is-subtle">
                            <Package size={16} />
                          </span>
                          <div>
                            <strong>{p.name}</strong>
                            <small>Minimum stok: {p.minimum}</small>
                          </div>
                        </div>
                      ),
                    },
                    {
                      label: "Kod / OEM",
                      value: <span className="module-code-badge">{p.code}</span>,
                    },
                    { label: "Fiziksel Stok", value: p.physical },
                    {
                      label: "Kullanılabilir",
                      value: <strong>{avail}</strong>,
                    },
                    {
                      label: "Durum",
                      value: (
                        <span
                          className={`module-chip ${isCrit ? "is-warning" : "is-success"}`}
                        >
                          {isCrit ? "Kritik Stok" : "Yeterli"}
                        </span>
                      ),
                    },
                    {
                      label: "Satış Fiyatı",
                      value: <strong className="module-price">{money(p.price)}</strong>,
                    },
                  ]}
                />
              );
            })}
          </Rows>
        </>
      ) : (
        <>
          <Summary
            items={[
              {
                label: "Toplam Tedarikçi",
                value: data.suppliers.length,
                hint: "Kayıtlı tedarik firması",
                tone: "primary",
              },
              {
                label: "Aktif Tedarikçi",
                value: activeSuppliersCount,
                hint: "Şube stoğuna parça sağlayan",
                tone: "success",
              },
              {
                label: "Tedarik Edilen Parça",
                value: branchParts.length,
                hint: `${branchParts.reduce((n, p) => n + p.physical, 0)} toplam fiziksel adet`,
              },
              {
                label: "Son İşlem Yapılan",
                value: latestSupplier ? latestSupplier.name : "—",
                hint: latestMovement
                  ? `${dateLabel(latestMovement.at)} · ${latestMovement.note}`
                  : "Henüz stok hareketi yok",
              },
            ]}
          />
          <Filter
            value={query}
            onChange={setQuery}
            placeholder="Firma, yetkili veya telefon ara"
            extra={
              <div className="module-filter-pills">
                <button
                  type="button"
                  className={`module-pill-btn ${supplierFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setSupplierFilter("all")}
                >
                  Tümü <span>{data.suppliers.length}</span>
                </button>
                <button
                  type="button"
                  className={`module-pill-btn ${supplierFilter === "active" ? "is-active" : ""}`}
                  onClick={() => setSupplierFilter("active")}
                >
                  Aktif Parçası Olanlar <span>{activeSuppliersCount}</span>
                </button>
                <button
                  type="button"
                  className={`module-pill-btn ${supplierFilter === "critical" ? "is-active" : ""}`}
                  onClick={() => setSupplierFilter("critical")}
                >
                  Kritik Stok Tedarikçisi{" "}
                  <span>
                    {
                      data.suppliers.filter((s) =>
                        branchParts.some(
                          (p) =>
                            p.supplierId === s.id &&
                            p.physical - p.reserved < p.minimum,
                        ),
                      ).length
                    }
                  </span>
                </button>
              </div>
            }
          />
          <Rows
            headers={[
              "Firma",
              "Yetkili",
              "Telefon",
              "Parça sayısı",
              "Son işlem",
            ]}
            empty={!list.length}
          >
            {list.map((s) => {
              const sParts = branchParts.filter((p) => p.supplierId === s.id);
              const ids = sParts.map((p) => p.id);
              const critCount = sParts.filter(
                (p) => p.physical - p.reserved < p.minimum,
              ).length;
              const last = data.movements
                .filter((m) => ids.includes(m.partId))
                .sort((a, b) => b.at.localeCompare(a.at))[0];
              return (
                <Row
                  key={s.id}
                  href={`/app/suppliers/${s.id}`}
                  cells={[
                    {
                      label: "Firma",
                      value: (
                        <div className="module-entity">
                          <span className="module-avatar">
                            {getInitials(s.name)}
                          </span>
                          <div>
                            <strong>{s.name}</strong>
                            <small>
                              {s.email || "Yedek parça & ekipman tedarikçisi"}
                            </small>
                          </div>
                        </div>
                      ),
                    },
                    {
                      label: "Yetkili",
                      value: (
                        <div className="module-contact-cell">
                          <strong>
                            <UserRound size={14} /> {s.contact}
                          </strong>
                          <small>Müşteri Temsilcisi</small>
                        </div>
                      ),
                    },
                    {
                      label: "Telefon",
                      value: (
                        <span className="module-phone-chip">
                          <Phone size={13} />
                          {s.phone}
                        </span>
                      ),
                    },
                    {
                      label: "Parça sayısı",
                      value: (
                        <div className="module-badge-group">
                          <span
                            className={`module-chip ${ids.length > 0 ? "is-info" : ""}`}
                          >
                            <Truck size={13} /> {ids.length} parça
                          </span>
                          {critCount > 0 && (
                            <span className="module-chip is-warning">
                              {critCount} kritik
                            </span>
                          )}
                        </div>
                      ),
                    },
                    {
                      label: "Son işlem",
                      value: (
                        <div className="module-row-end">
                          <span>{last ? dateLabel(last.at) : "—"}</span>
                          <span className="module-row-action">
                            Detay <ArrowUpRight size={14} />
                          </span>
                        </div>
                      ),
                    },
                  ]}
                />
              );
            })}
          </Rows>
        </>
      )}
    </div>
  );
}
