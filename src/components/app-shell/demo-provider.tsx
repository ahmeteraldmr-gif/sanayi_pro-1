"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  allowedTransitions,
  statuses,
  vehicles as initialVehicles,
  formatPlate,
  normalizeSearch,
  isActive,
  money,
  nowTimeLabel,
  nowDateTimeLabel,
  quoteStatusMeta,
  partRequestStatuses,
  type Customer,
  type Vehicle,
  type BranchId,
  type WorkOrder,
  type WorkOrderStatus,
  type QuoteStatus,
  type QuoteItem,
  type PartRequestStatus,
} from "@/lib/demo-data";
import {
  intakeChecklist,
  type IntakeInput,
  type NewRecordInput,
} from "@/lib/intake-data";

import { useLocalRepository } from "@/lib/local-repository";
import {
  OperationsProvider,
  useOperations,
} from "@/components/modules/operations-store";
import {
  getBranchProfile,
  getBranchInitialData,
  type CraftsmanBranchProfile,
  type CraftsmanBranchId,
} from "@/lib/branch-profiles";
import { startDemoTrialAction } from "@/app/auth/actions";

// Isolated notice store so toast announcements never re-render the entire /app tree.
let currentNotice = "";
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
const noticeListeners = new Set<() => void>();

function emitNotice(message: string) {
  currentNotice = message;
  if (noticeTimer) clearTimeout(noticeTimer);
  if (message && typeof window !== "undefined") {
    noticeTimer = setTimeout(() => {
      currentNotice = "";
      noticeListeners.forEach((l) => l());
    }, 4000);
  }
  noticeListeners.forEach((l) => l());
}

function subscribeNotice(listener: () => void) {
  noticeListeners.add(listener);
  return () => {
    noticeListeners.delete(listener);
  };
}

export function useNotice() {
  return useSyncExternalStore(
    subscribeNotice,
    () => currentNotice,
    () => "",
  );
}

type DemoContextValue = {
  technicianFor: (id: string) => { id: string; name: string; initials: string };
  updateOrder: (id: string, update: Partial<WorkOrder>) => void;
  assignTechnician: (orderId: string, technicianId: string) => boolean;
  createCustomer: (
    name: string,
    phone: string,
    email?: string,
  ) => string | undefined;
  updateCustomer: (
    id: string,
    values: { name: string; phone: string; email?: string },
  ) => string | undefined;
  deleteCustomer: (id: string) => string | undefined;
  updateVehicle: (
    id: string,
    values: {
      plate: string;
      brand?: string;
      model: string;
      year: number | null;
      mileage?: number | null;
      fuelType?: string;
      active?: boolean;
      customerId: string;
    },
  ) => string | undefined;
  toggleVehicleActive: (id: string, active: boolean) => void;
  replaceCustomerVehicle: (
    customerId: string,
    oldVehicleId: string,
    input: {
      plate: string;
      brand?: string;
      model: string;
      year: number | null;
      mileage?: number | null;
      fuelType?: string;
    },
  ) => { vehicle?: Vehicle; error?: string };
  deleteVehicle: (id: string) => string | undefined;
  payments: readonly {
    id: string;
    orderId: string;
    amount: number;
    at: string;
  }[];
  recent: readonly string[];
  remember: (path: string) => void;
  collectPayment: (id: string, amount: number) => boolean;
  demoAppointments: readonly {
    id: string;
    vehicleId: string;
    at: string;
    note: string;
    branchId: BranchId;
    technicianId?: string;
    status?: string;
  }[];
  addAppointment: (
    vehicleId: string,
    at: string,
    note: string,
    technicianId?: string,
  ) => boolean;
  updateAppointment: (id: string, values: Record<string, string>) => void;
  customers: readonly Customer[];
  vehicles: readonly Vehicle[];
  vehicleFor: (order: WorkOrder) => Vehicle;
  customerFor: (order: WorkOrder) => Customer;
  createRecord: (input: NewRecordInput) => {
    vehicle?: Vehicle;
    error?: string;
  };
  acceptVehicle: (input: IntakeInput) => { orderId?: string; error?: string };
  orders: readonly WorkOrder[];
  branchId: BranchId;
  setBranchId: (id: BranchId) => void;
  changeStatus: (id: string, status: WorkOrderStatus) => void;
  quickTechnicianAction: (
    id: string,
    status: WorkOrderStatus,
    actorName?: string,
  ) => boolean;
  notice: string;
  announce: (message: string) => void;
  addNote: (id: string, text: string, author?: string) => void;
  recordApproval: (id: string, channel: string) => void;
  addQuoteItem: (
    orderId: string,
    item: Omit<QuoteItem, "id" | "total" | "status">,
  ) => void;
  setQuoteStatus: (
    orderId: string,
    status: QuoteStatus,
    channel?: string,
  ) => void;
  toggleQuoteItemStatus: (
    orderId: string,
    itemId: string,
    nextStatus: "APPROVED" | "REJECTED" | "PENDING",
  ) => void;
  createPartRequest: (
    orderId: string,
    input: {
      partId?: string;
      partName: string;
      quantity: number;
      requestedBy: string;
      note?: string;
    },
  ) => void;
  updatePartRequestStatus: (
    orderId: string,
    requestId: string,
    status: PartRequestStatus,
  ) => void;
  currentUser: DemoUser;
  activeBranchProfile: CraftsmanBranchProfile;
  switchBranch: (branchId: CraftsmanBranchId) => Promise<void>;
};

export type DemoUser = {
  name: string;
  role: string;
  isTechnician: boolean;
  isAdmin: boolean;
};

const EMPTY_RECENT: readonly string[] = [];
const EMPTY_PAYMENTS: DemoContextValue["payments"] = [];

const DemoContext = createContext<DemoContextValue | null>(null);

export function useRecentPaths() {
  return useLocalRepository<readonly string[]>("recent", EMPTY_RECENT);
}

