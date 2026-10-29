"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowRight,
  Camera,
  CarFront,
  Command,
  History,
  Search,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  branchName,
  formatPlate,
  isActive,
  normalizeSearch,
  number,
  money,
  type WorkOrder,
} from "@/lib/demo-data";
import { useOperations } from "@/components/modules/operations-store";
import { useDemo } from "@/components/app-shell/demo-provider";
import { PlateScannerModal } from "@/components/plate-reader/plate-scanner-modal";
import { QuickFlowDrawer } from "@/components/app-shell/quick-flow-drawer";

export function GlobalSearch() {
  const router = useRouter();
  const { data: operations } = useOperations();
  const { orders, branchId, customers, vehicles, customerFor, technicianFor } =
    useDemo();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPlate, setDrawerPlate] = useState("");
  const [drawerVehicleId, setDrawerVehicleId] = useState("");
  const [drawerCustomerId, setDrawerCustomerId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const navigatingRef = useRef(false);
  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);

  const normalized = open ? normalizeSearch(query) : "";
  const searchToken = /^90\d{10}$/.test(normalized)
    ? normalized.slice(2)
    : normalized;

  // Pre-index vehicle orders & balances only when the dialog is open
  const vehicleIndex = useMemo(() => {
    if (!open) return [];
    const ordersByVehicle = new Map<string, WorkOrder[]>();
    for (const order of orders) {
      const list = ordersByVehicle.get(order.vehicleId);
      if (list) list.push(order);
      else ordersByVehicle.set(order.vehicleId, [order]);
    }
    return vehicles.map((vehicle) => {
      const customer =
        customers.find((item) => item.id === vehicle.customerId) ??
        customerFor({
          customerId: vehicle.customerId,
        } as WorkOrder);
      const vehicleOrders = ordersByVehicle.get(vehicle.id) ?? [];
      const primaryOrder =
        vehicleOrders.find(
          (item) => item.branchId === branchId && isActive(item.status),
        ) ??
        vehicleOrders.find((item) => isActive(item.status)) ??
        vehicleOrders[0];
      const balance = vehicleOrders.reduce(
        (sum, item) =>
          item.status === "CANCELLED"
            ? sum
            : sum + Math.max(0, item.total - item.paid),
        0,
      );
      const latestMileage = Math.max(
        vehicle.lastService?.mileage ?? 0,
        ...vehicleOrders.map((o) => o.intakeMileage || 0),
      );
      const lastServiceDate =
        vehicle.lastService?.date ??
        (vehicleOrders[0] ? "Aktif servis" : "Kayıt yok");
      const lastOperations =
        vehicle.lastService?.title ??
        (vehicleOrders[0]?.labor.map((l) => l.name).join(", ") ||
          vehicleOrders[0]?.complaint ||
          "İlk kayıt");
      const visitCount =
        vehicleOrders.length +
        (vehicle.lastService ? 1 : 0) +
        (vehicle.id === "v1" ? 2 : 0);
      const upcomingMaintenance =
        latestMileage > 0
          ? `${number(Math.ceil((latestMileage + 10000) / 5000) * 5000)} km · Periyodik bakım`
          : "10.000 km sonra";
      const baseText = normalizeSearch(
        `${vehicle.plate}${vehicle.model}${customer.name}${customer.phone}${vehicleOrders.map((o) => o.id).join("")}`,
      );
      return {
        vehicle,
        customer,
        vehicleOrders,
        primaryOrder,
        balance,
        latestMileage,
        lastServiceDate,
        lastOperations,
        visitCount,
        upcomingMaintenance,
        baseText,
      };
    });
  }, [open, orders, vehicles, customers, customerFor, branchId]);

  const resultGroups = useMemo(() => {
    if (!open) return [];
    const out = [];
    for (const item of vehicleIndex) {
      if (searchToken && !item.baseText.includes(searchToken)) continue;
      const order = searchToken
        ? (item.vehicleOrders.find((o) =>
            normalizeSearch(o.id).includes(searchToken),
          ) ?? item.primaryOrder)
        : item.primaryOrder;
      out.push({
        vehicle: item.vehicle,
        customer: item.customer,
        order,
        balance: item.balance,
        latestMileage: item.latestMileage,
        lastServiceDate: item.lastServiceDate,
        lastOperations: item.lastOperations,
        visitCount: item.visitCount,
        upcomingMaintenance: item.upcomingMaintenance,
      });
      if (out.length >= 8) break;
    }
    return out;
  }, [open, vehicleIndex, searchToken]);

  const extraResults = useMemo(() => {
    if (!open) return [];
    const ownedCustomerIds = new Set(vehicles.map((v) => v.customerId));
    return [
      ...operations.parts
        .filter(
          (p) =>
            p.branchId === branchId &&
            normalizeSearch(p.name + p.code).includes(searchToken),
        )
        .map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: p.code,
          href: `/app/stock/${p.id}`,
          kind: "Parça",
        })),
      ...customers
        .filter(
          (c) =>
            !ownedCustomerIds.has(c.id) &&
            normalizeSearch(c.name + c.phone).includes(searchToken),
        )
        .map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: c.phone,
          href: `/app/customers/${c.id}`,
          kind: "Müşteri",
        })),
    ].slice(0, 8);
  }, [open, operations.parts, branchId, searchToken, customers, vehicles]);

  const totalResults = resultGroups.length + extraResults.length;
  const plate = open && query ? formatPlate(query) : null;

  useEffect(() => {
    function onShortcut(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        navigatingRef.current = false;
        setSelected(0);
        triggerRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);

  function choose(index: number) {
    const extra = extraResults[index - resultGroups.length];
    if (extra) {
      navigatingRef.current = true;
      setOpen(false);
      router.push(extra.href);
      return;
    }
    const group = resultGroups[index];
    if (!group) return;
    navigatingRef.current = true;
    setOpen(false);
    router.push(
      group.order && isActive(group.order.status)
        ? `/app/work-orders/${group.order.id}`
        : `/app/customers/${group.customer.id}?vehicle=${group.vehicle.id}`,
    );
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!totalResults) return;
      const next =
        (selected +
          (event.key === "ArrowDown" ? 1 : -1) +
          totalResults) %
        totalResults;
      setSelected(next);
      resultRefs.current[next]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(selected);
    }
  }

  return (
    <>
      <button
        className="app-search-trigger"
        onClick={(event) => {
          triggerRef.current = event.currentTarget;
          navigatingRef.current = false;
          setSelected(0);
          setOpen(true);
        }}
        aria-label="Global aramayı aç"
      >
        <Search size={18} aria-hidden="true" />
        <span>Plaka, müşteri, telefon, iş emri veya parça ara</span>
        <kbd>
          <Command size={12} aria-hidden="true" /> K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="app-search-dialog"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              inputRef.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (!navigatingRef.current)
                triggerRef.current?.focus({ preventScroll: true });
            }}
          >
            <DialogTitle className="sr-only">Global Arama</DialogTitle>
            <DialogDescription className="sr-only">
              Plaka, müşteri, telefon, iş emri veya parçayla arayın. Ok tuşlarıyla sonuç
              seçin, Enter ile açın, Escape ile kapatın.
            </DialogDescription>
            <div className="app-search-input-row">
              <Search size={21} aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelected(0);
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-label="Plaka, müşteri, telefon, iş emri veya parça ara"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls="global-search-results"
                aria-activedescendant={
                  resultGroups[selected]
                    ? `search-${resultGroups[selected].vehicle.id}`
                    : extraResults[selected - resultGroups.length]
                      ? `search-extra-${extraResults[selected - resultGroups.length].id}`
                      : undefined
                }
                placeholder="Plaka, müşteri, telefon, iş emri veya parça ara"
                autoComplete="off"
              />
              {query && (
                <button
                  className="app-icon-button"
                  aria-label="Aramayı temizle"
                  onClick={() => {
                    setQuery("");
                    setSelected(0);
                    inputRef.current?.focus();
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="app-search-scope">
              {query ? `${totalResults} ilişkili sonuç` : "Son kayıtlar"}
              <span>İşletme genelinde arama</span>
            </div>
            <div
              className="app-search-results"
              id="global-search-results"
              role="listbox"
              aria-label="Araç merkezli arama sonuçları"
            >
              {resultGroups.map(
                (
                  {
                    vehicle,
                    customer,
                    order,
                    balance,
                    latestMileage,
                    lastServiceDate,
                    lastOperations,
                    visitCount,
                    upcomingMaintenance,
                  },
                  index,
                ) => (
                  <div
                    key={vehicle.id}
                    ref={(node) => {
                      resultRefs.current[index] = node;
                    }}
                    id={`search-${vehicle.id}`}
                    role="option"
                    aria-selected={selected === index}
                    className={`app-search-result ${selected === index ? "is-selected" : ""}`}
                    onClick={() => choose(index)}
                  >
                    <div className="app-search-result-car">
                      <span className="app-car-tile">
                        <CarFront size={22} aria-hidden="true" />
                      </span>
                      <div>
                        <span className="app-overline">ARAÇ</span>
                        <strong>{vehicle.plate}</strong>
                        <p>
                          {vehicle.model}
                          {vehicle.year ? ` · ${vehicle.year}` : ""}
                        </p>
                      </div>
                      <ArrowRight size={18} aria-hidden="true" />
                    </div>
                    <div className="app-search-customer">
                      <span>Müşteri</span>
                      <strong>{customer.name}</strong>
                      <span>{customer.phone || "Telefon eklenmedi"}</span>
                    </div>
                    <div className="app-search-summary-grid">
                      <div>
                        <span>Kilometre</span>
                        <strong>
                          {latestMileage
                            ? `${number(latestMileage)} km`
                            : "Belirtilmedi"}
                        </strong>
                      </div>
                      <div>
                        <span>Toplam Servis Ziyareti</span>
                        <strong>{visitCount} ziyaret</strong>
                      </div>
                      <div>
                        <span>Yaklaşan Bakım</span>
                        <strong>{upcomingMaintenance}</strong>
                      </div>
                    </div>
                    <div className="app-search-linked">
                      <div>
                        {order ? (
                          <>
                            <span className="app-overline">
                              {isActive(order.status)
                                ? "AKTİF İŞ EMRİ"
                                : "SON İŞ EMRİ"}
                            </span>
                            <span className="app-search-branch">
                              {branchName(order.branchId)}
                            </span>
                            <strong>#{order.id}</strong>
                            <StatusBadge status={order.status} short />
                            <p>{technicianFor(order.technicianId).name}</p>
                          </>
                        ) : (
                          <>
                            <span className="app-overline">İŞ EMRİ</span>
                            <p>İş emri kaydı yok. Araç kaydını açın.</p>
                          </>
                        )}
                      </div>
                      <div>
                        <span className="app-overline">SON SERVİS</span>
                        <strong>
                          <History size={13} aria-hidden="true" />
                          {lastServiceDate}
                        </strong>
                        <p>{lastOperations}</p>
                        <span>
                          {latestMileage
                            ? `${number(latestMileage)} km`
                            : "Kayıt yok"}
                        </span>
                      </div>
                      <div className="ux-search-balance">
                        <span className="app-overline">AÇIK BAKİYE</span>
                        <strong>{money(balance)}</strong>
                        <p>
                          {balance > 0 ? "Tahsilat bekliyor" : "Açık bakiye yok"}
                        </p>
                      </div>
                    </div>
                    <div
                      className="app-search-quick-actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="app-search-action-btn is-highlight"
                        onClick={() => {
                          setOpen(false);
                          setDrawerPlate(vehicle.plate);
                          setDrawerVehicleId(vehicle.id);
                          setDrawerCustomerId(customer.id);
                          setDrawerOpen(true);
                        }}
                      >
                        <Zap size={13} /> Hızlı İşlem Paneli
                      </button>
                      <button
                        type="button"
                        className="app-search-action-btn"
                        onClick={() => {
                          navigatingRef.current = true;
                          setOpen(false);
                          router.push(`/app/intake?vehicle=${vehicle.id}`);
                        }}
                      >
                        Araç Kabul
                      </button>
                      <button
                        type="button"
                        className="app-search-action-btn"
                        onClick={() => {
                          navigatingRef.current = true;
                          setOpen(false);
                          router.push(
                            order && isActive(order.status)
                              ? `/app/work-orders/${order.id}`
                              : `/app/intake?vehicle=${vehicle.id}`,
                          );
                        }}
                      >
                        İş Emri Aç
                      </button>
                      <button
                        type="button"
                        className="app-search-action-btn"
                        onClick={() => {
                          navigatingRef.current = true;
                          setOpen(false);
                          router.push(`/app/calendar?vehicle=${vehicle.id}`);
                        }}
                      >
                        Randevu Oluştur
                      </button>
                      <button
                        type="button"
                        className="app-search-action-btn"
                        onClick={() => {
                          navigatingRef.current = true;
                          setOpen(false);
                          router.push(
                            `/app/customers/${customer.id}?vehicle=${vehicle.id}`,
                          );
                        }}
                      >
                        Servis Geçmişini Gör
                      </button>
                    </div>
                  </div>
                ),
              )}
              {extraResults.map((result, index) => (
                <div
                  key={result.id}
                  id={`search-extra-${result.id}`}
                  role="option"
                  aria-selected={selected === resultGroups.length + index}
                  ref={(node) => {
                    resultRefs.current[resultGroups.length + index] = node;
                  }}
                  className={`app-search-result ${selected === resultGroups.length + index ? "is-selected" : ""}`}
                  onClick={() => choose(resultGroups.length + index)}
                >
                  <span className="app-overline">{result.kind}</span>
                  <strong>{result.title}</strong>
                  <p>{result.subtitle}</p>
                  <span>Detayı aç →</span>
                </div>
              ))}
            </div>
            {!totalResults && (
              <div className="app-search-empty" role="status">
                <CarFront size={32} aria-hidden="true" />
                <h3>
                  {plate
                    ? `${plate} plakalı araç bulunamadı.`
                    : `“${query}” için sonuç bulunamadı.`}
                </h3>
                <p>Başka bir bilgiyle arayın veya yeni araç kabulü başlatın.</p>
                <Button
                  onClick={() => {
                    navigatingRef.current = true;
                    setOpen(false);
                    router.push(
                      `/app/intake${plate ? `?plate=${encodeURIComponent(plate)}` : ""}`,
                    );
                  }}
                >
                  {plate ? "Bu Plakayla Araç Kabul Başlat" : "Araç Kabul Başlat"}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            )}
            <div className="app-search-footer">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ux-scanner-trigger-btn"
                onClick={() => {
                  setOpen(false);
                  setScannerOpen(true);
                }}
              >
                <Camera size={15} /> Plaka Oku (Kamera)
              </Button>
              <span>
                ↑ ↓ seç <ArrowDownLeft size={13} aria-hidden="true" /> aç
              </span>
              <span>Esc kapat</span>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Kapat
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      {/* PLAKA OKUMA MODALI */}
      <PlateScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onPlateConfirmed={(plate) => {
          setDrawerPlate(plate);
          setDrawerVehicleId("");
          setDrawerCustomerId("");
          setDrawerOpen(true);
        }}
      />

      {/* AKILLI HIZLI İŞLEM ÇEKMECESİ */}
      <QuickFlowDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initialPlate={drawerPlate}
        initialVehicleId={drawerVehicleId}
        initialCustomerId={drawerCustomerId}
      />
    </>
  );
}
