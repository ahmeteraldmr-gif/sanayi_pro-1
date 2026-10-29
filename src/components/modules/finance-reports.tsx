"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useDemo } from "@/components/app-shell/demo-provider";
import { useOperations } from "./operations-store";
import { isActive, money, statuses } from "@/lib/demo-data";
import { QuickActions } from "@/components/app-shell/quick-actions";
import { Button } from "@/components/ui/button";
import {
  EntryForm,
  ModuleHeading,
  Row,
  Rows,
  Summary,
  Tabs,
  dateLabel,
} from "./module-ui";

export function FinancePage() {
  const demo = useDemo();
  const { data, update } = useOperations();
  const [tab, setTab] = useState("Tahsilatlar");

  const orders = useMemo(
    () => demo.orders.filter((o) => o.branchId === demo.branchId && o.status !== "CANCELLED"),
    [demo.orders, demo.branchId],
  );
  const ids = useMemo(() => new Set(orders.map((o) => o.id)), [orders]);
  const payments = useMemo(
    () => demo.payments.filter((p) => ids.has(p.orderId)),
    [demo.payments, ids],
  );
  const expenses = useMemo(
    () => data.expenses.filter((e) => e.branchId === demo.branchId && e.kind === "expense"),
    [data.expenses, demo.branchId],
  );
  const refunds = useMemo(
    () => data.expenses.filter((e) => e.branchId === demo.branchId && e.kind === "refund"),
    [data.expenses, demo.branchId],
  );
  const gross = useMemo(
    () =>
      orders
        .filter((o) => o.status === "DELIVERED")
        .reduce(
          (n, o) =>
            n +
            o.total -
            o.parts
              .filter((p) => p.state === "CONSUMED")
              .reduce((a, p) => a + p.historicCost * p.quantity, 0) -
            o.additionalCosts,
          0,
        ),
    [orders],
  );
  const openBalance = useMemo(
    () => orders.reduce((n, o) => n + Math.max(0, o.total - o.paid), 0),
    [orders],
  );

  if (demo.currentUser.isTechnician) {
    return (
      <div className="module-page">
        <div className="app-empty-state" style={{ maxWidth: 540, margin: "40px auto", textAlign: "center" }}>
          <h2>Yönetici Yetkisi Gereklidir</h2>
          <p>
            Finans ve muhasebe modülü yalnızca İşletme Yöneticisi / Admin yetkisine açıktır.
            Atölye ustası hesabınızla bu alana erişim kısıtlanmıştır.
          </p>
          <Button asChild style={{ marginTop: 16 }}>
            <Link href="/app/work-orders">İş Emirlerine Git</Link>
          </Button>
        </div>
      </div>
    );
  }
  const addExpense = (
    <EntryForm
      title={tab === "İadeler" ? "İade Kaydet" : "Gider Ekle"}
      description={
        tab === "İadeler"
          ? "Tahsilatı alınmış bir iş emri için müşteri iadesi kaydedin."
          : "Şube operasyon giderini tutar ve açıklamasıyla kaydedin."
      }
      fields={
        tab === "İadeler"
          ? [
              {
                name: "order",
                label: "İş emri",
                required: true,
                options: orders
                  .filter((o) => o.paid > 0)
                  .map((o) => ({
                    value: o.id,
                    label: `${demo.vehicleFor(o).plate} · ${money(o.paid)}`,
                  })),
              },
              {
                name: "amount",
                label: "İade tutarı (₺)",
                type: "number",
                min: 0.01,
                step: "0.01",
                required: true,
              },
              { name: "title", label: "İade nedeni", required: true },
            ]
          : [
              { name: "title", label: "Gider açıklaması", required: true },
              {
                name: "amount",
                label: "Tutar (₺)",
                type: "number",
                min: 0.01,
                step: "0.01",
                required: true,
              },
            ]
      }
      onSave={(v) => {
        const amount = Number(v.amount);
        const order = orders.find((o) => o.id === v.order);
        if (!Number.isFinite(amount) || amount <= 0)
          return "Geçerli bir tutar girin.";
        if (tab === "İadeler" && (!order || amount > order.paid))
          return "İade, tahsil edilen tutarı aşamaz.";
        if (order)
          demo.updateOrder(order.id, {
            paid: Math.round((order.paid - amount) * 100) / 100,
          });
        update((s) => ({
          ...s,
          expenses: [
            {
              id: crypto.randomUUID(),
              title: v.title,
              amount,
              at: new Date().toISOString(),
              branchId: demo.branchId,
              kind: tab === "İadeler" ? "refund" : "expense",
              orderId: order?.id,
            },
            ...s.expenses,
          ],
        }));
        demo.announce(
          tab === "İadeler" ? "İade kaydedildi." : "Gider kaydedildi.",
        );
      }}
    />
  );
  return (
    <div className="module-page">
      <ModuleHeading
        overline="FİNANS & TAHSİLAT KONTROLÜ"
        title="Finans"
        subtitle="Hizmet geliri, günlük tahsilatlar, açık hesaplar ve atölye giderleri."
        action={
          <div data-tour="finance-new-expense-btn">
            {tab === "Giderler" || tab === "İadeler" ? (
              addExpense
            ) : (
              <QuickActions initial="payment" />
            )}
          </div>
        }
      />
      <div data-tour="finance-kpi-summary">
        <Summary
          items={[
          {
            label: "Bugünkü tahsilat",
            value: money(
              payments
                .filter(
                  (p) =>
                    p.at.slice(0, 10) === new Date().toISOString().slice(0, 10),
                )
                .reduce((n, p) => n + p.amount, 0),
            ),
            hint: "Bugün kasaya giren",
            tone: "success",
          },
          {
            label: "Kesinleşen hizmet geliri",
            value: money(
              orders
                .filter((o) => o.status === "DELIVERED")
                .reduce((n, o) => n + o.total, 0),
            ),
            hint: "Teslim edilen iş emirleri",
            tone: "primary",
          },
          {
            label: "Açık bakiye",
            value: money(openBalance),
            hint: `${orders.filter((o) => o.total > o.paid).length} iş emrinde tahsilat bekliyor`,
            tone: openBalance > 0 ? "warning" : "default",
          },
          {
            label: "Giderler",
            value: money(expenses.reduce((n, e) => n + e.amount, 0)),
            hint: `${expenses.length} kayıtlı gider kalemi`,
          },
        ]}
      />
      </div>
      <Tabs
        items={["Tahsilatlar", "Açık Hesaplar", "Giderler", "İadeler"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Tahsilatlar" ? (
        <Rows
          headers={["Plaka / İş emri", "Müşteri", "Tutar", "Tarih"]}
          empty={!orders.some((o) => o.paid > 0) && !payments.length}
        >
          {payments.map((p) => {
            const o = orders.find((o) => o.id === p.orderId)!;
            return (
              <Row
                key={p.id}
                href={`/app/work-orders/${o.id}?tab=payments`}
                cells={[
                  {
                    label: "Plaka / İş emri",
                    value: (
                      <>
                        <strong>{demo.vehicleFor(o).plate}</strong>
                        <small>{o.id}</small>
                      </>
                    ),
                  },
                  { label: "Müşteri", value: demo.customerFor(o).name },
                  {
                    label: "Tutar",
                    value: (
                      <strong className="module-price is-positive">
                        {money(p.amount)}
                      </strong>
                    ),
                  },
                  { label: "Tarih", value: dateLabel(p.at) },
                ]}
              />
            );
          })}
          {orders
            .filter(
              (o) =>
                o.paid +
                  refunds
                    .filter((r) => r.orderId === o.id)
                    .reduce((n, r) => n + r.amount, 0) -
                  payments
                    .filter((p) => p.orderId === o.id)
                    .reduce((n, p) => n + p.amount, 0) >
                0,
            )
            .map((o) => (
              <Row
                key={o.id}
                href={`/app/work-orders/${o.id}?tab=payments`}
                cells={[
                  {
                    label: "Plaka / İş emri",
                    value: (
                      <>
                        <strong>{demo.vehicleFor(o).plate}</strong>
                        <small>{o.id}</small>
                      </>
                    ),
                  },
                  { label: "Müşteri", value: demo.customerFor(o).name },
                  {
                    label: "Tutar",
                    value: (
                      <strong className="module-price is-positive">
                        {money(
                          o.paid +
                            refunds
                              .filter((r) => r.orderId === o.id)
                              .reduce((n, r) => n + r.amount, 0) -
                            payments
                              .filter((p) => p.orderId === o.id)
                              .reduce((n, p) => n + p.amount, 0),
                        )}
                      </strong>
                    ),
                  },
                  { label: "Tarih", value: "Önceki tahsilatlar" },
                ]}
              />
            ))}
        </Rows>
      ) : tab === "Açık Hesaplar" ? (
        <Rows
          headers={["Plaka", "Müşteri", "Açık bakiye", "İşlem"]}
          empty={!orders.some((o) => o.total > o.paid)}
        >
          {orders
            .filter((o) => o.total > o.paid)
            .map((o) => (
              <Row
                key={o.id}
                cells={[
                  {
                    label: "Plaka",
                    value: (
                      <Link href={`/app/work-orders/${o.id}`}>
                        <strong>{demo.vehicleFor(o).plate}</strong>
                        <small>{o.id}</small>
                      </Link>
                    ),
                  },
                  {
                    label: "Müşteri",
                    value: (
                      <Link href={`/app/customers/${o.customerId}`}>
                        {demo.customerFor(o).name}
                      </Link>
                    ),
                  },
                  {
                    label: "Açık bakiye",
                    value: (
                      <strong className="module-price is-warning">
                        {money(o.total - o.paid)}
                      </strong>
                    ),
                  },
                  {
                    label: "İşlem",
                    value: (
                      <QuickActions initial="payment" orderId={o.id} outline />
                    ),
                  },
                ]}
              />
            ))}
        </Rows>
      ) : (
        <Rows
          headers={["Açıklama", "Tutar", "Tarih"]}
          empty={!(tab === "Giderler" ? expenses : refunds).length}
        >
          {(tab === "Giderler" ? expenses : refunds).map((e) => (
            <Row
              key={e.id}
              cells={[
                {
                  label: "Açıklama",
                  value: e.orderId ? (
                    <Link href={`/app/work-orders/${e.orderId}`}>
                      {e.title} →
                    </Link>
                  ) : (
                    e.title
                  ),
                },
                {
                  label: "Tutar",
                  value: <strong className="module-price">{money(e.amount)}</strong>,
                },
                { label: "Tarih", value: dateLabel(e.at) },
              ]}
            />
          ))}
        </Rows>
      )}
      <p className="app-tab-footnote module-profit-banner">
        Tahmini Brüt Kazanç: <strong>{money(gross)}</strong> · Teslim edilen
        işlerin parça ve ek maliyetleri düşülür; işletme giderleri ve vergiler
        dahil değildir.
      </p>
    </div>
  );
}

