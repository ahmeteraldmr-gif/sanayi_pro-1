"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  CarFront,
  ClipboardList,
  Clock3,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { useDemo } from "@/components/app-shell/demo-provider";
import { QuickActions } from "@/components/app-shell/quick-actions";
import { PlateScannerModal } from "@/components/plate-reader/plate-scanner-modal";
import { QuickFlowDrawer } from "@/components/app-shell/quick-flow-drawer";
import { EntryForm, Summary } from "@/components/modules/module-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  deliveryLabel,
  isActive,
  money,
  normalizeSearch,
  number,
  type Customer,
  type Vehicle,
} from "@/lib/demo-data";
import { earlierMeganeVisits } from "@/lib/intake-data";

export function RecordsDirectory({
  kind = "customers",
}: {
  kind?: "customers" | "vehicles";
}) {
  void kind;
  const router = useRouter();
  const { customers, vehicles, orders } = useDemo();
  const [query, setQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPlate, setDrawerPlate] = useState("");
  const [drawerVehicleId, setDrawerVehicleId] = useState("");
  const [drawerCustomerId, setDrawerCustomerId] = useState("");

  const token = normalizeSearch(query).replace(/^90(?=\d{10}$)/, "0");

  // Build unified customer + vehicle rows
  const rows = customers
    .map((customer) => {
      const ownedVehicles = vehicles.filter(
        (vehicle) => vehicle.customerId === customer.id,
      );
      const activeVehicles = ownedVehicles.filter((v) => v.active !== false);
      const passiveVehicles = ownedVehicles.filter((v) => v.active === false);
      const customerOrders = orders.filter(
        (order) => order.customerId === customer.id,
      );
      const activeOrder = customerOrders.find((order) =>
        isActive(order.status),
      );
      const primaryVehicle =
        (activeOrder
          ? ownedVehicles.find((v) => v.id === activeOrder.vehicleId)
          : undefined) ??
        activeVehicles[0] ??
        ownedVehicles[0] ??
        null;

      const latestService =
        primaryVehicle?.lastService ??
        ownedVehicles.find((v) => v.lastService)?.lastService ??
        null;

      const searchable = normalizeSearch(
        `${customer.name}${customer.phone}${customer.email ?? ""}${ownedVehicles
          .map((v) => `${v.plate}${v.brand ?? ""}${v.model}`)
          .join("")}${customerOrders.map((o) => o.id).join("")}`,
      );

      return {
        customer,
        ownedVehicles,
        activeVehicles,
        passiveVehicles,
        primaryVehicle,
        activeOrder,
        latestService,
        searchable,
      };
    })
    .filter((row) => !token || row.searchable.includes(token));

  const activeVehiclesCount = vehicles.filter((v) => v.active !== false).length;
  const inServiceCount = customers.filter((c) =>
    orders.some((o) => o.customerId === c.id && isActive(o.status)),
  ).length;

  return (
    <>
      <div className="app-page-heading">
        <div>
          <p className="app-overline">MÜŞTERİ & ARAÇ YÖNETİMİ</p>
          <h1>Müşteri & Araçlar</h1>
          <p>
            Müşteri, telefon, plaka, son servis ve açık iş emrini tek satırda
            görün; 1–2 tıklamayla işlem başlatın.
          </p>
        </div>
        <div className="app-heading-actions">
          <Button
            type="button"
            variant="secondary"
            className="ux-scanner-trigger-btn"
            onClick={() => setScannerOpen(true)}
          >
            <Camera size={18} /> Plaka Oku
          </Button>
          <Button asChild data-tour="new-customer-trigger">
            <Link href="/app/customers/new">
              <Plus size={17} /> Yeni Müşteri & Araç
            </Link>
          </Button>
        </div>
      </div>

      <div className="records-summary-wrap">
        <Summary
          items={[
            {
              label: "Toplam Müşteri",
              value: customers.length,
              hint: "Kayıtlı araç sahipleri",
              tone: "primary",
            },
            {
              label: "Aktif Araçlar",
              value: activeVehiclesCount,
              hint: `${vehicles.length - activeVehiclesCount} önceki (pasif) araç`,
              tone: "success",
            },
            {
              label: "Şu An Serviste",
              value: inServiceCount,
              hint: "Açık iş emri devam eden",
              tone: inServiceCount > 0 ? "warning" : "default",
            },
          ]}
        />
      </div>

      <section
        className="app-panel records-directory"
        aria-label="Müşteri ve araç listesi"
      >
        <div className="records-list-toolbar">
          <label className="records-search">
            <Search size={19} />
            <span className="sr-only">
              Müşteri adı, telefon, plaka veya araç modeli ara
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Müşteri adı, telefon, plaka veya araç marka/model ara..."
            />
          </label>
          <span role="status">{rows.length} kayıt</span>
        </div>

        <div className="ux-unified-customers-table-wrap">
          <table className="ux-unified-customers-table">
            <thead>
              <tr>
                <th>Müşteri & Telefon</th>
                <th>Plaka & Araç Marka/Model</th>
                <th>Son Servis</th>
                <th>Açık İş Emri</th>
                <th>Durum</th>
                <th className="ux-unified-actions-col">Hızlı İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const {
                  customer,
                  ownedVehicles,
                  activeVehicles,
                  primaryVehicle,
                  activeOrder,
                  latestService,
                } = row;
                const detailHref = primaryVehicle
                  ? `/app/customers/${customer.id}?vehicle=${primaryVehicle.id}`
                  : `/app/customers/${customer.id}`;
                const extraVehiclesCount = Math.max(
                  0,
                  activeVehicles.length - 1,
                );
                const isMenuOpen = openMenuId === customer.id;

                return (
                  <tr key={customer.id} className="ux-unified-customer-row">
                    <td>
                      <Link
                        href={detailHref}
                        data-tour={index === 0 ? "customer-first-row" : undefined}
                        className="ux-unified-customer-link"
                      >
                        <span className="app-avatar">
                          {customer.name
                            .split(" ")
                            .map((word) => word[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <strong>{customer.name}</strong>
                          <small>{customer.phone || "Telefon eklenmedi"}</small>
                        </div>
                      </Link>
                    </td>
                    <td>
                      {primaryVehicle ? (
                        <Link
                          href={detailHref}
                          className="ux-unified-vehicle-link"
                        >
                          <div className="ux-unified-plate-line">
                            <strong className="ux-plate-chip">
                              {primaryVehicle.plate}
                            </strong>
                            {extraVehiclesCount > 0 && (
                              <span className="ux-extra-vehicle-badge">
                                +{extraVehiclesCount} aktif araç
                              </span>
                            )}
                            {ownedVehicles.some((v) => v.active === false) && (
                              <span className="ux-passive-vehicle-badge">
                                Geçmiş araç var
                              </span>
                            )}
                          </div>
                          <small>
                            {primaryVehicle.model}
                            {primaryVehicle.year
                              ? ` · ${primaryVehicle.year}`
                              : ""}
                            {primaryVehicle.mileage
                              ? ` · ${number(primaryVehicle.mileage)} km`
                              : ""}
                          </small>
                        </Link>
                      ) : (
                        <Link
                          href={detailHref}
                          className="ux-unified-vehicle-empty"
                        >
                          Araç eklenmedi · Ekle →
                        </Link>
                      )}
                    </td>
                    <td>
                      {latestService ? (
                        <div className="ux-unified-service-cell">
                          <strong>{latestService.date}</strong>
                          <small>
                            {latestService.title} ·{" "}
                            {number(latestService.mileage)} km
                          </small>
                        </div>
                      ) : (
                        <span className="records-secondary">İlk kayıt</span>
                      )}
                    </td>
                    <td>
                      {activeOrder ? (
                        <Link
                          href={`/app/work-orders/${activeOrder.id}`}
                          className="ux-unified-order-link"
                        >
                          <strong>#{activeOrder.id}</strong>
                          <small>{activeOrder.complaint}</small>
                        </Link>
                      ) : (
                        <span className="records-secondary">Açık iş yok</span>
                      )}
                    </td>
                    <td>
                      {activeOrder ? (
                        <StatusBadge status={activeOrder.status} short />
                      ) : (
                        <span className="ux-idle-status-pill">
                          Serviste Değil
                        </span>
                      )}
                    </td>
                    <td className="ux-unified-actions-cell">
                      <div className="ux-row-quick-actions">
                        <Button
                          type="button"
                          size="sm"
                          variant={activeOrder ? "secondary" : "default"}
                          className="ux-row-fast-drawer-btn"
                          onClick={() => {
                            setDrawerPlate(primaryVehicle?.plate || "");
                            setDrawerVehicleId(primaryVehicle?.id || "");
                            setDrawerCustomerId(customer.id);
                            setDrawerOpen(true);
                          }}
                        >
                          <Zap size={13} /> Hızlı İşlem
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant={activeOrder ? "default" : "secondary"}
                        >
                          <Link
                            href={
                              activeOrder
                                ? `/app/work-orders/${activeOrder.id}`
                                : primaryVehicle
                                  ? `/app/intake?vehicle=${primaryVehicle.id}`
                                  : `/app/customers/${customer.id}?action=add-vehicle`
                            }
                          >
                            {activeOrder ? "İş Emrine Git" : "İş Emri Aç"}
                          </Link>
                        </Button>
                        {customer.phone && (
                          <Button asChild size="sm" variant="ghost">
                            <a
                              href={`tel:${customer.phone.replace(/\s+/g, "")}`}
                              aria-label={`${customer.name} ara`}
                            >
                              <Phone size={14} /> Ara
                            </a>
                          </Button>
                        )}
                        <div className="ux-row-more-wrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label="Diğer işlemler"
                            aria-expanded={isMenuOpen}
                            onClick={() =>
                              setOpenMenuId(isMenuOpen ? null : customer.id)
                            }
                          >
                            <MoreHorizontal size={16} />
                          </Button>
                          {isMenuOpen && (
                            <div
                              className="ux-row-more-menu"
                              onMouseLeave={() => setOpenMenuId(null)}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  router.push(
                                    primaryVehicle
                                      ? `/app/intake?vehicle=${primaryVehicle.id}`
                                      : `/app/intake`,
                                  );
                                }}
                              >
                                <CarFront size={14} /> Araç Kabul Başlat
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  router.push(
                                    primaryVehicle
                                      ? `/app/calendar?vehicle=${primaryVehicle.id}`
                                      : `/app/calendar`,
                                  );
                                }}
                              >
                                <CalendarDays size={14} /> Randevu Oluştur
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  router.push(
                                    `/app/customers/${customer.id}?action=add-vehicle`,
                                  );
                                }}
                              >
                                <Plus size={14} /> Yeni Araç Ekle
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  router.push(detailHref);
                                }}
                              >
                                <UserRound size={14} /> Müşteri & Araç Detayı
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!rows.length && (
          <div className="app-empty-state">
            <Search size={28} />
            <h2>Kayıt bulunamadı.</h2>
            <p>
              Aramayı değiştirin veya tek formda yeni müşteri ve araç kaydedin.
            </p>
            <Button asChild variant="outline">
              <Link href="/app/customers/new">Yeni Müşteri & Araç Ekle</Link>
            </Button>
          </div>
        )}
      </section>

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

