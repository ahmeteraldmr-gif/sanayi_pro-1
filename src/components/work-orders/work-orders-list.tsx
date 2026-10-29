"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
  CalendarClock,
  CarFront,
  ChevronRight,
  Columns3,
  LayoutList,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useOperations } from "@/components/modules/operations-store";
import { useDemo } from "@/components/app-shell/demo-provider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  boardStatuses,
  branches,
  branchName,
  CURRENT_USER,
  deliveryLabel,
  isActive,
  isOverdue,
  normalizeSearch,
  statuses,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/lib/demo-data";

type QuickFilter = "all" | "mine" | "approval" | "parts" | "ready" | "late";
const quickFilters: readonly { key: QuickFilter; label: string }[] = [
  { key: "all", label: "Aktif İşler" },
  { key: "mine", label: "Bana Atananlar" },
  { key: "approval", label: "Onay Bekleyen" },
  { key: "parts", label: "Parça Bekleyen" },
  { key: "ready", label: "Hazır" },
  { key: "late", label: "Geciken" },
];
function quickMatches(order: WorkOrder, quick: QuickFilter) {
  return (
    quick === "all" ||
    (quick === "mine" && order.assigneeIds.includes(CURRENT_USER.id)) ||
    (quick === "approval" && order.status === "AWAITING_APPROVAL") ||
    (quick === "parts" && order.status === "WAITING_PARTS") ||
    (quick === "ready" && order.status === "READY") ||
    (quick === "late" && isOverdue(order))
  );
}

const isoDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Istanbul",
});