const reports = [
  "Operasyon",
  "Gelir & Tahsilat",
  "Açık Bakiyeler",
  "İş Emri Kazancı",
  "Parça Kullanımı",
  "Ekip İş Yükü",
  "Müşteri Tekrar Ziyareti",
];

export function ReportsPage() {
  const demo = useDemo();
  const { data } = useOperations();
  const [tab, setTab] = useState(reports[0]);

  const orders = useMemo(
    () => demo.orders.filter((o) => o.branchId === demo.branchId && o.status !== "CANCELLED"),
    [demo.orders, demo.branchId],
  );
  const amounts = useMemo(
    () =>
      orders.reduce(
        (n, o) => ({ total: n.total + o.total, paid: n.paid + o.paid }),
        { total: 0, paid: 0 },
      ),
    [orders],
  );
  const workload = useMemo(
    () =>
      data.employees
        .filter((e) => e.branchId === demo.branchId)
        .map((e) => ({
          label: e.name,
          value: orders.filter(
            (o) => o.assigneeIds.includes(e.id) && isActive(o.status),
          ).length,
        })),
    [data.employees, demo.branchId, orders],
  );
  const chart = useMemo(
    () =>
      tab === "Ekip İş Yükü"
        ? workload
        : Object.entries(statuses)
            .filter(([key]) => key !== "CANCELLED")
            .map(([key, v]) => ({
              label: v.short,
              value: orders.filter((o) => o.status === key).length,
            })),
    [tab, workload, orders],
  );

  if (demo.currentUser.isTechnician) {
    return (
      <div className="module-page">
        <div className="app-empty-state" style={{ maxWidth: 540, margin: "40px auto", textAlign: "center" }}>
          <h2>Yönetici Yetkisi Gereklidir</h2>
          <p>
            Raporlar ve ciro analitiği modülü yalnızca İşletme Yöneticisi / Admin yetkisine açıktır.
          </p>
          <Button asChild style={{ marginTop: 16 }}>
            <Link href="/app/work-orders">İş Emirlerine Git</Link>
          </Button>
        </div>
      </div>
    );
  }
  const max = Math.max(1, ...chart.map((c) => c.value));
  return (
    <div className="module-page">
      <ModuleHeading
        overline="ANALİZ & PERFORMANS"
        title="Raporlar"
        subtitle="Seçili şubenin güncel iş emri, stok ve tahsilat kayıtlarından hesaplanan özet görünüm."
      />
      <Tabs items={reports} value={tab} onChange={setTab} />
      {tab === "Operasyon" || tab === "Ekip İş Yükü" ? (
        <>
          <Summary
            items={[
              {
                label: "Aktif iş",
                value: orders.filter((o) => isActive(o.status)).length,
                hint: "Serviste işlem gören araçlar",
                tone: "primary",
              },
              {
                label: "Tamamlanan",
                value: orders.filter((o) => o.status === "DELIVERED").length,
                hint: "Teslim edilen iş emirleri",
                tone: "success",
              },
              {
                label: "Toplam iş",
                value: orders.length,
                hint: "İptal edilmeyen tüm kayıtlar",
              },
            ]}
          />
          <section className="app-panel module-section">
            <h2>
              {tab === "Operasyon" ? "İşlerin durumu" : "Aktif iş dağılımı"}
            </h2>
            <div className="module-chart">
              {chart.map((c) => (
                <div className="module-chart-row" key={c.label}>
                  <span>{c.label}</span>
                  <div className="module-chart-track">
                    <i style={{ width: `${(c.value / max) * 100}%` }} />
                  </div>
                  <strong>{c.value} iş</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : tab === "Gelir & Tahsilat" ? (
        <>
          <Summary
            items={[
              {
                label: "İş emri toplamı",
                value: money(amounts.total),
                hint: "Faturalanan / teklif edilen toplam",
                tone: "primary",
              },
              {
                label: "Tahsil edilen",
                value: money(amounts.paid),
                hint: "Alınan ödemeler toplamı",
                tone: "success",
              },
              {
                label: "Açık bakiye",
                value: money(amounts.total - amounts.paid),
                hint: "Tahsilat bekleyen tutar",
                tone: amounts.total - amounts.paid > 0 ? "warning" : "default",
              },
            ]}
          />
          <Rows headers={["Plaka", "Hesap", "Tahsilat", "Bakiye"]}>
            {orders.map((o) => (
              <Row
                key={o.id}
                href={`/app/work-orders/${o.id}`}
                cells={[
                  { label: "Plaka", value: demo.vehicleFor(o).plate },
                  { label: "Hesap", value: money(o.total) },
                  { label: "Tahsilat", value: money(o.paid) },
                  { label: "Bakiye", value: money(o.total - o.paid) },
                ]}
              />
            ))}
          </Rows>
        </>
      ) : tab === "Açık Bakiyeler" ? (
        <Rows
          headers={["Müşteri", "Plaka", "Bakiye"]}
          empty={!orders.some((o) => o.total > o.paid)}
        >
          {orders
            .filter((o) => o.total > o.paid)
            .map((o) => (
              <Row
                key={o.id}
                href={`/app/customers/${o.customerId}`}
                cells={[
                  { label: "Müşteri", value: demo.customerFor(o).name },
                  { label: "Plaka", value: demo.vehicleFor(o).plate },
                  { label: "Bakiye", value: money(o.total - o.paid) },
                ]}
              />
            ))}
        </Rows>
      ) : tab === "İş Emri Kazancı" ? (
        <>
          <p className="app-tab-footnote module-profit-banner">
            Tahmini Brüt Kazanç = iş emri toplamı − tüketilen parça maliyeti − ek
            maliyeti. İşletme giderleri ve vergiler hariçtir.
          </p>
          <Rows
            headers={[
              "Plaka",
              "Hizmet toplamı",
              "Parça / Ek maliyet",
              "Tahmini Brüt Kazanç",
            ]}
          >
            {orders.map((o) => {
              const cost =
                o.parts
                  .filter((p) => p.state === "CONSUMED")
                  .reduce((n, p) => n + p.quantity * p.historicCost, 0) +
                o.additionalCosts;
              return (
                <Row
                  key={o.id}
                  href={`/app/work-orders/${o.id}`}
                  cells={[
                    { label: "Plaka", value: demo.vehicleFor(o).plate },
                    { label: "Hizmet toplamı", value: money(o.total) },
                    { label: "Parça / Ek maliyet", value: money(cost) },
                    {
                      label: "Tahmini Brüt Kazanç",
                      value: (
                        <strong className="module-price is-positive">
                          {money(o.total - cost)}
                        </strong>
                      ),
                    },
                  ]}
                />
              );
            })}
          </Rows>
        </>
      ) : tab === "Parça Kullanımı" ? (
        <Rows
          headers={["Parça", "Plaka", "Miktar", "Durum"]}
          empty={!orders.some((o) => o.parts.length)}
        >
          {orders.flatMap((o) =>
            o.parts.map((p) => (
              <Row
                key={`${o.id}-${p.id}`}
                href={`/app/work-orders/${o.id}?tab=parts`}
                cells={[
                  { label: "Parça", value: p.name },
                  { label: "Plaka", value: demo.vehicleFor(o).plate },
                  { label: "Miktar", value: p.quantity },
                  {
                    label: "Durum",
                    value: (
                      <span
                        className={`module-chip ${p.state === "CONSUMED" ? "is-success" : "is-info"}`}
                      >
                        {p.state === "CONSUMED" ? "Kullanıldı" : "Ayrıldı"}
                      </span>
                    ),
                  },
                ]}
              />
            )),
          )}
        </Rows>
      ) : (
        <Rows headers={["Müşteri", "Servis ziyareti", "Araç sayısı"]}>
          {demo.customers
            .filter((c) => orders.some((o) => o.customerId === c.id))
            .map((c) => (
              <Row
                key={c.id}
                href={`/app/customers/${c.id}`}
                cells={[
                  { label: "Müşteri", value: c.name },
                  {
                    label: "Servis ziyareti",
                    value: orders.filter((o) => o.customerId === c.id).length,
                  },
                  {
                    label: "Araç sayısı",
                    value: demo.vehicles.filter((v) => v.customerId === c.id)
                      .length,
                  },
                ]}
              />
            ))}
        </Rows>
      )}
    </div>
  );
}
