"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  allowedTransitions,
  statuses,
  vehicles as initialVehicles,
  formatPlate,
  parseAndValidatePlate,
  parseAndValidatePhone,
  validateEmail,
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

import {
  useLocalRepository,
  getStorageScope,
  type StorageScope,
} from "@/lib/local-repository";
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
import {
  persistAddWorkOrderQuoteItemAction,
  persistAppointmentAction,
  persistAssignTechnicianAction,
  persistAttachFaultToWorkOrderAction,
  persistCreateCustomerAction,
  persistCreateWorkOrderPartRequestAction,
  persistCustomerAndVehicleAction,
  persistDeleteAppointmentAction,
  persistDeleteCustomerAction,
  persistDeleteVehicleAction,
  persistFaultSearchAction,
  persistMoveAppointmentAction,
  persistPaymentAction,
  persistReplaceCustomerVehicleAction,
  persistToggleVehicleActiveAction,
  persistToggleWorkOrderQuoteItemStatusAction,
  persistUpdateCustomerAction,
  persistUpdateVehicleAction,
  persistUpdateWorkOrderDetailsAction,
  persistUpdateWorkOrderPartRequestStatusAction,
  persistUpdateWorkOrderQuoteStatusAction,
  persistWorkOrderAction,
  persistWorkOrderNoteAction,
  persistWorkOrderStatusAction,
} from "@/app/app/actions";
import type { ServerWorkspaceSnapshot } from "@/server/operations-dal";

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
  isDemo: boolean;
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
    durationMinutes?: number;
    endAt?: string;
    updatedAt?: string;
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
    status?: string,
    durationMinutes?: number,
  ) => boolean;
  updateAppointment: (id: string, values: Record<string, unknown>) => void;
  deleteAppointment: (id: string) => void;
  customers: readonly Customer[];
  vehicles: readonly Vehicle[];
  vehicleFor: (order: WorkOrder) => Vehicle;
  customerFor: (order: WorkOrder) => Customer;
  createRecord: (input: NewRecordInput) => {
    vehicle?: Vehicle;
    customer?: Customer;
    error?: string;
    field?: string;
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
  faultHistory: readonly {
    id: string;
    code: string;
    queriedAt: string;
    vehicleId?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    technicianNotes?: string;
    attachedToOrderId?: string;
  }[];
  saveFaultQuery: (item: {
    code: string;
    vehicleId?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    technicianNotes?: string;
    attachedToOrderId?: string;
  }) => string;
  attachFaultToWorkOrder: (orderId: string, dtcCode: string, titleTr: string, checklist: string[]) => boolean;
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
  initialServerData,
  serverBackendReady = false,
}: {
  children: ReactNode;
  activeTenantInfo?: {
    organizationId?: string;
    branchId?: string;
    organizationName?: string;
    branchName?: string;
    displayName?: string;
    role?: string;
    branchSlug?: string;
    isDemo?: boolean;
  } | null;
  initialServerData?: ServerWorkspaceSnapshot | null;
  serverBackendReady?: boolean;
}) {
  const scope = useMemo(
    () => getStorageScope(activeTenantInfo),
    [activeTenantInfo],
  );

  return (
    <OperationsProvider
      key={`ops-${scope.scopeId}`}
      branchSlug={activeTenantInfo?.branchSlug}
      operationsKey={scope.operationsKey}
      initialServerOperations={initialServerData?.operations ?? null}
    >
      <DemoState
        key={`state-${scope.scopeId}`}
        activeTenantInfo={activeTenantInfo}
        scope={scope}
        initialServerData={initialServerData}
        serverBackendReady={serverBackendReady}
      >
        {children}
      </DemoState>
    </OperationsProvider>
  );
}