export function DemoProvider({
  children,
  activeTenantInfo,
}: {
  children: ReactNode;
  activeTenantInfo?: {
    organizationName?: string;
    branchName?: string;
    displayName?: string;
    role?: string;
    branchSlug?: string;
  } | null;
}) {
  return (
    <OperationsProvider branchSlug={activeTenantInfo?.branchSlug}>
      <DemoState activeTenantInfo={activeTenantInfo}>{children}</DemoState>
    </OperationsProvider>
  );
}

function DemoState({
  children,
  activeTenantInfo,
}: {
  children: ReactNode;
  activeTenantInfo?: {
    organizationName?: string;
    branchName?: string;
    displayName?: string;
    role?: string;
    branchSlug?: string;
  } | null;
}) {
  const branchSlug = activeTenantInfo?.branchSlug || "motor-mekanik";
  const activeBranchProfile = useMemo(
    () => getBranchProfile(branchSlug),
    [branchSlug],
  );
  const branchInitialData = useMemo(
    () => getBranchInitialData(branchSlug),
    [branchSlug],
  );

  const switchBranch = useCallback(async (newBranchId: CraftsmanBranchId) => {
    try {
      await startDemoTrialAction(newBranchId);
    } catch (err) {
      if (String(err).includes("NEXT_REDIRECT")) {
        window.location.reload();
      }
    }
  }, []);

  const userRole = activeTenantInfo?.role || "İşletme Sahibi";
  const isTechnician =
    userRole === "Atölye Ustası" ||
    userRole.toLowerCase().includes("usta") ||
    userRole.toLowerCase().includes("teknisyen");
  const userName =
    activeTenantInfo?.displayName ||
    (isTechnician ? activeBranchProfile.craftsmanTitle : "Ahmet Yılmaz");

  const currentUser: DemoUser = useMemo(
    () => ({
      name: userName,
      role: userRole,
      isTechnician,
      isAdmin: !isTechnician,
    }),
    [userName, userRole, isTechnician],
  );
  const { data: operations, update: updateOperations } = useOperations();
  const technicians = useMemo(
    () => operations.employees.filter((e) => e.active),
    [operations.employees],
  );
  const [customers, setCustomers] = useLocalRepository<readonly Customer[]>(
    `branch:${activeBranchProfile.id}:customers`,
    branchInitialData.customers,
  );
  const [vehicles, setVehicles] = useLocalRepository<readonly Vehicle[]>(
    `branch:${activeBranchProfile.id}:vehicles`,
    branchInitialData.vehicles,
  );
  const [orders, setOrders] = useLocalRepository<readonly WorkOrder[]>(
    `branch:${activeBranchProfile.id}:orders`,
    branchInitialData.orders,
  );
  const [branchId, setBranchId] = useLocalRepository<BranchId>(
    "branch",
    "dortyol",
  );
  const [, setRecent] = useLocalRepository<readonly string[]>(
    "recent",
    EMPTY_RECENT,
  );

  const initialAppointments = useMemo<DemoContextValue["demoAppointments"]>(() => {
    const firstVehId = branchInitialData.vehicles[0]?.id || initialVehicles[0].id;
    return [
      {
        id: `appointment-${activeBranchProfile.id}-1`,
        vehicleId: firstVehId,
        at: "2026-10-22T09:00",
        note: `${activeBranchProfile.name} randevusu`,
        branchId: "dortyol",
      },
    ];
  }, [activeBranchProfile, branchInitialData.vehicles]);

  const [demoAppointments, setAppointments] = useLocalRepository<
    DemoContextValue["demoAppointments"]
  >(`branch:${activeBranchProfile.id}:appointments`, initialAppointments);
  const [payments, setPayments] = useLocalRepository<
    DemoContextValue["payments"]
  >(`branch:${activeBranchProfile.id}:payments`, EMPTY_PAYMENTS);

  const announce = useCallback((message: string) => {
    emitNotice(message);
  }, []);

  useEffect(() => {
    const onError = () =>
      emitNotice(
        "Kayıt saklanamadı. Tarayıcı depolama alanını kontrol edip yeniden deneyin.",
      );
    window.addEventListener("sanayipro:storage-error", onError);
    return () => window.removeEventListener("sanayipro:storage-error", onError);
  }, []);

  // O(1) lookup maps instead of repeated O(N) Array.find on every table row
  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    for (const v of vehicles) map.set(v.id, v);
    return map;
  }, [vehicles]);

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  const technicianMap = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; initials: string }
    >();
    for (const emp of operations.employees) {
      const initials = emp.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("");
      map.set(emp.id, { id: emp.id, name: emp.name, initials });
    }
    return map;
  }, [operations.employees]);

  const technicianFor = useCallback(
    (id: string) =>
      technicianMap.get(id) ?? { id, name: "Atanmadı", initials: "AT" },
    [technicianMap],
  );

  const vehicleFor = useCallback(
    (order: WorkOrder) => vehicleMap.get(order.vehicleId) ?? vehicles[0],
    [vehicleMap, vehicles],
  );

  const customerFor = useCallback(
    (order: WorkOrder) => customerMap.get(order.customerId) ?? customers[0],
    [customerMap, customers],
  );

  const remember = useCallback(
    (path: string) => {
      if (
        !/^\/app\/(vehicles|customers|work-orders)\/[^/]+$/.test(path) ||
        path.endsWith("/new")
      )
        return;
      setRecent((current) =>
        current[0] === path
          ? current
          : [path, ...current.filter((item) => item !== path)].slice(0, 6),
      );
    },
    [setRecent],
  );

  const updateOrder = useCallback(
    (id: string, update: Partial<WorkOrder>) => {
      setOrders((current) =>
        current.map((order) =>
          order.id === id
            ? { ...order, ...update, updatedLabel: "Az önce" }
            : order,
        ),
      );
    },
    [setOrders],
  );

  const createCustomer = useCallback(
    (name: string, phone: string, email?: string) => {
      if (name.trim().length < 2) return;
      const normalized = phone.replace(/\D/g, "").replace(/^90/, "0");
      if (normalized && !/^0\d{10}$/.test(normalized)) return;
      if (
        normalized &&
        customers.some((c) => c.phone.replace(/\D/g, "") === normalized)
      )
        return;
      const id = crypto.randomUUID();
      setCustomers((current) => [
        ...current,
        {
          id,
          name: name.trim(),
          phone: normalized,
          email: email?.trim() || undefined,
        },
      ]);
      announce("Müşteri kaydedildi.");
      return id;
    },
    [customers, setCustomers, announce],
  );

  const updateCustomer = useCallback(
    (id: string, values: { name: string; phone: string; email?: string }) => {
      const trimmed = values.name.trim();
      if (trimmed.length < 2) return "Müşteri adını kontrol edin.";
      const normalized = values.phone.replace(/\D/g, "").replace(/^90/, "0");
      if (normalized && !/^0\d{10}$/.test(normalized))
        return "Telefon numarası 11 haneli olmalıdır (05xx...).";
      if (
        normalized &&
        customers.some(
          (c) => c.id !== id && c.phone.replace(/\D/g, "") === normalized,
        )
      )
        return "Bu telefon numarası başka bir müşteride kayıtlı.";
      setCustomers((current) =>
        current.map((c) =>
          c.id === id
            ? {
                ...c,
                name: trimmed,
                phone: normalized,
                email:
                  values.email !== undefined
                    ? values.email.trim() || undefined
                    : c.email,
              }
            : c,
        ),
      );
      announce("Müşteri bilgileri güncellendi.");
    },
    [customers, setCustomers, announce],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      if (orders.some((o) => o.customerId === id))
        return "Bu müşteriye ait iş emri bulunduğu için silinemez.";
      setVehicles((current) => current.filter((v) => v.customerId !== id));
      setCustomers((current) => current.filter((c) => c.id !== id));
      announce("Müşteri kaydı silindi.");
    },
    [orders, setVehicles, setCustomers, announce],
  );

  const updateVehicle = useCallback(
    (
      id: string,
      values: {
        plate: string;
        brand?: string;
        model: string;
        year: number | null;
        mileage?: number | null;
        fuelType?: string;
        active?: boolean;
        customerId: string;
      },
    ) => {
      const plate = formatPlate(values.plate);
      if (!plate)
        return "Geçerli bir plaka girin. Örnek: 31 ABC 123.";
      if (
        vehicles.some(
          (v) =>
            v.id !== id &&
            normalizeSearch(v.plate) === normalizeSearch(plate),
        )
      )
        return "Bu plaka başka bir araçta kayıtlı.";
      if (
        values.year !== null &&
        (!Number.isInteger(values.year) ||
          values.year < 1950 ||
          values.year > 2027)
      )
        return "Model yılı 1950–2027 arasında olmalı.";
      if (!customerMap.has(values.customerId))
        return "Geçerli bir müşteri seçin.";
      const brandTrim = values.brand?.trim() || "";
      const modelTrim = values.model.trim();
      const combinedModel =
        brandTrim &&
        modelTrim &&
        !modelTrim.toLowerCase().startsWith(brandTrim.toLowerCase())
          ? `${brandTrim} ${modelTrim}`
          : modelTrim || brandTrim || "Model belirtilmedi";
      setVehicles((current) =>
        current.map((v) =>
          v.id === id
            ? {
                ...v,
                plate,
                brand: brandTrim || v.brand,
                model: combinedModel,
                year: values.year,
                mileage:
                  values.mileage !== undefined
                    ? (values.mileage ?? undefined)
                    : v.mileage,
                fuelType:
                  values.fuelType !== undefined
                    ? values.fuelType || undefined
                    : v.fuelType,
                active: values.active !== undefined ? values.active : v.active,
                customerId: values.customerId,
              }
            : v,
        ),
      );
      setOrders((current) =>
        current.map((o) =>
          o.vehicleId === id ? { ...o, customerId: values.customerId } : o,
        ),
      );
      announce("Araç bilgileri güncellendi.");
    },
    [vehicles, customerMap, setVehicles, setOrders, announce],
  );

  const toggleVehicleActive = useCallback(
    (id: string, active: boolean) => {
      setVehicles((current) =>
        current.map((v) => (v.id === id ? { ...v, active } : v)),
      );
      announce(
        active
          ? "Araç aktif araç olarak işaretlendi."
          : "Araç önceki (pasif) araçlar arasına alındı.",
      );
    },
    [setVehicles, announce],
  );

  const replaceCustomerVehicle = useCallback(
    (
      customerId: string,
      oldVehicleId: string,
      input: {
        plate: string;
        brand?: string;
        model: string;
        year: number | null;
        mileage?: number | null;
        fuelType?: string;
      },
    ) => {
      const plate = formatPlate(input.plate);
      if (!plate)
        return { error: "Geçerli bir plaka girin. Örnek: 31 XYZ 456." };
      if (
        vehicles.some(
          (item) => normalizeSearch(item.plate) === normalizeSearch(plate),
        )
      ) {
        return { error: "Bu plaka zaten sistemde kayıtlı." };
      }
      if (
        input.year !== null &&
        (!Number.isInteger(input.year) ||
          input.year < 1950 ||
          input.year > 2027)
      ) {
        return { error: "Model yılı 1950–2027 arasında olmalı." };
      }
      const brandTrim = input.brand?.trim() || "";
      const modelTrim = input.model.trim();
      const combinedModel =
        brandTrim &&
        modelTrim &&
        !modelTrim.toLowerCase().startsWith(brandTrim.toLowerCase())
          ? `${brandTrim} ${modelTrim}`
          : modelTrim || brandTrim || "Model belirtilmedi";
      const newVehicle: Vehicle = {
        id: `v-${crypto.randomUUID()}`,
        plate,
        brand: brandTrim || undefined,
        model: combinedModel,
        year: input.year,
        mileage:
          input.mileage && Number.isFinite(input.mileage) && input.mileage > 0
            ? Math.round(input.mileage)
            : undefined,
        fuelType: input.fuelType?.trim() || undefined,
        active: true,
        customerId,
        lastService: null,
      };
      setVehicles((current) => [
        ...current.map((v) =>
          v.id === oldVehicleId ? { ...v, active: false } : v,
        ),
        newVehicle,
      ]);
      announce(
        `Önceki araç geçmişe alındı ve ${plate} yeni aktif araç olarak kaydedildi.`,
      );
      return { vehicle: newVehicle };
    },
    [vehicles, setVehicles, announce],
  );

  const deleteVehicle = useCallback(
    (id: string) => {
      if (orders.some((o) => o.vehicleId === id))
        return "Bu araca ait iş emri bulunduğu için silinemez.";
      setAppointments((current) => current.filter((a) => a.vehicleId !== id));
      setVehicles((current) => current.filter((v) => v.id !== id));
      announce("Araç kaydı silindi.");
    },
    [orders, setAppointments, setVehicles, announce],
  );

  const assignTechnician = useCallback(
    (orderId: string, technicianId: string) => {
      const tech = technicianMap.get(technicianId);
      if (!tech) return false;
      setOrders((current) =>
        current.map((order) => {
          if (order.id !== orderId) return order;
          const nextAssignees = [
            technicianId,
            ...order.assigneeIds.filter((a) => a !== technicianId),
          ];
          return {
            ...order,
            technicianId,
            assigneeIds: nextAssignees,
            updatedLabel: "Az önce",
            timeline: [
              ...order.timeline,
              {
                id: crypto.randomUUID(),
                time: nowTimeLabel(),
                text: `${tech.name} sorumlu usta olarak atandı`,
              },
            ],
          };
        }),
      );
      announce(`Sorumlu usta güncellendi: ${tech.name}.`);
      return true;
    },
    [technicianMap, setOrders, announce],
  );

  const collectPayment = useCallback(
    (id: string, amount: number) => {
      const order = orders.find((item) => item.id === id);
      if (
        !order ||
        order.status === "CANCELLED" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > Math.round((order.total - order.paid) * 100) / 100
      )
        return false;
      setOrders((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                paid: Math.round((item.paid + amount) * 100) / 100,
                timeline: [
                  ...item.timeline,
                  {
                    id: crypto.randomUUID(),
                    time: nowTimeLabel(),
                    text: `${money(amount)} tahsilat alındı`,
                  },
                ],
              }
            : item,
        ),
      );
      setPayments((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          orderId: id,
          amount,
          at: new Date().toISOString(),
        },
      ]);
      announce("Tahsilat kaydedildi.");
      return true;
    },
    [orders, setOrders, setPayments, announce],
  );

  const updateAppointment = useCallback(
    (id: string, values: Record<string, string>) => {
      setAppointments((current) =>
        current.map((a) => (a.id === id ? { ...a, ...values } : a)),
      );
      announce("Randevu güncellendi.");
    },
    [setAppointments, announce],
  );

  const addAppointment = useCallback(
    (vehicleId: string, at: string, note: string, technicianId?: string) => {
      if (
        !vehicleMap.has(vehicleId) ||
        !Number.isFinite(Date.parse(at)) ||
        Date.parse(at) <= Date.now()
      )
        return false;
      if (demoAppointments.some((a) => a.vehicleId === vehicleId && a.at === at))
        return false;
      setAppointments((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          vehicleId,
          at,
          note: note.trim(),
          branchId,
          technicianId,
          status: "Planlandı",
        },
      ]);
      announce("Randevu kaydedildi.");
      return true;
    },
    [vehicleMap, demoAppointments, setAppointments, branchId, announce],
  );

  const createRecord = useCallback(
    (input: NewRecordInput) => {
      const plate = formatPlate(input.plate);
      if (!plate)
        return { error: "Geçerli bir plaka girin. Örnek: 31 ABC 123." };
      if (
        vehicles.some(
          (item) => normalizeSearch(item.plate) === normalizeSearch(plate),
        )
      )
        return {
          error: "Bu plaka zaten kayıtlı. Mevcut araç kaydını seçin.",
        };
      if (
        input.year !== null &&
        (!Number.isInteger(input.year) ||
          input.year < 1950 ||
          input.year > 2027)
      )
        return { error: "Model yılı giriyorsanız 1950–2027 arasında olmalı." };
      let customer = input.customerId
        ? customerMap.get(input.customerId)
        : undefined;
      if (input.customerId && !customer)
        return { error: "Müşteri bulunamadı." };
      if (!customer) {
        const phone = input.phone.replace(/\D/g, "").replace(/^90/, "0");
        if (input.name.trim().length < 2 || (phone && !/^0\d{10}$/.test(phone)))
          return {
            error: "Müşteri adını girin. Telefon ekliyorsanız 11 haneli olmalı.",
          };
        if (
          phone &&
          customers.some((item) => item.phone.replace(/\D/g, "") === phone)
        )
          return {
            error:
              "Bu telefonla müşteri kayıtlı. Mevcut müşteri listesinden seçin.",
          };
        customer = {
          id: `c-${crypto.randomUUID()}`,
          name: input.name.trim(),
          phone,
          email: input.email?.trim() || undefined,
        };
        setCustomers((current) => [...current, customer!]);
      }
      const brandTrim = input.brand?.trim() || "";
      const modelTrim = input.model.trim();
      const combinedModel =
        brandTrim &&
        modelTrim &&
        !modelTrim.toLowerCase().startsWith(brandTrim.toLowerCase())
          ? `${brandTrim} ${modelTrim}`
          : modelTrim || brandTrim || "Model belirtilmedi";
      const vehicle: Vehicle = {
        id: `v-${crypto.randomUUID()}`,
        plate,
        brand: brandTrim || undefined,
        model: combinedModel,
        year: input.year,
        mileage:
          input.mileage && Number.isFinite(input.mileage) && input.mileage > 0
            ? Math.round(input.mileage)
            : undefined,
        fuelType: input.fuelType?.trim() || undefined,
        active: true,
        customerId: customer.id,
        lastService: null,
      };
      setVehicles((current) => [...current, vehicle]);
      announce("Müşteri ve araç kaydedildi.");
      return { vehicle };
    },
    [vehicles, customerMap, customers, setCustomers, setVehicles, announce],
  );

  const acceptVehicle = useCallback(
    (input: IntakeInput) => {
      const vehicle = vehicleMap.get(input.vehicleId);
      if (!vehicle) return { error: "Önce bir araç seçin." };
      if (
        orders.some(
          (item) => item.vehicleId === vehicle.id && isActive(item.status),
        )
      )
        return {
          error:
            "Bu aracın aktif iş emri var. Mevcut iş emri üzerinden devam edin.",
        };
      if (
        !Number.isInteger(input.mileage) ||
        input.mileage < (vehicle.lastService?.mileage ?? 0) ||
        input.mileage > 9999999
      )
        return { error: "Kilometre son servis kaydından düşük olamaz." };
      if (
        !input.complaint.trim() ||
        input.fuel < 0 ||
        input.fuel > 100 ||
        !input.damage.trim()
      )
        return {
          error: "Şikâyet, yakıt ve mevcut hasar bilgisini tamamlayın.",
        };
      if (
        operations.settings.checklist !== "İsteğe bağlı" &&
        intakeChecklist.some(
          (item) => !["yes", "no", "na"].includes(input.checklist[item.id]),
        )
      )
        return { error: "Kabul checklist'ini tamamlayın." };
      if (
        !technicians.some((item) => item.id === input.technicianId) ||
        !Number.isFinite(Date.parse(input.dueAt)) ||
        Date.parse(input.dueAt) <= Date.now()
      )
        return {
          error: "Usta ve geçerli bir teslim hedefi seçin.",
        };
      const sequence =
        Math.max(
          148,
          ...orders.map((item) => Number(item.id.split("-").at(-1)) || 0),
        ) + 1;
      const id = `WO-2026-${String(sequence).padStart(5, "0")}`;
      const order: WorkOrder = {
        id,
        vehicleId: vehicle.id,
        customerId: vehicle.customerId,
        branchId,
        technicianId: input.technicianId,
        assigneeIds: [input.technicianId],
        status: "RECEIVED",
        createdAt: new Date().toISOString(),
        dueAt: input.dueAt,
        updatedLabel: "Az önce",
        stageDuration: "Az önce",
        complaint: input.complaint.trim(),
        diagnosis: "Tespit bekleniyor.",
        intakeMileage: input.mileage,
        fuel: input.fuel,
        labor: [],
        parts: [],
        total: 0,
        paid: 0,
        quoteRevision: 0,
        approval: "PENDING",
        approvalChannel: "",
        quoteStatus: "DRAFT",
        quoteItems: [],
        partRequests: [],
        notes: [],
        additionalCosts: 0,
        intake: {
          damage: input.damage.trim(),
          keyCount: input.keyCount ?? 1,
          leftItems: input.leftItems ?? "",
          inspection: input.inspection ? { ...input.inspection } : undefined,
          checklist: { ...input.checklist },
          photos: [...input.photos],
        },
        timeline: [
          { id: "intake", time: nowTimeLabel(), text: "Araç kabul edildi" },
          {
            id: "assignment",
            time: nowTimeLabel(),
            text: `${technicians.find((item) => item.id === input.technicianId)!.name} ana usta olarak atandı`,
          },
        ],
      };
      setOrders((current) => [order, ...current]);
      announce(`${vehicle.plate} için ${id} oluşturuldu.`);
      return { orderId: id };
    },
    [
      vehicleMap,
      orders,
      operations.settings.checklist,
      technicians,
      branchId,
      setOrders,
      announce,
    ],
  );

  const changeStatus = useCallback(
    (id: string, status: WorkOrderStatus) => {
      const currentOrder = orders.find((order) => order.id === id);
      if (
        status === "DELIVERED" &&
        currentOrder &&
        allowedTransitions[currentOrder.status].includes(status)
      ) {
        setVehicles((current) =>
          current.map((vehicle) =>
            vehicle.id === currentOrder.vehicleId
              ? {
                  ...vehicle,
                  lastService: {
                    date: new Date().toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }),
                    title:
                      currentOrder.labor.map((line) => line.name).join(", ") ||
                      currentOrder.complaint,
                    mileage: currentOrder.intakeMileage,
                  },
                }
              : vehicle,
          ),
        );
      }
      const statusTimelineText: Record<WorkOrderStatus, string> = {
        RECEIVED: "Araç kabul edildi",
        DIAGNOSIS: "Teşhis başladı · Durum: Arıza Tespiti",
        AWAITING_APPROVAL:
          "Teklif müşteriye sunuldu · Durum: Müşteri Onayı Bekleniyor",
        IN_PROGRESS: "İşlem başladı · Durum: İşlemde",
        WAITING_PARTS: "Parça bekleniyor · Durum: Parça Bekleniyor",
        QUALITY_CONTROL: "İşlem tamamlandı · Son kontrol yapıldı",
        READY: "Son kontrol tamamlandı · Araç hazır",
        DELIVERED: "Araç teslim edildi",
        CANCELLED: "İş emri iptal edildi",
      };
      setOrders((current) =>
        current.map((order) => {
          if (
            order.id !== id ||
            !allowedTransitions[order.status].includes(status) ||
            (order.status === "AWAITING_APPROVAL" &&
              status === "IN_PROGRESS" &&
              order.approval !== "APPROVED")
          )
            return order;
          return {
            ...order,
            completedAt:
              status === "DELIVERED"
                ? new Date().toISOString()
                : order.completedAt,
            status,
            quoteStatus:
              status === "AWAITING_APPROVAL"
                ? "PENDING_APPROVAL"
                : order.quoteStatus,
            updatedLabel: "Az önce",
            stageDuration: "Az önce",
            timeline: [
              ...order.timeline,
              {
                id: `demo-${order.timeline.length}-${crypto.randomUUID()}`,
                time: nowTimeLabel(),
                text: statusTimelineText[status],
              },
            ],
          };
        }),
      );
      announce(`Durum güncellendi: ${statuses[status].label}.`);
    },
    [orders, setVehicles, setOrders, announce],
  );

  const quickTechnicianAction = useCallback(
    (id: string, status: WorkOrderStatus, actorName?: string) => {
      const currentOrder = orders.find((order) => order.id === id);
      if (!currentOrder) return false;
      if (
        status === "IN_PROGRESS" &&
        currentOrder.status === "AWAITING_APPROVAL" &&
        currentOrder.approval === "PENDING"
      ) {
        announce("Önce müşteri onayının kaydedilmesi gerekiyor.");
        return false;
      }
      if (currentOrder.status === status) return false;
      const actor =
        actorName || technicianFor(currentOrder.technicianId).name || "Usta";
      const actionMap: Partial<Record<WorkOrderStatus, string>> = {
        IN_PROGRESS: `${actor} işlemi başlattı`,
        WAITING_PARTS: `${actor} işi beklemeye aldı (Parça Bekleniyor)`,
        QUALITY_CONTROL: `${actor} son kontrolü başlattı`,
        READY: `${actor} son kontrolü tamamladı · Araç hazır`,
      };
      setOrders((current) =>
        current.map((order) =>
          order.id === id
            ? {
                ...order,
                status,
                updatedLabel: "Az önce",
                stageDuration: "Az önce",
                timeline: [
                  ...order.timeline,
                  {
                    id: crypto.randomUUID(),
                    time: nowTimeLabel(),
                    text:
                      actionMap[status] ??
                      `${actor} durumu güncelledi: ${statuses[status].label}`,
                  },
                ],
              }
            : order,
        ),
      );
      announce(`${statuses[status].label} olarak işaretlendi.`);
      return true;
    },
    [orders, technicianFor, setOrders, announce],
  );

  const addNote = useCallback(
    (id: string, text: string, author = "Ahmet") => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > 2000) return;
      const cleanAuthor = author.trim() || "Ahmet";
      setOrders((current) =>
        current.map((order) =>
          order.id === id
            ? {
                ...order,
                updatedLabel: "Az önce",
                notes: [
                  ...order.notes,
                  {
                    id: `note-${order.notes.length + 1}-${crypto.randomUUID()}`,
                    text: trimmed,
                    author: cleanAuthor,
                    createdAt: nowDateTimeLabel(),
                    internal: true,
                  },
                ],
                timeline: [
                  ...order.timeline,
                  {
                    id: `demo-${order.timeline.length}-${crypto.randomUUID()}`,
                    time: nowTimeLabel(),
                    text: `${cleanAuthor} bir personel iç notu ekledi`,
                  },
                ],
              }
            : order,
        ),
      );
      announce("Personel iç notu kaydedildi.");
    },
    [setOrders, announce],
  );

  const recordApproval = useCallback(
    (id: string, channel: string) => {
      setOrders((current) =>
        current.map((order) => {
          if (order.id !== id) return order;
          const items = order.quoteItems ?? [];
          const newlyApprovedSum = items
            .filter((item) => item.status === "PENDING")
            .reduce((sum, item) => sum + item.total, 0);
          const nextItems = items.map((item) =>
            item.status === "PENDING"
              ? ({ ...item, status: "APPROVED" } as const)
              : item,
          );
          const nextTotal =
            newlyApprovedSum > 0 && order.total === 0
              ? Math.round(newlyApprovedSum * 100) / 100
              : items.length > 0
                ? Math.max(
                    order.total,
                    Math.round(
                      nextItems
                        .filter((i) => i.status === "APPROVED")
                        .reduce((s, i) => s + i.total, 0) * 100,
                    ) / 100,
                  )
                : order.total;
          return {
            ...order,
            approval: "APPROVED",
            quoteStatus: "APPROVED",
            quoteItems: nextItems,
            total: nextTotal,
            approvalChannel: channel,
            updatedLabel: "Az önce",
            timeline: [
              ...order.timeline,
              {
                id: `demo-${order.timeline.length}-${crypto.randomUUID()}`,
                time: nowTimeLabel(),
                text: `Müşteri onayladı · ${channel} üzerinden müşteri onayı kaydedildi`,
              },
            ],
          };
        }),
      );
      announce("Müşteri onayı kaydedildi.");
    },
    [setOrders, announce],
  );

  const addQuoteItem = useCallback(
    (
      orderId: string,
      item: Omit<QuoteItem, "id" | "total" | "status">,
    ) => {
      const laborAmount = Math.max(0, Number(item.laborAmount) || 0);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const total =
        Math.round((laborAmount + quantity * unitPrice) * 100) / 100;
      const newItem: QuoteItem = {
        id: `qi-${crypto.randomUUID()}`,
        operation: item.operation.trim(),
        laborAmount,
        partId: item.partId,
        partName: item.partName.trim(),
        quantity,
        unitPrice,
        total,
        note: item.note.trim(),
        status: "PENDING",
      };
      setOrders((current) =>
        current.map((order) => {
          if (order.id !== orderId) return order;
          const nextQuoteStatus: QuoteStatus =
            order.quoteStatus === "DRAFT" ? "DRAFT" : "PENDING_APPROVAL";
          return {
            ...order,
            quoteRevision: order.quoteRevision + 1,
            quoteStatus: nextQuoteStatus,
            approval: "PENDING",
            quoteItems: [...(order.quoteItems ?? []), newItem],
            updatedLabel: "Az önce",
            timeline: [
              ...order.timeline,
              {
                id: crypto.randomUUID(),
                time: nowTimeLabel(),
                text: `${newItem.operation}${newItem.partName ? ` (${newItem.partName})` : ""} önerildi · ${money(total)}`,
              },
            ],
          };
        }),
      );
      announce("Teklif kalemi eklendi (Müşteri onayı bekliyor).");
    },
    [setOrders, announce],
  );

  const setQuoteStatus = useCallback(
    (orderId: string, quoteStatus: QuoteStatus, channel = "Telefon") => {
      setOrders((current) =>
        current.map((order) => {
          if (order.id !== orderId) return order;
          const currentItems = order.quoteItems ?? [];
          let nextItems = currentItems;
          let nextApproval = order.approval;
          let nextTotal = order.total;
          let nextLabor = order.labor;
          let timelineText = `Teklif durumu: ${quoteStatusMeta[quoteStatus].label}`;

          if (quoteStatus === "DRAFT") {
            nextApproval = "PENDING";
            timelineText = "Teklif taslak olarak kaydedildi";
          } else if (quoteStatus === "PENDING_APPROVAL") {
            nextApproval = "PENDING";
            timelineText = "Teklif müşteriye sunuldu";
          } else if (quoteStatus === "APPROVED") {
            nextApproval = "APPROVED";
            const newlyApproved = currentItems.filter(
              (i) => i.status !== "APPROVED",
            );
            nextItems = currentItems.map((i) => ({ ...i, status: "APPROVED" }));
            if (currentItems.length > 0) {
              const approvedSum = nextItems.reduce(
                (sum, i) => sum + i.total,
                0,
              );
              nextTotal = Math.max(
                order.total,
                Math.round(approvedSum * 100) / 100,
              );
              const addedLabor = newlyApproved
                .filter(
                  (i) =>
                    i.total > 0 &&
                    !order.labor.some((l) => l.name === i.operation),
                )
                .map((i) => ({
                  id: `ql-${i.id}`,
                  name: i.operation,
                  amount: i.total,
                }));
              if (addedLabor.length > 0) {
                nextLabor = [...order.labor, ...addedLabor];
              }
            }
            timelineText = `Müşteri onayladı · ${channel} üzerinden`;
          } else if (quoteStatus === "PARTIALLY_APPROVED") {
            nextApproval = "APPROVED";
            if (
              currentItems.length > 0 &&
              !currentItems.some((i) => i.status === "APPROVED")
            ) {
              nextItems = currentItems.map((i, idx) => ({
                ...i,
                status: idx === 0 ? "APPROVED" : "REJECTED",
              }));
            }
            if (nextItems.length > 0) {
              const approvedSum = nextItems
                .filter((i) => i.status === "APPROVED")
                .reduce((sum, i) => sum + i.total, 0);
              nextTotal = Math.round(approvedSum * 100) / 100;
            }
            timelineText = "Müşteri teklifi kısmi onayladı";
          } else if (quoteStatus === "REJECTED") {
            nextApproval = "PENDING";
            nextItems = currentItems.map((i) =>
              i.status === "PENDING" ? { ...i, status: "REJECTED" } : i,
            );
            timelineText = "Teklif müşteri tarafından reddedildi";
          }

          return {
            ...order,
            quoteStatus,
            quoteItems: nextItems,
            approval: nextApproval,
            approvalChannel: channel || order.approvalChannel,
            total: nextTotal,
            labor: nextLabor,
            updatedLabel: "Az önce",
            timeline: [
              ...order.timeline,
              {
                id: crypto.randomUUID(),
                time: nowTimeLabel(),
                text: timelineText,
              },
            ],
          };
        }),
      );
      announce(`Teklif durumu güncellendi: ${quoteStatusMeta[quoteStatus].label}.`);
    },
    [setOrders, announce],
  );

  const toggleQuoteItemStatus = useCallback(
    (
      orderId: string,
      itemId: string,
      nextStatus: "APPROVED" | "REJECTED" | "PENDING",
    ) => {
      setOrders((current) =>
        current.map((order) => {
          if (order.id !== orderId) return order;
          const items = (order.quoteItems ?? []).map((item) =>
            item.id === itemId ? { ...item, status: nextStatus } : item,
          );
          const approvedCount = items.filter(
            (i) => i.status === "APPROVED",
          ).length;
          const rejectedCount = items.filter(
            (i) => i.status === "REJECTED",
          ).length;
          const pendingCount = items.filter(
            (i) => i.status === "PENDING",
          ).length;
          let quoteStatus: QuoteStatus = "PENDING_APPROVAL";
          if (pendingCount === 0 && approvedCount > 0 && rejectedCount === 0) {
            quoteStatus = "APPROVED";
          } else if (approvedCount > 0 && rejectedCount > 0) {
            quoteStatus = "PARTIALLY_APPROVED";
          } else if (rejectedCount === items.length && items.length > 0) {
            quoteStatus = "REJECTED";
          }
          const approvedSum = items
            .filter((i) => i.status === "APPROVED")
            .reduce((sum, i) => sum + i.total, 0);
          const targetItem = items.find((i) => i.id === itemId);
          return {
            ...order,
            quoteItems: items,
            quoteStatus,
            approval: approvedCount > 0 && pendingCount === 0 ? "APPROVED" : "PENDING",
            total: Math.round(approvedSum * 100) / 100,
            updatedLabel: "Az önce",
            timeline: [
              ...order.timeline,
              {
                id: crypto.randomUUID(),
                time: nowTimeLabel(),
                text: `Teklif kalemi (${targetItem?.operation ?? "İşlem"}): ${
                  nextStatus === "APPROVED"
                    ? "Onaylandı"
                    : nextStatus === "REJECTED"
                      ? "Reddedildi"
                      : "Onay Bekliyor"
                }`,
              },
            ],
          };
        }),
      );
      announce("Teklif kalemi durumu güncellendi.");
    },
    [setOrders, announce],
  );

  const createPartRequest = useCallback(
    (
      orderId: string,
      input: {
        partId?: string;
        partName: string;
        quantity: number;
        requestedBy: string;
        note?: string;
      },
    ) => {
      const partName = input.partName.trim();
      const quantity = Math.max(1, Math.round(Number(input.quantity) || 1));
      if (!partName) return;
      const requestedAt = nowTimeLabel();
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                updatedLabel: "Az önce",
                partRequests: [
                  ...(order.partRequests ?? []),
                  {
                    id: `pr-${crypto.randomUUID()}`,
                    orderId,
                    partId: input.partId,
                    partName,
                    quantity,
                    requestedBy: input.requestedBy || "Usta",
                    requestedAt,
                    status: "REQUESTED",
                    note: input.note?.trim(),
                  },
                ],
                timeline: [
                  ...order.timeline,
                  {
                    id: crypto.randomUUID(),
                    time: requestedAt,
                    text: `Parça talebi oluşturuldu: ${partName} (${quantity} adet)`,
                  },
                ],
              }
            : order,
        ),
      );
      announce(`Parça talebi oluşturuldu: ${partName} (${quantity} adet).`);
    },
    [setOrders, announce],
  );

  const updatePartRequestStatus = useCallback(
    (orderId: string, requestId: string, status: PartRequestStatus) => {
      const targetOrder = orders.find((o) => o.id === orderId);
      const targetReq = targetOrder?.partRequests?.find(
        (r) => r.id === requestId,
      );
      if (!targetOrder || !targetReq || targetReq.status === status) return;

      let reservedStockPart: {
        id: string;
        name: string;
        price: number;
        cost: number;
      } | null = null;

      if (status === "DELIVERED" && targetReq.partId) {
        const stockPart = operations.parts.find(
          (p) => p.id === targetReq.partId,
        );
        const alreadyOnOrder = targetOrder.parts.some(
          (p) => p.id === targetReq.partId,
        );
        if (
          stockPart &&
          !alreadyOnOrder &&
          stockPart.physical - stockPart.reserved >= targetReq.quantity
        ) {
          reservedStockPart = {
            id: stockPart.id,
            name: stockPart.name,
            price: stockPart.price,
            cost: stockPart.cost,
          };
          updateOperations((s) => ({
            ...s,
            parts: s.parts.map((p) =>
              p.id === stockPart.id
                ? { ...p, reserved: p.reserved + targetReq.quantity }
                : p,
            ),
            movements: [
              {
                id: crypto.randomUUID(),
                partId: stockPart.id,
                amount: 0,
                at: new Date().toISOString(),
                note: `Parça talebi teslim edildi · ${targetReq.quantity} adet iş emri için ayrıldı`,
                orderId,
              },
              ...s.movements,
            ],
          }));
        }
      }

      setOrders((current) =>
        current.map((order) => {
          if (order.id !== orderId) return order;
          const nextParts = reservedStockPart
            ? [
                ...order.parts,
                {
                  id: reservedStockPart.id,
                  name: reservedStockPart.name,
                  quantity: targetReq.quantity,
                  price: reservedStockPart.price,
                  historicCost: reservedStockPart.cost,
                  state: "RESERVED" as const,
                },
              ]
            : order.parts;
          return {
            ...order,
            parts: nextParts,
            partRequests: (order.partRequests ?? []).map((req) =>
              req.id === requestId ? { ...req, status } : req,
            ),
            updatedLabel: "Az önce",
            timeline: [
              ...order.timeline,
              {
                id: crypto.randomUUID(),
                time: nowTimeLabel(),
                text: `Parça talebi (${targetReq.partName} · ${targetReq.quantity} adet): ${partRequestStatuses[status].label}`,
              },
            ],
          };
        }),
      );
      announce(
        `Parça talebi güncellendi: ${partRequestStatuses[status].label}.`,
      );
    },
    [orders, operations.parts, updateOperations, setOrders, announce],
  );

  const contextValue = useMemo<DemoContextValue>(
    () => ({
      technicianFor,
      updateOrder,
      assignTechnician,
      createCustomer,
      updateCustomer,
      deleteCustomer,
      updateVehicle,
      toggleVehicleActive,
      replaceCustomerVehicle,
      deleteVehicle,
      payments,
      recent: EMPTY_RECENT,
      remember,
      collectPayment,
      demoAppointments,
      addAppointment,
      updateAppointment,
      customers,
      vehicles,
      vehicleFor,
      customerFor,
      createRecord,
      acceptVehicle,
      orders,
      branchId,
      setBranchId,
      changeStatus,
      quickTechnicianAction,
      addNote,
      recordApproval,
      addQuoteItem,
      setQuoteStatus,
      toggleQuoteItemStatus,
      createPartRequest,
      updatePartRequestStatus,
      currentUser,
      activeBranchProfile,
      switchBranch,
      notice: "",
      announce,
    }),
    [
      currentUser,
      activeBranchProfile,
      switchBranch,
      technicianFor,
      updateOrder,
      assignTechnician,
      createCustomer,
      updateCustomer,
      deleteCustomer,
      updateVehicle,
      toggleVehicleActive,
      replaceCustomerVehicle,
      deleteVehicle,
      payments,
      remember,
      collectPayment,
      demoAppointments,
      addAppointment,
      updateAppointment,
      customers,
      vehicles,
      vehicleFor,
      customerFor,
      createRecord,
      acceptVehicle,
      orders,
      branchId,
      setBranchId,
      changeStatus,
      quickTechnicianAction,
      addNote,
      recordApproval,
      addQuoteItem,
      setQuoteStatus,
      toggleQuoteItemStatus,
      createPartRequest,
      updatePartRequestStatus,
      announce,
    ],
  );

  return (
    <DemoContext.Provider value={contextValue}>{children}</DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo requires DemoProvider");
  return context;
}