function RecordMissing() {
  return (
    <div className="app-empty-state">
      <h1>Kayıt bulunamadı.</h1>
      <p>
        Listeden başka bir kayıt seçebilir veya yeni müşteri ve araç
        oluşturabilirsiniz.
      </p>
      <Button asChild>
        <Link href="/app/customers">Müşteri & Araçlar Listesine Dön</Link>
      </Button>
    </div>
  );
}

function VehicleModal({
  mode,
  customer,
  currentVehicle,
  open,
  onOpenChange,
  onCompleted,
}: {
  mode: "replace" | "add";
  customer: Customer;
  currentVehicle?: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (newVehicle: Vehicle) => void;
}) {
  const { createRecord, replaceCustomerVehicle } = useDemo();
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const plate = String(form.get("plate") ?? "");
    const brand = String(form.get("brand") ?? "");
    const model = String(form.get("model") ?? "");
    const year = form.get("year") ? Number(form.get("year")) : null;
    const mileage = form.get("mileage") ? Number(form.get("mileage")) : null;
    const fuelType = String(form.get("fuelType") ?? "Dizel");

    if (mode === "replace" && currentVehicle) {
      const res = replaceCustomerVehicle(customer.id, currentVehicle.id, {
        plate,
        brand,
        model,
        year,
        mileage,
        fuelType,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.vehicle) {
        onCompleted(res.vehicle);
        onOpenChange(false);
      }
    } else {
      const res = createRecord({
        customerId: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        plate,
        brand,
        model,
        year,
        mileage,
        fuelType,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.vehicle) {
        onCompleted(res.vehicle);
        onOpenChange(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <p className="app-overline">
          {mode === "replace" ? "ARAÇ DEĞİŞİMİ" : "YENİ ARAÇ EKLE"}
        </p>
        <DialogTitle className="app-dialog-title">
          {mode === "replace"
            ? "Müşterinin Aracını Değiştir"
            : `${customer.name} İçin Yeni Araç Ekle`}
        </DialogTitle>
        <DialogDescription className="app-dialog-description">
          {mode === "replace" && currentVehicle
            ? `Mevcut aktif araç (${currentVehicle.plate} · ${currentVehicle.model}) silinmez; geçmiş servis kayıtları korunarak "Önceki Araçlar (Pasif)" bölümüne taşınır ve yeni araç aktif araç olur.`
            : "Müşterinin aynı anda birden fazla aktif aracı varsa yeni aracı buradan ekleyin."}
        </DialogDescription>
        <form className="records-form" onSubmit={handleSubmit}>
          <div className="records-fields">
            <label>
              Yeni Plaka
              <input
                name="plate"
                required
                maxLength={14}
                placeholder="31 XYZ 456"
                className="records-plate-input"
              />
            </label>
            <label>
              Marka
              <input
                name="brand"
                maxLength={50}
                placeholder="Örn. Renault, Fiat"
              />
            </label>
            <label>
              Model
              <input
                name="model"
                required
                maxLength={80}
                placeholder="Örn. Clio, Egea"
              />
            </label>
            <label>
              Model Yılı
              <input
                name="year"
                type="number"
                min={1950}
                max={2027}
                placeholder="2022"
              />
            </label>
            <label>
              Kilometre
              <input
                name="mileage"
                type="number"
                min={0}
                max={2000000}
                placeholder="65000"
              />
            </label>
            <label>
              Yakıt Türü
              <select name="fuelType" defaultValue="Dizel">
                <option value="Dizel">Dizel</option>
                <option value="Benzin">Benzin</option>
                <option value="LPG">Benzin & LPG</option>
                <option value="Hibrit">Hibrit</option>
                <option value="Elektrik">Elektrik</option>
              </select>
            </label>
          </div>
          {error && (
            <p className="records-error" role="alert">
              {error}
            </p>
          )}
          <div className="records-form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Vazgeç
            </Button>
            <Button type="submit">
              {mode === "replace"
                ? "Eski Aracı Pasife Al & Yeni Aracı Kaydet"
                : "Yeni Aracı Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerDetail({
  id,
  initialVehicleId,
  initialAction,
}: {
  id: string;
  initialVehicleId?: string;
  initialAction?: string;
}) {
  const router = useRouter();
  const {
    customers,
    vehicles,
    orders,
    payments,
    technicianFor,
    updateCustomer,
    deleteCustomer,
    updateVehicle,
    toggleVehicleActive,
  } = useDemo();

  const customer = customers.find((item) => item.id === id);
  const owned = vehicles.filter((vehicle) => vehicle.customerId === id);
  const activeVehicles = owned.filter((v) => v.active !== false);
  const passiveVehicles = owned.filter((v) => v.active === false);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialVehicleId || activeVehicles[0]?.id || owned[0]?.id || "",
  );
  const [modalMode, setModalMode] = useState<"replace" | "add" | null>(
    initialAction === "add-vehicle"
      ? "add"
      : initialAction === "replace-vehicle"
        ? "replace"
        : null,
  );
  const [sectionTab, setSectionTab] = useState<
    "all" | "open-orders" | "history" | "vehicles" | "payments"
  >("all");

  if (!customer) return <RecordMissing />;

  const activeVehicle =
    owned.find((v) => v.id === selectedVehicleId) ??
    activeVehicles[0] ??
    owned[0];

  const relatedOrders = orders.filter((order) => order.customerId === id);
  const openOrders = relatedOrders.filter((order) => isActive(order.status));
  const activeOrderForSelected = activeVehicle
    ? openOrders.find((o) => o.vehicleId === activeVehicle.id)
    : openOrders[0];

  const balance = relatedOrders.reduce(
    (sum, order) =>
      sum +
      (order.status === "CANCELLED" ? 0 : Math.max(0, order.total - order.paid)),
    0,
  );
  const totalPaid = relatedOrders.reduce(
    (sum, order) => sum + (order.status === "CANCELLED" ? 0 : order.paid),
    0,
  );

  // Build combined service history across all of customer's vehicles
  const serviceHistory = [
    ...owned.flatMap((v) => {
      const visits = [];
      if (v.id === "v1") {
        for (const item of earlierMeganeVisits) {
          visits.push({
            id: `${v.id}-${item.id}`,
            plate: v.plate,
            vehicleModel: v.model,
            isPassive: v.active === false,
            date: item.date,
            mileage: item.mileage,
            title: item.title,
            description: item.description,
          });
        }
      }
      if (v.lastService) {
        visits.push({
          id: `last-${v.id}`,
          plate: v.plate,
          vehicleModel: v.model,
          isPassive: v.active === false,
          date: v.lastService.date,
          mileage: v.lastService.mileage,
          title: v.lastService.title,
          description: "Tamamlanmış servis bakımı",
        });
      }
      return visits;
    }),
    ...relatedOrders
      .filter((o) => o.status === "DELIVERED")
      .map((o) => {
        const v = owned.find((item) => item.id === o.vehicleId);
        return {
          id: `order-${o.id}`,
          plate: v?.plate ?? "Araç",
          vehicleModel: v?.model ?? "",
          isPassive: v?.active === false,
          date: o.completedAt || "21 Ekim 2026",
          mileage: o.intakeMileage,
          title: o.labor.map((l) => l.name).join(", ") || o.complaint,
          description: `İş Emri #${o.id} · ${money(o.total)}`,
          orderId: o.id,
        };
      }),
  ];

  const customerPayments = payments.filter((p) =>
    relatedOrders.some((o) => o.id === p.orderId),
  );

  const selectedMileage = activeVehicle
    ? Math.max(
        activeVehicle.mileage ?? 0,
        activeVehicle.lastService?.mileage ?? 0,
        ...relatedOrders
          .filter((o) => o.vehicleId === activeVehicle.id)
          .map((o) => o.intakeMileage || 0),
      )
    : 0;

  return (
    <>
      <Link href="/app/customers" className="records-back">
        <ArrowLeft size={16} /> Müşteri & Araçlar
      </Link>

      {/* ÜST BÖLÜM: Müşteri + Aktif Araç + Hızlı Aksiyonlar */}
      <header className="app-panel ux-customer-unified-hero" data-tour="customer-detail-summary" data-tour-id="customer-detail-summary">
        <div className="ux-customer-unified-top">
          <div className="ux-customer-identity-block">
            <span className="app-overline">MÜŞTERİ & AKTİF ARAÇ KARTI</span>
            <h1>{customer.name}</h1>
            <div className="ux-customer-contact-line">
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone.replace(/\s+/g, "")}`}
                  className="ux-customer-phone-pill"
                >
                  <Phone size={14} /> {customer.phone}
                </a>
              ) : (
                <span>Telefon eklenmedi</span>
              )}
              {customer.email && (
                <span className="ux-customer-email-pill">{customer.email}</span>
              )}
              <EntryForm
                title="Müşteri Bilgilerini Düzenle"
                trigger={
                  <button type="button" className="ux-inline-edit-btn">
                    Düzenle
                  </button>
                }
                fields={[
                  {
                    name: "name",
                    label: "Ad Soyad",
                    required: true,
                    value: customer.name,
                  },
                  {
                    name: "phone",
                    label: "Telefon",
                    type: "tel",
                    value: customer.phone,
                  },
                  {
                    name: "email",
                    label: "E-posta",
                    value: customer.email ?? "",
                  },
                ]}
                onSave={(values) =>
                  updateCustomer(id, {
                    name: values.name ?? "",
                    phone: values.phone ?? "",
                    email: values.email ?? "",
                  })
                }
              />
              {relatedOrders.length === 0 && (
                <button
                  type="button"
                  className="ux-inline-edit-btn is-danger"
                  onClick={() => {
                    const err = deleteCustomer(id);
                    if (!err) router.push("/app/customers");
                  }}
                >
                  <Trash2 size={13} /> Sil
                </button>
              )}
            </div>
          </div>

          {activeVehicle ? (
            <div className="ux-active-vehicle-highlight">
              <div className="ux-active-vehicle-badge-row">
                <span
                  className={`ux-vehicle-state-pill ${activeVehicle.active === false ? "is-passive" : "is-active"}`}
                >
                  {activeVehicle.active === false
                    ? "Önceki Araç (Pasif)"
                    : "Aktif Araç"}
                </span>
                {activeOrderForSelected && (
                  <StatusBadge status={activeOrderForSelected.status} short />
                )}
              </div>
              <div className="ux-active-vehicle-main">
                <strong className="ux-hero-plate">{activeVehicle.plate}</strong>
                <div className="ux-hero-vehicle-meta">
                  <strong>
                    {activeVehicle.model}
                    {activeVehicle.year ? ` ${activeVehicle.year}` : ""}
                  </strong>
                  <span>
                    {selectedMileage
                      ? `${number(selectedMileage)} km`
                      : "Km belirtilmedi"}
                    {activeVehicle.fuelType
                      ? ` · ${activeVehicle.fuelType}`
                      : ""}
                  </span>
                </div>
              </div>
              {owned.length > 1 && (
                <div
                  className="ux-vehicle-switcher"
                  role="tablist"
                  aria-label="Müşterinin araçları"
                >
                  {owned.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      role="tab"
                      aria-selected={v.id === activeVehicle.id}
                      className={`ux-vehicle-switch-pill ${v.id === activeVehicle.id ? "is-selected" : ""} ${v.active === false ? "is-passive" : ""}`}
                      onClick={() => setSelectedVehicleId(v.id)}
                    >
                      <strong>{v.plate}</strong>
                      <span>
                        {v.model}
                        {v.active === false ? " (Önceki)" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="ux-active-vehicle-highlight">
              <p className="records-help">Henüz araç kaydı bulunmuyor.</p>
            </div>
          )}
        </div>

        {/* HIZLI BUTONLAR: İş Emri Aç | Araç Kabul | Randevu Oluştur | Aracı Değiştir | Yeni Araç Ekle */}
        <div className="ux-customer-quick-bar">
          <Button asChild>
            <Link
              href={
                activeOrderForSelected
                  ? `/app/work-orders/${activeOrderForSelected.id}`
                  : activeVehicle
                    ? `/app/intake?vehicle=${activeVehicle.id}`
                    : `/app/intake`
              }
            >
              <ClipboardList size={16} />
              {activeOrderForSelected ? "Açık İş Emrine Git" : "İş Emri Aç"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={
                activeVehicle
                  ? `/app/intake?vehicle=${activeVehicle.id}`
                  : `/app/intake`
              }
            >
              <CarFront size={16} /> Araç Kabul
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={
                activeVehicle
                  ? `/app/calendar?vehicle=${activeVehicle.id}`
                  : `/app/calendar`
              }
            >
              <CalendarDays size={16} /> Randevu Oluştur
            </Link>
          </Button>
          {activeVehicle && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalMode("replace")}
            >
              <RefreshCw size={16} /> Aracı Değiştir
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setModalMode("add")}
          >
            <Plus size={16} /> Yeni Araç Ekle
          </Button>
        </div>
      </header>

      {/* BÖLÜM FİLTRE SEKMELERİ */}
      <div className="ux-customer-section-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={sectionTab === "all"}
          className={sectionTab === "all" ? "is-active" : ""}
          onClick={() => setSectionTab("all")}
        >
          Tüm Görünüm
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sectionTab === "open-orders"}
          className={sectionTab === "open-orders" ? "is-active" : ""}
          onClick={() => setSectionTab("open-orders")}
        >
          Açık İşler ({openOrders.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sectionTab === "history"}
          className={sectionTab === "history" ? "is-active" : ""}
          onClick={() => setSectionTab("history")}
        >
          Servis Geçmişi ({serviceHistory.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sectionTab === "vehicles"}
          className={sectionTab === "vehicles" ? "is-active" : ""}
          onClick={() => setSectionTab("vehicles")}
        >
          Araçlar ({owned.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sectionTab === "payments"}
          className={sectionTab === "payments" ? "is-active" : ""}
          onClick={() => setSectionTab("payments")}
        >
          Ödemeler ({money(balance)} açık)
        </button>
      </div>

      <div className="ux-customer-sections-stack">
        {/* 1. AÇIK İŞLER */}
        {(sectionTab === "all" || sectionTab === "open-orders") && (
          <section className="app-panel records-section">
            <div className="records-section-heading">
              <div>
                <h2>Açık İşler</h2>
                <p>Müşterinin şu anda serviste devam eden iş emirleri.</p>
              </div>
              <span>{openOrders.length} açık iş</span>
            </div>
            {openOrders.length ? (
              <ul className="records-related-orders">
                {openOrders.map((order) => {
                  const v = owned.find((item) => item.id === order.vehicleId);
                  const tech = technicianFor(order.technicianId);
                  const orderBalance = Math.max(0, order.total - order.paid);
                  return (
                    <li key={order.id}>
                      <Link href={`/app/work-orders/${order.id}`}>
                        <div>
                          <strong>
                            {v?.plate ?? "Araç"} · {v?.model}
                          </strong>
                          <small>
                            #{order.id} · {order.complaint} · Sorumlu:{" "}
                            {tech.name} · Teslim: {deliveryLabel(order.dueAt)}
                          </small>
                        </div>
                        <div className="ux-order-row-right">
                          <span className="ux-order-row-amount">
                            {money(order.total)}
                            {orderBalance > 0
                              ? ` (${money(orderBalance)} açık)`
                              : " (Ödendi)"}
                          </span>
                          <StatusBadge status={order.status} short />
                          <ArrowRight size={17} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="ux-empty-inline-row">
                <p className="records-help">
                  Şu anda açık iş emri bulunmuyor.
                </p>
                {activeVehicle && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/app/intake?vehicle=${activeVehicle.id}`}>
                      Araç Kabul Başlat <ArrowRight size={14} />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {/* 2. ARAÇLAR (Aktif Araçlar + Önceki / Pasif Araçlar) */}
        {(sectionTab === "all" || sectionTab === "vehicles") && (
          <section className="app-panel records-section">
            <div className="records-section-heading">
              <div>
                <h2>Araçlar</h2>
                <p>
                  Aktif araçlar ve araç değişimi sonrası korunan önceki araçlar.
                </p>
              </div>
              <div className="module-actions">
                {activeVehicle && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setModalMode("replace")}
                  >
                    <RefreshCw size={14} /> Aracı Değiştir
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setModalMode("add")}
                >
                  <Plus size={14} /> Yeni Araç Ekle
                </Button>
              </div>
            </div>

            <div className="ux-vehicles-split-groups">
              <div>
                <h3 className="ux-vehicle-group-title">
                  Aktif Araç{activeVehicles.length > 1 ? "lar" : ""} (
                  {activeVehicles.length})
                </h3>
                <ul className="ux-customer-vehicles-list">
                  {activeVehicles.map((v) => {
                    const vOrder = openOrders.find((o) => o.vehicleId === v.id);
                    return (
                      <li
                        key={v.id}
                        className={`ux-customer-vehicle-card ${v.id === activeVehicle?.id ? "is-selected" : ""}`}
                      >
                        <div
                          className="ux-customer-vehicle-main"
                          onClick={() => setSelectedVehicleId(v.id)}
                        >
                          <div className="ux-customer-vehicle-title">
                            <strong className="ux-plate-chip">{v.plate}</strong>
                            <strong>
                              {v.model}
                              {v.year ? ` · ${v.year}` : ""}
                            </strong>
                            <span className="ux-vehicle-state-pill is-active">
                              Aktif Araç
                            </span>
                            {vOrder && (
                              <StatusBadge status={vOrder.status} short />
                            )}
                          </div>
                          <small>
                            Kilometre:{" "}
                            {v.mileage || v.lastService?.mileage
                              ? `${number(v.mileage ?? v.lastService?.mileage ?? 0)} km`
                              : "Belirtilmedi"}
                            {v.fuelType ? ` · Yakıt: ${v.fuelType}` : ""}
                            {" · "}
                            Son Servis:{" "}
                            {v.lastService
                              ? `${v.lastService.date} (${v.lastService.title})`
                              : "Kayıt yok"}
                          </small>
                        </div>
                        <div className="ux-customer-vehicle-actions">
                          <Button asChild size="sm">
                            <Link
                              href={
                                vOrder
                                  ? `/app/work-orders/${vOrder.id}`
                                  : `/app/intake?vehicle=${v.id}`
                              }
                            >
                              {vOrder ? "Açık İşe Git" : "İş Emri Aç"}
                            </Link>
                          </Button>
                          <EntryForm
                            title="Aracı Düzenle"
                            trigger={
                              <Button size="sm" variant="outline">
                                Düzenle
                              </Button>
                            }
                            fields={[
                              {
                                name: "plate",
                                label: "Plaka",
                                required: true,
                                value: v.plate,
                              },
                              {
                                name: "model",
                                label: "Marka / Model",
                                required: true,
                                value: v.model,
                              },
                              {
                                name: "year",
                                label: "Model Yılı",
                                type: "number",
                                min: 1950,
                                max: 2027,
                                value: v.year ? String(v.year) : "",
                              },
                              {
                                name: "mileage",
                                label: "Kilometre",
                                type: "number",
                                value: v.mileage ? String(v.mileage) : "",
                              },
                              {
                                name: "fuelType",
                                label: "Yakıt Türü",
                                value: v.fuelType ?? "Dizel",
                              },
                            ]}
                            onSave={(values) =>
                              updateVehicle(v.id, {
                                plate: values.plate ?? v.plate,
                                model: values.model ?? v.model,
                                year: values.year ? Number(values.year) : null,
                                mileage: values.mileage
                                  ? Number(values.mileage)
                                  : v.mileage,
                                fuelType: values.fuelType ?? v.fuelType,
                                customerId: customer.id,
                              })
                            }
                          />
                          {activeVehicles.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleVehicleActive(v.id, false)}
                            >
                              Önceki Araç Yap
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {passiveVehicles.length > 0 && (
                <div>
                  <h3 className="ux-vehicle-group-title is-passive">
                    Önceki Araçlar ({passiveVehicles.length})
                  </h3>
                  <ul className="ux-customer-vehicles-list">
                    {passiveVehicles.map((v) => (
                      <li
                        key={v.id}
                        className="ux-customer-vehicle-card is-passive"
                      >
                        <div
                          className="ux-customer-vehicle-main"
                          onClick={() => setSelectedVehicleId(v.id)}
                        >
                          <div className="ux-customer-vehicle-title">
                            <strong className="ux-plate-chip">{v.plate}</strong>
                            <strong>
                              {v.model}
                              {v.year ? ` · ${v.year}` : ""}
                            </strong>
                            <span className="ux-vehicle-state-pill is-passive">
                              Önceki Araç (Pasif)
                            </span>
                          </div>
                          <small>
                            Son Servis:{" "}
                            {v.lastService
                              ? `${v.lastService.date} · ${v.lastService.title} (${number(v.lastService.mileage)} km)`
                              : "Servis geçmişi korundu"}
                          </small>
                        </div>
                        <div className="ux-customer-vehicle-actions">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => toggleVehicleActive(v.id, true)}
                          >
                            Yeniden Aktif Yap
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 3. SERVİS GEÇMİŞİ */}
        {(sectionTab === "all" || sectionTab === "history") && (
          <section className="app-panel records-section">
            <div className="records-section-heading">
              <div>
                <h2>Servis Geçmişi</h2>
                <p>
                  Müşterinin mevcut ve önceki araçlarına ait tüm servis
                  kayıtları.
                </p>
              </div>
              <Clock3 size={20} />
            </div>
            {serviceHistory.length ? (
              <ol className="records-service-timeline">
                {serviceHistory.map((visit) => (
                  <li key={visit.id}>
                    <time>{visit.date}</time>
                    <div>
                      <span>
                        <strong>{visit.plate}</strong> · {visit.vehicleModel}
                        {visit.isPassive ? " (Önceki Araç)" : ""} ·{" "}
                        {number(visit.mileage)} km
                      </span>
                      <h3>{visit.title}</h3>
                      <p>{visit.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="records-help">
                Bu müşteriye ait geçmiş servis kaydı henüz bulunmuyor.
              </p>
            )}
          </section>
        )}

        {/* 4. ÖDEMELER */}
        {(sectionTab === "all" || sectionTab === "payments") && (
          <section className="app-panel records-section">
            <div className="records-section-heading">
              <div>
                <h2>Ödemeler & Bakiye</h2>
                <p>
                  Tahsil edilen tutar: <strong>{money(totalPaid)}</strong> ·
                  Açık bakiye: <strong>{money(balance)}</strong>
                </p>
              </div>
              {balance > 0 ? (
                <QuickActions
                  initial="payment"
                  orderId={
                    relatedOrders.find(
                      (o) => o.total > o.paid && o.status !== "CANCELLED",
                    )?.id
                  }
                  outline
                />
              ) : (
                <Wallet size={20} />
              )}
            </div>
            {relatedOrders.length ? (
              <ul className="records-related-orders">
                {relatedOrders.map((o) => {
                  const v = owned.find((item) => item.id === o.vehicleId);
                  const rem =
                    o.status === "CANCELLED"
                      ? 0
                      : Math.max(0, o.total - o.paid);
                  return (
                    <li key={o.id}>
                      <Link href={`/app/work-orders/${o.id}?tab=payments`}>
                        <div>
                          <strong>
                            {v?.plate} · #{o.id}
                          </strong>
                          <small>
                            Toplam: {money(o.total)} · Tahsil Edilen:{" "}
                            {money(o.paid)}
                          </small>
                        </div>
                        <span
                          className={`ux-payment-status-chip ${rem > 0 ? "is-due" : "is-paid"}`}
                        >
                          {rem > 0 ? `${money(rem)} Açık` : "Tahsil Edildi"}
                        </span>
                        <ArrowRight size={17} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="records-help">
                Henüz iş emri veya ödeme kaydı yok.
              </p>
            )}
            {customerPayments.length > 0 && (
              <div className="ux-recent-payments-sub">
                <h4>Son Tahsilat İşlemleri</h4>
                <ul>
                  {customerPayments.map((p) => (
                    <li key={p.id}>
                      <span>İş Emri #{p.orderId}</span>
                      <strong>{money(p.amount)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>

      <VehicleModal
        mode={modalMode ?? "add"}
        customer={customer}
        currentVehicle={activeVehicle}
        open={Boolean(modalMode)}
        onOpenChange={(open) => {
          if (!open) setModalMode(null);
        }}
        onCompleted={(newVehicle) => {
          setSelectedVehicleId(newVehicle.id);
        }}
      />
    </>
  );
}

export function VehicleDetail({ id }: { id: string }) {
  const { vehicles } = useDemo();
  const vehicle = vehicles.find((item) => item.id === id);
  if (!vehicle) return <RecordMissing />;
  return (
    <CustomerDetail id={vehicle.customerId} initialVehicleId={vehicle.id} />
  );
}