export function WorkOrdersList({
  initialQuick = "all",
}: {
  initialQuick?: QuickFilter;
}) {
  const { orders, branchId, setBranchId, vehicleFor, customerFor, technicianFor } = useDemo();
  const {data:operations}=useOperations();
  const technicians=operations.employees;
  const [view, setView] = useState<"list" | "kanban">("list");
  const [quick, setQuick] = useState<QuickFilter>(initialQuick);
  const [status, setStatus] = useState("ALL");
  const [technician, setTechnician] = useState("ALL");
  const [date, setDate] = useState("ALL");
  const [query, setQuery] = useState("");
  const [mobileColumn, setMobileColumn] =
    useState<WorkOrderStatus>("IN_PROGRESS");
  const now = new Date();
  const today = isoDateFormatter.format(now);
  const nextDay = new Date(now);
  nextDay.setDate(nextDay.getDate() + 1);
  const tomorrow = isoDateFormatter.format(nextDay);
  const queryToken = normalizeSearch(query);
  const base = useMemo(
    () => orders.filter((order) => order.branchId === branchId && isActive(order.status)),
    [orders, branchId],
  );

  const filtered = useMemo(() => {
    return base.filter((order) => {
      if (!quickMatches(order, quick)) return false;
      if (status !== "ALL" && order.status !== status) return false;
      if (technician !== "ALL" && order.technicianId !== technician) return false;
      if (date !== "ALL" && !order.dueAt.startsWith(date)) return false;
      if (queryToken) {
        const v = vehicleFor(order);
        const c = customerFor(order);
        const combined = `${order.id}${v.plate}${v.model}${c.name}`;
        if (!normalizeSearch(combined).includes(queryToken)) return false;
      }
      return true;
    });
  }, [base, quick, status, technician, date, queryToken, vehicleFor, customerFor]);

  const ordersByColumn = useMemo(() => {
    const map = new Map<WorkOrderStatus, WorkOrder[]>();
    for (const st of boardStatuses) {
      map.set(st, []);
    }
    for (const order of filtered) {
      const list = map.get(order.status);
      if (list) list.push(order);
    }
    return map;
  }, [filtered]);
  const hasFilters =
    quick !== "all" ||
    status !== "ALL" ||
    technician !== "ALL" ||
    date !== "ALL" ||
    query !== "";
  function reset() {
    setQuick("all");
    setStatus("ALL");
    setTechnician("ALL");
    setDate("ALL");
    setQuery("");
  }
  return (
    <>
      <div className="app-page-heading">
        <div>
          <p className="app-overline">GÜNLÜK OPERASYON</p>
          <h1>İş Emirleri</h1>
          <p>
            {branchName(branchId)} · {base.length} aktif iş emri
          </p>
        </div>
        <Button asChild>
          <Link href="/app/intake">
            <Plus /> Yeni İş Emri
          </Link>
        </Button>
      </div>
      <section
        className="app-panel app-orders-panel"
        aria-label="İş emri çalışma alanı"
      >
        <div className="app-orders-toolbar">
          <div
            className="app-quick-filters"
            aria-label="Hızlı iş emri filtreleri"
          >
            {quickFilters.map((item) => (
              <button
                key={item.key}
                aria-pressed={quick === item.key}
                onClick={() => setQuick(item.key)}
                className={quick === item.key ? "selected" : ""}
              >
                {item.label}
                {item.key === "all" && <span>{base.length}</span>}
              </button>
            ))}
          </div>
          <div className="app-view-toggle" aria-label="İş emirleri görünümü">
            <button
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <LayoutList size={16} />
              Liste
            </button>
            <button
              aria-pressed={view === "kanban"}
              onClick={() => setView("kanban")}
            >
              <Columns3 size={16} />
              Kanban
            </button>
          </div>
        </div>
        <div className="app-orders-filters">
          <span className="app-filter-icon">
            <SlidersHorizontal size={17} aria-hidden="true" />
          </span>
          <label>
            <span className="sr-only">İş emri durumu</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="ALL">Tüm Durumlar</option>
              {boardStatuses.map((item) => (
                <option key={item} value={item}>
                  {statuses[item].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Ana usta filtresi</span>
            <select
              value={technician}
              onChange={(event) => setTechnician(event.target.value)}
            >
              <option value="ALL">Tüm Ustalar</option>
              {technicians.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Tahmini teslim tarihi filtresi</span>
            <select
              value={date}
              onChange={(event) => setDate(event.target.value)}
            >
              <option value="ALL">Teslim Tarihi</option>
              <option value={today}>Bugün</option>
              <option value={tomorrow}>Yarın</option>
            </select>
          </label>
          <label>
            <span className="sr-only">İş emri şubesi</span>
            <select
              value={branchId}
              onChange={(event) =>
                setBranchId(
                  event.target.value === "iskenderun"
                    ? "iskenderun"
                    : "dortyol",
                )
              }
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="app-list-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="İş emirleri listesinde ara"
              placeholder="Listede ara"
            />
          </label>
        </div>
        <div className="app-filter-summary" role="status">
          <span>
            {filtered.length} iş gösteriliyor
            {hasFilters && ` · ${base.length} aktif iş içinde`}
          </span>
          {hasFilters && (
            <button onClick={reset}>
              <X size={13} aria-hidden="true" /> Filtreleri Temizle
            </button>
          )}
        </div>
        {view === "list" ? (
          <OrdersTable orders={filtered} />
        ) : (
          <div className="app-kanban-wrap">
            <label className="app-mobile-board-filter">
              Aşama
              <select
                value={mobileColumn}
                onChange={(event) =>
                  setMobileColumn(event.target.value as WorkOrderStatus)
                }
              >
                {boardStatuses.map((item) => (
                  <option key={item} value={item}>
                    {statuses[item].label} (
                    {(ordersByColumn.get(item) ?? []).length})
                  </option>
                ))}
              </select>
            </label>
            <div className="app-kanban">
              {boardStatuses.map((column) => {
                const columnOrders = ordersByColumn.get(column) ?? [];
                return (
                  <section
                    key={column}
                    className={`app-kanban-column ${mobileColumn === column ? "is-mobile-column" : ""}`}
                    aria-label={`${statuses[column].short} işleri`}
                  >
                    <h2>
                      <span
                        className={`app-column-dot app-column-${statuses[column].tone}`}
                      />
                      {statuses[column].short}
                      <span>{columnOrders.length}</span>
                    </h2>
                    {columnOrders.map((order, index) => (
                      <Link
                        href={`/app/work-orders/${order.id}`}
                        data-tour={
                          order.status === "READY"
                            ? "work-order-ready-row"
                            : index === 0
                              ? "work-order-row-first"
                              : undefined
                        }
                        className="app-kanban-card"
                        key={order.id}
                      >
                        <span className="app-kanban-car">
                          <CarFront size={18} />
                          <strong>{vehicleFor(order).plate}</strong>
                          <ChevronRight size={14} />
                        </span>
                        <p>{vehicleFor(order).model}</p>
                        <p className="app-kanban-customer">
                          {customerFor(order).name}
                        </p>
                        <div className="app-kanban-person">
                          <span className="app-avatar small">
                            {technicianFor(order.technicianId).initials}
                          </span>
                          {technicianFor(order.technicianId).name}
                        </div>
                        <div className="app-kanban-time">
                          <span>
                            Bu aşamada <strong>{order.stageDuration}</strong>
                          </span>
                          <span
                            className={isOverdue(order) ? "is-overdue" : ""}
                          >
                            Teslim <strong>{deliveryLabel(order.dueAt)}</strong>
                          </span>
                        </div>
                      </Link>
                    ))}
                    {columnOrders.length === 0 && (
                      <p className="app-kanban-empty">Bu aşamada iş yok.</p>
                    )}
                  </section>
                );
              })}
            </div>
            <p className="app-kanban-caption">
              Aşamalar durumları gösterir. Değişiklikleri iş emri detayından
              yapabilirsiniz.
            </p>
          </div>
        )}
        {!filtered.length && (
          <div className="app-empty-state">
            <Search size={28} />
            <h3>Bu filtrelere uygun iş bulunamadı.</h3>
            <p>Farklı bir durum, usta veya teslim tarihi seçebilirsiniz.</p>
            <Button variant="outline" onClick={reset}>
              Filtreleri Temizle
            </Button>
          </div>
        )}
        <div className="app-panel-footer">
          <span>Kayıtlı iş emirleri</span>
          <span>
            {filtered.length} / {base.length} aktif iş
          </span>
        </div>
      </section>
    </>
  );
}

function OrdersTable({ orders }: { orders: readonly WorkOrder[] }) {
  const router = useRouter();
  const { vehicleFor, customerFor, technicianFor } = useDemo();
  return (
    <>
      <div className="app-table-wrap">
        <table className="app-orders-table">
          <thead>
            <tr>
              <th>İş Emri</th>
              <th>Araç</th>
              <th>Müşteri</th>
              <th>Durum</th>
              <th>Ana Usta</th>
              <th>Tahmini Teslim</th>
              <th>Son Hareket</th>
              <th>
                <span className="sr-only">İşlemler</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => (
              <tr
                key={order.id}
                onClick={() => router.push(`/app/work-orders/${order.id}`)}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                data-tour={
                  order.status === "READY"
                    ? "work-order-ready-row"
                    : idx === 0
                      ? "work-order-row-first"
                      : undefined
                }
              >
                <td data-label="İş Emri">
                  <Link
                    className="app-order-id"
                    href={`/app/work-orders/${order.id}`}
                    data-tour={
                      order.status === "READY"
                        ? "work-order-ready-row"
                        : idx === 0
                          ? "work-order-row-first"
                          : undefined
                    }
                  >
                    {order.id}
                  </Link>
                </td>
                <td data-label="Araç">
                  <strong className="app-table-plate">
                    {vehicleFor(order).plate}
                  </strong>
                  <span className="app-table-subtext">
                    {vehicleFor(order).model}
                  </span>
                </td>
                <td data-label="Müşteri">{customerFor(order).name}</td>
                <td data-label="Durum">
                  <StatusBadge status={order.status} short />
                </td>
                <td data-label="Ana Usta">
                  {technicianFor(order.technicianId).name}
                </td>
                <td
                  data-label="Tahmini Teslim"
                  className={isOverdue(order) ? "is-overdue" : ""}
                >
                  <CalendarClock size={13} aria-hidden="true" />
                  {deliveryLabel(order.dueAt)}
                </td>
                <td data-label="Son Hareket" className="app-last-movement">
                  {order.updatedLabel}
                </td>
                <td className="app-row-open">
                  <Link
                    href={`/app/work-orders/${order.id}`}
                    aria-label={`${order.id} iş emrini aç`}
                  >
                    <ChevronRight size={17} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="app-mobile-orders">
        {orders.map((order, idx) => (
          <Link
            key={order.id}
            href={`/app/work-orders/${order.id}`}
            data-tour={
              order.status === "READY"
                ? "work-order-ready-row"
                : idx === 0
                  ? "work-order-row-first"
                  : undefined
            }
            className="app-mobile-order"
          >
            <div>
              <span>{order.id}</span>
              <ChevronRight size={16} />
            </div>
            <div>
              <strong>{vehicleFor(order).plate}</strong>
              <StatusBadge status={order.status} short />
            </div>
            <p>
              {vehicleFor(order).model} · {customerFor(order).name}
            </p>
            <div className="app-mobile-order-bottom">
              <span>{technicianFor(order.technicianId).name}</span>
              <span className={isOverdue(order) ? "is-overdue" : ""}>
                {deliveryLabel(order.dueAt)}
              </span>
            </div>
            <small>Son hareket: {order.updatedLabel}</small>
          </Link>
        ))}
      </div>
    </>
  );
}