function DemoState({
  children,
  activeTenantInfo,
  scope,
  initialServerData,
  serverBackendReady = false,
}: {
  children: ReactNode;
  activeTenantInfo?: {
    organizationId?: string;
    branchId?: string;
    organizationName?: string;
    branchName?: string;
    displayName?: string;
    role?: string;
    branchSlug?: string;
    isDemo?: boolean;
  } | null;
  scope: StorageScope;
  initialServerData?: ServerWorkspaceSnapshot | null;
  serverBackendReady?: boolean;
}) {
  const isDemoMode = activeTenantInfo?.isDemo !== false;
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
    } finally {
      // Force clean reload to ensure layout cookies and state re-mount cleanly
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/app";
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
    scope.customerKey,
    !isDemoMode && initialServerData
      ? initialServerData.customers
      : branchInitialData.customers,
  );
  const [vehicles, setVehicles] = useLocalRepository<readonly Vehicle[]>(
    scope.vehicleKey,
    !isDemoMode && initialServerData
      ? initialServerData.vehicles
      : branchInitialData.vehicles,
  );
  const [orders, setOrders] = useLocalRepository<readonly WorkOrder[]>(
    scope.orderKey,
    !isDemoMode && initialServerData
      ? initialServerData.orders
      : branchInitialData.orders,
  );
  const [branchId, setBranchId] = useLocalRepository<BranchId>(
    scope.branchKey,
    "dortyol",
  );
  const [, setRecent] = useLocalRepository<readonly string[]>(
    scope.recentKey,
    EMPTY_RECENT,
  );

  const initialAppointments = useMemo<DemoContextValue["demoAppointments"]>(() => {
    if (!isDemoMode && initialServerData) {
      return initialServerData.appointments;
    }
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
  }, [isDemoMode, initialServerData, activeBranchProfile, branchInitialData.vehicles]);

  const [demoAppointments, setAppointments] = useLocalRepository<
    DemoContextValue["demoAppointments"]
  >(scope.appointmentKey, initialAppointments);
  const [payments, setPayments] = useLocalRepository<
    DemoContextValue["payments"]
  >(
    scope.paymentKey,
    !isDemoMode && initialServerData ? initialServerData.payments : EMPTY_PAYMENTS,
  );

  const [faultHistory, setFaultHistory] = useLocalRepository<
    DemoContextValue["faultHistory"]
  >(
    scope.faultHistoryKey,
    !isDemoMode && initialServerData ? initialServerData.faultHistory : [],
  );

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

  const customersRef = useRef(customers);
  const vehiclesRef = useRef(vehicles);
  const ordersRef = useRef(orders);
  const appointmentsRef = useRef(demoAppointments);
  const operationsRef = useRef(operations);
  const vehicleMapRef = useRef(vehicleMap);
  const customerMapRef = useRef(customerMap);
  const technicianMapRef = useRef(technicianMap);

  useEffect(() => {
    customersRef.current = customers;
    vehiclesRef.current = vehicles;
    ordersRef.current = orders;
    appointmentsRef.current = demoAppointments;
    operationsRef.current = operations;
    vehicleMapRef.current = vehicleMap;
    customerMapRef.current = customerMap;
    technicianMapRef.current = technicianMap;
  });

  const technicianFor = useCallback(
    (id: string) =>
      technicianMap.get(id) ?? { id, name: "Atanmadı", initials: "AT" },
    [technicianMap],
  );

  const vehicleFor = useCallback(
    (order: WorkOrder) =>
      vehicleMap.get(order.vehicleId) ?? {
        id: order.vehicleId || "unknown-vehicle",
        plate: "Kayıtlı Araç Bulunamadı",
        model: "Bilinmeyen Araç",
        year: null,
        customerId: order.customerId,
        lastService: null,
      },
    [vehicleMap],
  );

  const customerFor = useCallback(
    (order: WorkOrder) =>
      customerMap.get(order.customerId) ?? {
        id: order.customerId || "unknown-customer",
        name: "Kayıtlı Müşteri Bulunamadı",
        phone: "—",
      },
    [customerMap],
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
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. İş emri güncellenemedi.",
        );
        return;
      }
      const prevOrders = ordersRef.current;
      setOrders((current) =>
        current.map((order) =>
          order.id === id
            ? { ...order, ...update, updatedLabel: "Az önce" }
            : order,
        ),
      );
      if (
        !isDemoMode &&
        serverBackendReady &&
        (update.diagnosis !== undefined ||
          update.complaint !== undefined ||
          update.dueAt !== undefined ||
          update.approval !== undefined)
      ) {
        void persistUpdateWorkOrderDetailsAction({
          workOrderId: id,
          diagnosis: update.diagnosis,
          complaint: update.complaint,
          dueAt: update.dueAt,
          approvalStatus: update.approval,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          }
        });
      }
    },
    [isDemoMode, serverBackendReady, setOrders, announce],
  );

  const createCustomer = useCallback(
    (name: string, phone: string, email?: string) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Müşteri kaydedilemedi.",
        );
        return;
      }
      const trimmed = name.trim();
      if (trimmed.length < 2) return;
      const normalized = phone.replace(/\D/g, "").replace(/^90/, "0");
      if (normalized && !/^0\d{10}$/.test(normalized)) return;
      if (
        normalized &&
        customersRef.current.some((c) => c.phone.replace(/\D/g, "") === normalized)
      )
        return;
      const id = crypto.randomUUID();
      const prevCustomers = customersRef.current;
      setCustomers((current) => [
        ...current,
        {
          id,
          name: trimmed,
          phone: normalized,
          email: email?.trim() || undefined,
        },
      ]);
      if (!isDemoMode && serverBackendReady) {
        void persistCreateCustomerAction({
          id,
          fullName: trimmed,
          phone: normalized,
          email: email?.trim() || undefined,
        }).then((res) => {
          if (!res.ok) {
            setCustomers(prevCustomers);
            announce(res.error);
          } else {
            announce("Müşteri veritabanına kaydedildi.");
          }
        });
        return id;
      }
      announce("Müşteri kaydedildi.");
      return id;
    },
    [isDemoMode, serverBackendReady, setCustomers, announce],
  );

  const updateCustomer = useCallback(
    (id: string, values: { name: string; phone: string; email?: string }) => {
      if (!isDemoMode && !serverBackendReady) {
        return "Sunucu veritabanı bağlantısı yapılandırılmamış. Müşteri bilgileri güncellenemedi.";
      }
      const trimmed = values.name.trim();
      if (trimmed.length < 2) return "Müşteri adını kontrol edin.";
      const normalized = values.phone.replace(/\D/g, "").replace(/^90/, "0");
      if (normalized && !/^0\d{10}$/.test(normalized))
        return "Telefon numarası 11 haneli olmalıdır (05xx...).";
      if (
        normalized &&
        customersRef.current.some(
          (c) => c.id !== id && c.phone.replace(/\D/g, "") === normalized,
        )
      )
        return "Bu telefon numarası başka bir müşteride kayıtlı.";
      const prevCustomers = customersRef.current;
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
      if (!isDemoMode && serverBackendReady) {
        void persistUpdateCustomerAction({
          customerId: id,
          fullName: trimmed,
          phone: normalized,
          email: values.email?.trim() || null,
        }).then((res) => {
          if (!res.ok) {
            setCustomers(prevCustomers);
            announce(res.error);
          } else {
            announce("Müşteri bilgileri veritabanında güncellendi.");
          }
        });
        return;
      }
      announce("Müşteri bilgileri güncellendi.");
    },
    [isDemoMode, serverBackendReady, setCustomers, announce],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      if (!isDemoMode && !serverBackendReady) {
        const msg =
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Müşteri silinemedi.";
        announce(msg);
        return msg;
      }
      if (ordersRef.current.some((o) => o.customerId === id))
        return "Bu müşteriye ait iş emri bulunduğu için silinemez.";
      const prevCustomers = customersRef.current;
      const prevVehicles = vehiclesRef.current;
      setVehicles((current) => current.filter((v) => v.customerId !== id));
      setCustomers((current) => current.filter((c) => c.id !== id));
      if (!isDemoMode && serverBackendReady) {
        void persistDeleteCustomerAction({ customerId: id }).then((res) => {
          if (!res.ok) {
            setCustomers(prevCustomers);
            setVehicles(prevVehicles);
            announce(res.error);
          } else {
            announce("Müşteri kaydı veritabanından silindi.");
          }
        });
        return;
      }
      announce("Müşteri kaydı silindi.");
    },
    [isDemoMode, serverBackendReady, setVehicles, setCustomers, announce],
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
      if (!isDemoMode && !serverBackendReady) {
        return "Sunucu veritabanı bağlantısı yapılandırılmamış. Araç bilgileri güncellenemedi.";
      }
      const plate = formatPlate(values.plate);
      if (!plate)
        return "Geçerli bir plaka girin. Örnek: 31 ABC 123.";
      if (
        vehiclesRef.current.some(
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
      if (!customerMapRef.current.has(values.customerId))
        return "Geçerli bir müşteri seçin.";
      const brandTrim = values.brand?.trim() || "";
      const modelTrim = values.model.trim();
      const combinedModel =
        brandTrim &&
        modelTrim &&
        !modelTrim.toLowerCase().startsWith(brandTrim.toLowerCase())
          ? `${brandTrim} ${modelTrim}`
          : modelTrim || brandTrim || "Model belirtilmedi";
      const prevVehicles = vehiclesRef.current;
      const prevOrders = ordersRef.current;
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
      if (!isDemoMode && serverBackendReady) {
        void persistUpdateVehicleAction({
          vehicleId: id,
          plate,
          brand: brandTrim || undefined,
          model: combinedModel,
          year: values.year,
          kilometer: values.mileage ?? undefined,
          fuelType: values.fuelType ?? undefined,
          active: values.active,
        }).then((res) => {
          if (!res.ok) {
            setVehicles(prevVehicles);
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce("Araç bilgileri veritabanında güncellendi.");
          }
        });
        return;
      }
      announce("Araç bilgileri güncellendi.");
    },
    [isDemoMode, serverBackendReady, setVehicles, setOrders, announce],
  );

  const toggleVehicleActive = useCallback(
    (id: string, active: boolean) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Araç durumu güncellenemedi.",
        );
        return;
      }
      const prevVehicles = vehiclesRef.current;
      setVehicles((current) =>
        current.map((v) => (v.id === id ? { ...v, active } : v)),
      );
      if (!isDemoMode && serverBackendReady) {
        void persistToggleVehicleActiveAction({ vehicleId: id, active }).then(
          (res) => {
            if (!res.ok) {
              setVehicles(prevVehicles);
              announce(res.error);
            } else {
              announce(
                active
                  ? "Araç aktif araç olarak işaretlendi."
                  : "Araç önceki (pasif) araçlar arasına alındı.",
              );
            }
          },
        );
        return;
      }
      announce(
        active
          ? "Araç aktif araç olarak işaretlendi."
          : "Araç önceki (pasif) araçlar arasına alındı.",
      );
    },
    [isDemoMode, serverBackendReady, setVehicles, announce],
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
      if (!isDemoMode && !serverBackendReady) {
        const msg =
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Araç değişimi kaydedilemedi.";
        announce(msg);
        return { error: msg };
      }
      const plate = formatPlate(input.plate);
      if (!plate)
        return { error: "Geçerli bir plaka girin. Örnek: 31 XYZ 456." };
      if (
        vehiclesRef.current.some(
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
      const newVehicleId = crypto.randomUUID();
      const newVehicle: Vehicle = {
        id: isDemoMode ? `v-${newVehicleId}` : newVehicleId,
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
      const prevVehicles = vehiclesRef.current;
      setVehicles((current) => [
        ...current.map((v) =>
          v.id === oldVehicleId ? { ...v, active: false } : v,
        ),
        newVehicle,
      ]);
      if (!isDemoMode && serverBackendReady) {
        void persistReplaceCustomerVehicleAction({
          customerId,
          oldVehicleId,
          newVehicleId,
          plate,
          brand: brandTrim || "Belirtilmedi",
          model: combinedModel,
          year: input.year,
          kilometer: newVehicle.mileage ?? 0,
          fuelType: newVehicle.fuelType ?? null,
        }).then((res) => {
          if (!res.ok) {
            setVehicles(prevVehicles);
            announce(res.error);
          } else {
            announce(
              `Önceki araç geçmişe alındı ve ${plate} yeni aktif araç olarak kaydedildi.`,
            );
          }
        });
        return { vehicle: newVehicle };
      }
      announce(
        `Önceki araç geçmişe alındı ve ${plate} yeni aktif araç olarak kaydedildi.`,
      );
      return { vehicle: newVehicle };
    },
    [isDemoMode, serverBackendReady, setVehicles, announce],
  );

  const deleteVehicle = useCallback(
    (id: string) => {
      if (!isDemoMode && !serverBackendReady) {
        const msg =
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Araç silinemedi.";
        announce(msg);
        return msg;
      }
      if (ordersRef.current.some((o) => o.vehicleId === id))
        return "Bu araca ait iş emri bulunduğu için silinemez.";
      const prevVehicles = vehiclesRef.current;
      const prevAppointments = appointmentsRef.current;
      setAppointments((current) => current.filter((a) => a.vehicleId !== id));
      setVehicles((current) => current.filter((v) => v.id !== id));
      if (!isDemoMode && serverBackendReady) {
        void persistDeleteVehicleAction({ vehicleId: id }).then((res) => {
          if (!res.ok) {
            setVehicles(prevVehicles);
            setAppointments(prevAppointments);
            announce(res.error);
          } else {
            announce("Araç kaydı veritabanından silindi.");
          }
        });
        return;
      }
      announce("Araç kaydı silindi.");
    },
    [isDemoMode, serverBackendReady, setAppointments, setVehicles, announce],
  );

  const assignTechnician = useCallback(
    (orderId: string, technicianId: string) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. İşletme verisi kaydedilemedi.",
        );
        return false;
      }
      const tech = technicianMapRef.current.get(technicianId);
      if (!tech) return false;
      const prevOrders = ordersRef.current;
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
      if (!isDemoMode && serverBackendReady) {
        void persistAssignTechnicianAction({
          workOrderId: orderId,
          staffMemberId: technicianId,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce(`Sorumlu usta güncellendi: ${tech.name}.`);
          }
        });
        return true;
      }
      announce(`Sorumlu usta güncellendi: ${tech.name}.`);
      return true;
    },
    [isDemoMode, serverBackendReady, setOrders, announce],
  );

  const collectPayment = useCallback(
    (id: string, amount: number) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Tahsilat kaydedilemedi.",
        );
        return false;
      }
      let success = false;
      const prevOrders = ordersRef.current;
      const prevPayments = payments;
      setOrders((current) => {
        const order = current.find((item) => item.id === id);
        if (
          !order ||
          order.status === "CANCELLED" ||
          !Number.isFinite(amount) ||
          amount <= 0 ||
          amount > Math.round((order.total - order.paid) * 100) / 100
        )
          return current;
        success = true;
        return current.map((item) =>
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
        );
      });
      if (success) {
        setPayments((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            orderId: id,
            amount,
            at: new Date().toISOString(),
          },
        ]);
        if (!isDemoMode && serverBackendReady) {
          void persistPaymentAction({ workOrderId: id, amount }).then((res) => {
            if (!res.ok) {
              setOrders(prevOrders);
              setPayments(prevPayments);
              announce(res.error);
            } else {
              announce("Tahsilat veritabanına kaydedildi.");
            }
          });
          return true;
        }
        announce("Tahsilat kaydedildi.");
        return true;
      }
      return false;
    },
    [isDemoMode, serverBackendReady, payments, setOrders, setPayments, announce],
  );

  const updateAppointment = useCallback(
    (id: string, values: Record<string, unknown>) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Randevu taşınamadı.",
        );
        return;
      }
      const prev = appointmentsRef.current;
      setAppointments((current) =>
        current.map((a) => {
          if (a.id !== id) return a;
          const updated = { ...a, ...values, updatedAt: new Date().toISOString() };
          return updated;
        }),
      );
      if (!isDemoMode && serverBackendReady && typeof values.at === "string") {
        void persistMoveAppointmentAction({
          appointmentId: id,
          startsAt: values.at,
          durationMinutes:
            typeof values.durationMinutes === "number"
              ? values.durationMinutes
              : undefined,
          staffMemberId:
            typeof values.technicianId === "string" ? values.technicianId : undefined,
          status: typeof values.status === "string" ? values.status : undefined,
          serviceNote: typeof values.note === "string" ? values.note : undefined,
        }).then((res) => {
          if (!res.ok) {
            setAppointments(prev);
            announce(res.error);
          } else {
            announce("Randevu güncellendi.");
          }
        });
        return;
      }
      announce("Randevu güncellendi.");
    },
    [isDemoMode, serverBackendReady, setAppointments, announce],
  );

  const deleteAppointment = useCallback(
    (id: string) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Randevu silinemedi.",
        );
        return;
      }
      const prev = appointmentsRef.current;
      setAppointments((current) => current.filter((a) => a.id !== id));
      if (!isDemoMode && serverBackendReady) {
        void persistDeleteAppointmentAction({ appointmentId: id }).then(
          (res) => {
            if (!res.ok) {
              setAppointments(prev);
              announce(res.error);
            } else {
              announce("Randevu veritabanından silindi.");
            }
          },
        );
        return;
      }
      announce("Randevu silindi.");
    },
    [isDemoMode, serverBackendReady, setAppointments, announce],
  );

  const addAppointment = useCallback(
    (
      vehicleId: string,
      at: string,
      note: string,
      technicianId?: string,
      status?: string,
      durationMinutes?: number,
    ) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Randevu kaydedilemedi.",
        );
        return false;
      }
      if (
        !vehicleMapRef.current.has(vehicleId) ||
        !Number.isFinite(Date.parse(at))
      )
        return false;
      if (
        appointmentsRef.current.some(
          (a) => a.vehicleId === vehicleId && a.at === at,
        )
      )
        return false;
      const duration = durationMinutes && durationMinutes >= 15 ? durationMinutes : 60;
      const startDate = new Date(at);
      const endDate = new Date(startDate.getTime() + duration * 60000);
      const prev = appointmentsRef.current;
      const tempId = crypto.randomUUID();
      setAppointments((current) => [
        ...current,
        {
          id: tempId,
          vehicleId,
          at,
          durationMinutes: duration,
          endAt: endDate.toISOString(),
          updatedAt: new Date().toISOString(),
          note: note.trim(),
          branchId,
          technicianId: technicianId || undefined,
          status: status || "Planlandı",
        },
      ]);
      if (!isDemoMode && serverBackendReady) {
        const veh = vehicleMapRef.current.get(vehicleId);
        void persistAppointmentAction({
          vehicleId,
          customerId: veh?.customerId,
          staffMemberId: technicianId || null,
          startsAt: startDate.toISOString(),
          durationMinutes: duration,
          serviceNote: note.trim(),
          status: status || "Planlandı",
        }).then((res) => {
          if (!res.ok) {
            setAppointments(prev);
            announce(res.error);
          } else {
            announce("Randevu kaydedildi.");
          }
        });
        return true;
      }
      announce("Randevu kaydedildi.");
      return true;
    },
    [isDemoMode, serverBackendReady, setAppointments, branchId, announce],
  );

  const saveFaultQuery = useCallback(
    (item: {
      code: string;
      vehicleId?: string;
      vehiclePlate?: string;
      vehicleModel?: string;
      technicianNotes?: string;
      attachedToOrderId?: string;
    }) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Arıza sorgusu kaydedilemedi.",
        );
        return "";
      }
      const id = `fault-q-${crypto.randomUUID()}`;
      const prevHistory = faultHistory;
      setFaultHistory((current) => [
        {
          id,
          code: item.code.toUpperCase(),
          queriedAt: new Date().toISOString(),
          vehicleId: item.vehicleId,
          vehiclePlate: item.vehiclePlate,
          vehicleModel: item.vehicleModel,
          technicianNotes: item.technicianNotes,
          attachedToOrderId: item.attachedToOrderId,
        },
        ...current.slice(0, 49), // Son 50 sorguyu tut
      ]);
      if (!isDemoMode && serverBackendReady) {
        void persistFaultSearchAction({
          dtcCode: item.code,
          vehicleId: item.vehicleId,
          vehiclePlate: item.vehiclePlate,
          vehicleModel: item.vehicleModel,
          technicianNotes: item.technicianNotes,
        })
          .then((res) => {
            if (!res.ok) {
              setFaultHistory(prevHistory);
              announce(res.error);
            } else {
              announce("Arıza kodu sorgusu geçmişe kaydedildi.");
            }
          })
          .catch(() => {
            setFaultHistory(prevHistory);
            announce("Sunucu bağlantısı kesildi. Arıza sorgusu kaydedilemedi.");
          });
        return id;
      }
      announce("Arıza kodu sorgusu geçmişe kaydedildi.");
      return id;
    },
    [isDemoMode, serverBackendReady, faultHistory, setFaultHistory, announce],
  );

  const attachFaultToWorkOrder = useCallback(
    (orderId: string, dtcCode: string, titleTr: string, checklist: string[]) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Arıza kodu iş emrine eklenemedi.",
        );
        return false;
      }
      const order = ordersRef.current.find((o) => o.id === orderId);
      if (!order) return false;
      const prevOrders = ordersRef.current;

      const newTimelineItem = {
        id: `h-dtc-${crypto.randomUUID()}`,
        time: nowTimeLabel(),
        text: `Arıza Kodu Eklendi: [${dtcCode}] ${titleTr}`,
      };

      const newNote = {
        id: `n-dtc-${crypto.randomUUID()}`,
        author: currentUser.name,
        role: currentUser.role,
        time: nowDateTimeLabel(),
        text: `OBD-II Arıza Tespiti:\nKod: ${dtcCode} — ${titleTr}\nKontrol Sırası:\n${checklist.map((c, i) => `${i + 1}. ${c}`).join("\n")}`,
      };

      setOrders((current) =>
        current.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            complaint: o.complaint ? `${o.complaint} (DTC: ${dtcCode})` : `DTC: ${dtcCode}`,
            diagnosis: o.diagnosis ? `${o.diagnosis}\n[OBD: ${dtcCode}] ${titleTr}` : `[OBD: ${dtcCode}] ${titleTr}`,
            timeline: [...o.timeline, newTimelineItem],
            notes: [...o.notes, newNote],
          };
        }),
      );
      if (!isDemoMode && serverBackendReady) {
        void persistAttachFaultToWorkOrderAction({
          workOrderId: orderId,
          dtcCode,
          titleTr,
          checklist,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce(`Arıza kodu ${orderId} iş emrine kaydedildi.`);
          }
        });
        return true;
      }
      announce(`Arıza kodu ${orderId} iş emrine eklendi.`);
      return true;
    },
    [isDemoMode, serverBackendReady, setOrders, currentUser, announce],
  );

  const createRecord = useCallback(
    (input: NewRecordInput) => {
      // 1. Plaka doğrulaması
      const plateResult = parseAndValidatePlate(input.plate);
      if (!plateResult.valid || !plateResult.formatted) {
        return {
          field: "plate",
          error: plateResult.error || "Geçerli bir plaka girin (Örn: 31 ABC 123).",
        };
      }
      const plate = plateResult.formatted;

      if (
        vehiclesRef.current.some(
          (item) => normalizeSearch(item.plate) === normalizeSearch(plate),
        )
      ) {
        return {
          field: "plate",
          error: "Bu plaka zaten kayıtlı. Mevcut araç kaydını seçin.",
        };
      }

      // 2. Model yılı doğrulaması
      if (
        input.year !== null &&
        input.year !== undefined &&
        (!Number.isInteger(input.year) ||
          input.year < 1950 ||
          input.year > 2027)
      ) {
        return {
          field: "year",
          error: "Model yılı giriyorsanız 1950–2027 arasında olmalıdır.",
        };
      }

      // 3. Kilometre doğrulaması
      if (
        input.mileage !== null &&
        input.mileage !== undefined &&
        (!Number.isFinite(input.mileage) ||
          input.mileage < 0 ||
          input.mileage > 2000000)
      ) {
        return {
          field: "mileage",
          error: "Kilometre 0 ile 2.000.000 arasında olmalıdır.",
        };
      }

      // 4. Müşteri doğrulaması
      let customer = input.customerId
        ? customerMapRef.current.get(input.customerId)
        : undefined;
      if (input.customerId && !customer) {
        return { field: "general", error: "Müşteri bulunamadı." };
      }

      let createdNewCustomer: Customer | undefined = undefined;

      if (!customer) {
        const nameTrim = input.name?.trim() || "";
        if (nameTrim.length < 2) {
          return {
            field: "name",
            error: "Müşteri adını ve soyadını girin (en az 2 karakter).",
          };
        }

        const phoneResult = parseAndValidatePhone(input.phone);
        if (!phoneResult.valid || !phoneResult.formatted) {
          return {
            field: "phone",
            error:
              phoneResult.error ||
              "Geçerli bir telefon numarası girin (Örn: 0532 555 01 42).",
          };
        }
        const formattedPhone = phoneResult.formatted;
        const normPhone = formattedPhone.replace(/\D/g, "");

        if (
          customersRef.current.some(
            (item) => item.phone.replace(/\D/g, "") === normPhone,
          )
        ) {
          return {
            field: "phone",
            error:
              "Bu telefonla kayıtlı bir müşteri zaten var. Mevcut müşteri listesinden seçin.",
          };
        }

        const emailResult = validateEmail(input.email || "");
        if (!emailResult.valid) {
          return {
            field: "email",
            error:
              emailResult.error ||
              "Geçerli bir e-posta adresi girin (Örn: ornek@eposta.com).",
          };
        }

        createdNewCustomer = {
          id: `c-${crypto.randomUUID()}`,
          name: nameTrim,
          phone: formattedPhone,
          email: input.email?.trim() || undefined,
        };
        customer = createdNewCustomer;
      }

      // 5. Araç kaydını hazırla
      const brandTrim = input.brand?.trim() || "";
      const modelTrim = input.model?.trim() || "";
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
        year: input.year ? Number(input.year) : null,
        mileage:
          input.mileage && Number.isFinite(input.mileage) && input.mileage > 0
            ? Math.round(input.mileage)
            : undefined,
        fuelType: input.fuelType?.trim() || undefined,
        active: true,
        customerId: customer.id,
        lastService: null,
      };

      if (!isDemoMode && !serverBackendReady) {
        const msg =
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Gerçek işletme verileri tarayıcıya kaydedilmez.";
        announce(msg);
        return { field: "general", error: msg };
      }

      // 6. Atomik Kayıt (Tutarlı ve eksiksiz kayıt)
      const prevCustomers = customersRef.current;
      const prevVehicles = vehiclesRef.current;
      if (createdNewCustomer) {
        setCustomers((current) => [...current, createdNewCustomer!]);
      }
      setVehicles((current) => [...current, vehicle]);

      if (!isDemoMode && serverBackendReady) {
        void persistCustomerAndVehicleAction({
          customerId: input.customerId || undefined,
          fullName: customer.name,
          phone: customer.phone,
          email: customer.email,
          plate: vehicle.plate,
          brand: brandTrim || "Belirtilmedi",
          model: combinedModel,
          year: vehicle.year,
          kilometer: vehicle.mileage ?? 0,
          fuelType: vehicle.fuelType ?? null,
        }).then((res) => {
          if (!res.ok) {
            setCustomers(prevCustomers);
            setVehicles(prevVehicles);
            announce(res.error);
          } else {
            announce("Müşteri ve araç veritabanına kaydedildi.");
          }
        });
        return { vehicle, customer };
      }

      announce("Müşteri ve araç başarıyla kaydedildi.");
      return { vehicle, customer };
    },
    [isDemoMode, serverBackendReady, setCustomers, setVehicles, announce],
  );

  const acceptVehicle = useCallback(
    (input: IntakeInput) => {
      if (!isDemoMode && !serverBackendReady) {
        const msg =
          "Sunucu veritabanı bağlantısı yapılandırılmamış. İş emri oluşturulamadı.";
        announce(msg);
        return { error: msg };
      }
      const vehicle = vehicleMapRef.current.get(input.vehicleId);
      if (!vehicle) return { error: "Önce bir araç seçin." };
      if (
        ordersRef.current.some(
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
        operationsRef.current.settings.checklist !== "İsteğe bağlı" &&
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
          ...ordersRef.current.map((item) => Number(item.id.split("-").at(-1)) || 0),
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
      const prevOrders = ordersRef.current;
      setOrders((current) => [order, ...current]);
      if (!isDemoMode && serverBackendReady) {
        void persistWorkOrderAction({
          customerId: vehicle.customerId,
          vehicleId: vehicle.id,
          primaryTechnicianId: input.technicianId,
          complaint: input.complaint.trim(),
          diagnosis: "Tespit bekleniyor.",
          intakeKilometer: input.mileage,
          fuelLevel: input.fuel,
          intakeChecklistJson: input.checklist,
          dueAt: input.dueAt,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce(`${vehicle.plate} için iş emri veritabanına kaydedildi.`);
          }
        });
        return { orderId: id };
      }
      announce(`${vehicle.plate} için ${id} oluşturuldu.`);
      return { orderId: id };
    },
    [isDemoMode, serverBackendReady, technicians, branchId, setOrders, announce],
  );

  const changeStatus = useCallback(
    (id: string, status: WorkOrderStatus) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. İş emri durumu güncellenemedi.",
        );
        return;
      }
      const prevOrders = ordersRef.current;
      const currentOrder = ordersRef.current.find((order) => order.id === id);
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
      if (!isDemoMode && serverBackendReady) {
        void persistWorkOrderStatusAction({
          workOrderId: id,
          status,
          description: statusTimelineText[status],
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce(`Durum güncellendi: ${statuses[status].label}.`);
          }
        });
        return;
      }
      announce(`Durum güncellendi: ${statuses[status].label}.`);
    },
    [isDemoMode, serverBackendReady, setVehicles, setOrders, announce],
  );

  const quickTechnicianAction = useCallback(
    (id: string, status: WorkOrderStatus, actorName?: string) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. İşlem kaydedilemedi.",
        );
        return false;
      }
      let updated = false;
      let blockedMessage = "";
      let timelineMessage = "";
      const prevOrders = ordersRef.current;

      const actionMap: Partial<Record<WorkOrderStatus, string>> = {
        IN_PROGRESS: "işlemi başlattı",
        WAITING_PARTS: "işi beklemeye aldı (Parça Bekleniyor)",
        QUALITY_CONTROL: "son kontrolü başlattı",
        READY: "son kontrolü tamamladı · Araç hazır",
      };

      setOrders((current) => {
        const currentOrder = current.find((order) => order.id === id);
        if (!currentOrder || currentOrder.status === status) return current;

        if (
          status === "IN_PROGRESS" &&
          currentOrder.status === "AWAITING_APPROVAL" &&
          currentOrder.approval === "PENDING"
        ) {
          blockedMessage = "Önce müşteri onayının kaydedilmesi gerekiyor.";
          return current;
        }

        updated = true;
        const actor =
          actorName || technicianFor(currentOrder.technicianId).name || "Usta";
        const verb = actionMap[status] ?? `durumu güncelledi: ${statuses[status].label}`;
        timelineMessage = `${actor} ${verb}`;

        return current.map((order) =>
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
                    text: timelineMessage,
                  },
                ],
              }
            : order,
        );
      });

      if (blockedMessage) {
        announce(blockedMessage);
        return false;
      }
      if (updated) {
        if (!isDemoMode && serverBackendReady) {
          void persistWorkOrderStatusAction({
            workOrderId: id,
            status,
            description: timelineMessage,
          }).then((res) => {
            if (!res.ok) {
              setOrders(prevOrders);
              announce(res.error);
            } else {
              announce(`${statuses[status].label} olarak işaretlendi.`);
            }
          });
          return true;
        }
        announce(`${statuses[status].label} olarak işaretlendi.`);
        return true;
      }
      return false;
    },
    [isDemoMode, serverBackendReady, technicianFor, setOrders, announce],
  );

  const addNote = useCallback(
    (id: string, text: string, author = "Ahmet") => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Not kaydedilemedi.",
        );
        return;
      }
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > 2000) return;
      const cleanAuthor = author.trim() || "Ahmet";
      const prevOrders = ordersRef.current;
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
      if (!isDemoMode && serverBackendReady) {
        void persistWorkOrderNoteAction({
          workOrderId: id,
          content: trimmed,
          authorName: cleanAuthor,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce("Personel iç notu veritabanına kaydedildi.");
          }
        });
        return;
      }
      announce("Personel iç notu kaydedildi.");
    },
    [isDemoMode, serverBackendReady, setOrders, announce],
  );

  const recordApproval = useCallback(
    (id: string, channel: string) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Müşteri onayı kaydedilemedi.",
        );
        return;
      }
      const prevOrders = ordersRef.current;
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
      if (!isDemoMode && serverBackendReady) {
        void persistUpdateWorkOrderQuoteStatusAction({
          workOrderId: id,
          status: "APPROVED",
          channel,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce("Müşteri onayı veritabanına kaydedildi.");
          }
        });
        return;
      }
      announce("Müşteri onayı kaydedildi.");
    },
    [isDemoMode, serverBackendReady, setOrders, announce],
  );

  const addQuoteItem = useCallback(
    (
      orderId: string,
      item: Omit<QuoteItem, "id" | "total" | "status">,
    ) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Teklif kalemi eklenemedi.",
        );
        return;
      }
      const laborAmount = Math.max(0, Number(item.laborAmount) || 0);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const total =
        Math.round((laborAmount + quantity * unitPrice) * 100) / 100;
      const itemId = crypto.randomUUID();
      const newItem: QuoteItem = {
        id: isDemoMode ? `qi-${itemId}` : itemId,
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
      const prevOrders = ordersRef.current;
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
      if (!isDemoMode && serverBackendReady) {
        void persistAddWorkOrderQuoteItemAction({
          workOrderId: orderId,
          itemId,
          operation: newItem.operation,
          laborAmount,
          inventoryItemId: newItem.partId || null,
          partName: newItem.partName || null,
          quantity,
          unitPrice,
          note: newItem.note || null,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce("Teklif kalemi veritabanına kaydedildi.");
          }
        });
        return;
      }
      announce("Teklif kalemi eklendi (Müşteri onayı bekliyor).");
    },
    [isDemoMode, serverBackendReady, setOrders, announce],
  );

  const setQuoteStatus = useCallback(
    (orderId: string, quoteStatus: QuoteStatus, channel = "Telefon") => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Teklif durumu güncellenemedi.",
        );
        return;
      }
      const prevOrders = ordersRef.current;
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
      if (!isDemoMode && serverBackendReady) {
        void persistUpdateWorkOrderQuoteStatusAction({
          workOrderId: orderId,
          status: quoteStatus,
          channel,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce(
              `Teklif durumu güncellendi: ${quoteStatusMeta[quoteStatus].label}.`,
            );
          }
        });
        return;
      }
      announce(`Teklif durumu güncellendi: ${quoteStatusMeta[quoteStatus].label}.`);
    },
    [isDemoMode, serverBackendReady, setOrders, announce],
  );

  const toggleQuoteItemStatus = useCallback(
    (
      orderId: string,
      itemId: string,
      nextStatus: "APPROVED" | "REJECTED" | "PENDING",
    ) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Teklif kalemi güncellenemedi.",
        );
        return;
      }
      const prevOrders = ordersRef.current;
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
      if (
        !isDemoMode &&
        serverBackendReady &&
        (nextStatus === "APPROVED" || nextStatus === "REJECTED")
      ) {
        void persistToggleWorkOrderQuoteItemStatusAction({
          workOrderId: orderId,
          quoteItemId: itemId,
          nextStatus,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce("Teklif kalemi durumu veritabanında güncellendi.");
          }
        });
        return;
      }
      announce("Teklif kalemi durumu güncellendi.");
    },
    [isDemoMode, serverBackendReady, setOrders, announce],
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
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Parça talebi oluşturulamadı.",
        );
        return;
      }
      const partName = input.partName.trim();
      const quantity = Math.max(1, Math.round(Number(input.quantity) || 1));
      if (!partName) return;
      const requestedAt = nowTimeLabel();
      const reqId = crypto.randomUUID();
      const prevOrders = ordersRef.current;
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                updatedLabel: "Az önce",
                partRequests: [
                  ...(order.partRequests ?? []),
                  {
                    id: isDemoMode ? `pr-${reqId}` : reqId,
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
      if (!isDemoMode && serverBackendReady) {
        void persistCreateWorkOrderPartRequestAction({
          id: reqId,
          workOrderId: orderId,
          inventoryItemId: input.partId || null,
          partName,
          quantity,
          requestedBy: input.requestedBy || "Usta",
          note: input.note?.trim() || null,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            announce(res.error);
          } else {
            announce(`Parça talebi veritabanına kaydedildi: ${partName}.`);
          }
        });
        return;
      }
      announce(`Parça talebi oluşturuldu: ${partName} (${quantity} adet).`);
    },
    [isDemoMode, serverBackendReady, setOrders, announce],
  );

  const updatePartRequestStatus = useCallback(
    (orderId: string, requestId: string, status: PartRequestStatus) => {
      if (!isDemoMode && !serverBackendReady) {
        announce(
          "Sunucu veritabanı bağlantısı yapılandırılmamış. Parça talebi güncellenemedi.",
        );
        return;
      }
      const targetOrder = ordersRef.current.find((o) => o.id === orderId);
      const targetReq = targetOrder?.partRequests?.find(
        (r) => r.id === requestId,
      );
      if (!targetOrder || !targetReq || targetReq.status === status) return;
      const prevOrders = ordersRef.current;
      const prevOps = operationsRef.current;

      let reservedStockPart: {
        id: string;
        name: string;
        price: number;
        cost: number;
      } | null = null;

      if (status === "DELIVERED" && targetReq.partId) {
        const stockPart = operationsRef.current.parts.find(
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
      if (!isDemoMode && serverBackendReady) {
        void persistUpdateWorkOrderPartRequestStatusAction({
          workOrderId: orderId,
          requestId,
          status,
        }).then((res) => {
          if (!res.ok) {
            setOrders(prevOrders);
            updateOperations(() => prevOps);
            announce(res.error);
          } else {
            announce(
              `Parça talebi güncellendi: ${partRequestStatuses[status].label}.`,
            );
          }
        });
        return;
      }
      announce(
        `Parça talebi güncellendi: ${partRequestStatuses[status].label}.`,
      );
    },
    [isDemoMode, serverBackendReady, updateOperations, setOrders, announce],
  );

  const contextValue = useMemo<DemoContextValue>(
    () => ({
      isDemo: isDemoMode,
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
      deleteAppointment,
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
      faultHistory,
      saveFaultQuery,
      attachFaultToWorkOrder,
      notice: "",
      announce,
    }),
    [
      isDemoMode,
      currentUser,
      activeBranchProfile,
      switchBranch,
      faultHistory,
      saveFaultQuery,
      attachFaultToWorkOrder,
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
      deleteAppointment,
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
