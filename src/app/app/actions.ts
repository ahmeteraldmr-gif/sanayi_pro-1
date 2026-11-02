"use server";

import { revalidatePath } from "next/cache";
import {
  loadTenantWorkspaceSnapshot,
  serverAddWorkOrderLabor,
  serverAddWorkOrderNote,
  serverAssignTechnician,
  serverCreateAppointment,
  serverCreateCustomerAndVehicle,
  serverCreateInventoryItem,
  serverCreateStaffMember,
  serverCreateWorkOrder,
  serverMoveAppointment,
  serverRecordFaultSearch,
  serverRecordPayment,
  serverUpdateWorkOrderStatus,
  serverUseInventoryPart,
  type ServerWorkspaceSnapshot,
} from "@/server/operations-dal";
import { AccessError, backendConfigured, checkRateLimit } from "@/server/security";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: string; error: string };

const BACKEND_MISSING_ERROR =
  "Sunucu veritabanı bağlantısı yapılandırılmamış. Gerçek işletme verileri tarayıcıya kaydedilmez.";

async function runAuthorizedAction<T>(
  actionName: string,
  work: () => Promise<T>,
): Promise<ActionResult<T>> {
  if (!backendConfigured()) {
    return {
      ok: false,
      code: "CONFIGURATION",
      error: BACKEND_MISSING_ERROR,
    };
  }
  try {
    checkRateLimit(`action:${actionName}`, 60, 60_000);
    const data = await work();
    revalidatePath("/app");
    return { ok: true, data };
  } catch (err) {
    if (err instanceof AccessError) {
      return {
        ok: false,
        code: err.code,
        error:
          err.message && err.message !== err.code
            ? err.message
            : "İşlem yetki veya doğrulama nedeniyle reddedildi.",
      };
    }
    return {
      ok: false,
      code: "UNAVAILABLE",
      error: "Sunucu işlemi tamamlanamadı. Lütfen bağlantınızı kontrol edin.",
    };
  }
}

export async function fetchTenantWorkspaceAction(): Promise<
  ActionResult<ServerWorkspaceSnapshot>
> {
  return runAuthorizedAction("workspace.read", () =>
    loadTenantWorkspaceSnapshot(),
  );
}

export async function persistCustomerAndVehicleAction(input: {
  customerId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  plate: string;
  brand: string;
  model: string;
  year?: number | null;
  kilometer?: number | null;
  fuelType?: string | null;
}) {
  return runAuthorizedAction("customer_vehicle.create", () =>
    serverCreateCustomerAndVehicle(input),
  );
}

export async function persistWorkOrderAction(input: {
  customerId: string;
  vehicleId: string;
  primaryTechnicianId?: string | null;
  complaint: string;
  diagnosis?: string;
  intakeKilometer?: number | null;
  fuelLevel?: number | null;
  intakeChecklistJson?: Record<string, unknown> | null;
  dueAt?: string | null;
}) {
  return runAuthorizedAction("work_order.create", () =>
    serverCreateWorkOrder(input),
  );
}

export async function persistAssignTechnicianAction(input: {
  workOrderId: string;
  staffMemberId: string;
}) {
  return runAuthorizedAction("work_order.assign", () =>
    serverAssignTechnician(input),
  );
}

export async function persistWorkOrderStatusAction(input: {
  workOrderId: string;
  status: string;
  description?: string;
}) {
  return runAuthorizedAction("work_order.status", () =>
    serverUpdateWorkOrderStatus(input),
  );
}

export async function persistWorkOrderNoteAction(input: {
  workOrderId: string;
  content: string;
  authorName?: string;
}) {
  return runAuthorizedAction("work_order.note", () =>
    serverAddWorkOrderNote(input),
  );
}

export async function persistAppointmentAction(input: {
  vehicleId: string;
  customerId?: string | null;
  staffMemberId?: string | null;
  startsAt: string;
  durationMinutes?: number;
  serviceNote: string;
  status?: string;
}) {
  return runAuthorizedAction("appointment.create", () =>
    serverCreateAppointment(input),
  );
}

export async function persistMoveAppointmentAction(input: {
  appointmentId: string;
  startsAt: string;
  durationMinutes?: number;
  staffMemberId?: string | null;
  status?: string;
  serviceNote?: string;
}) {
  return runAuthorizedAction("appointment.move", () =>
    serverMoveAppointment(input),
  );
}

export async function persistUseInventoryPartAction(input: {
  workOrderId: string;
  inventoryItemId: string;
  quantity: number;
  note?: string;
}) {
  return runAuthorizedAction("inventory.use_part", () =>
    serverUseInventoryPart(input),
  );
}

export async function persistCreateInventoryItemAction(input: {
  supplierId?: string | null;
  sku: string;
  name: string;
  stockQty: number;
  minStockQty?: number;
  unitPrice: number;
  unitCost: number;
}) {
  return runAuthorizedAction("inventory.create", () =>
    serverCreateInventoryItem(input),
  );
}

export async function persistWorkOrderLaborAction(input: {
  workOrderId: string;
  name: string;
  hours?: number;
  hourlyRate: number;
}) {
  return runAuthorizedAction("work_order.labor", () =>
    serverAddWorkOrderLabor(input),
  );
}

export async function persistPaymentAction(input: {
  workOrderId: string;
  amount: number;
  paymentMethod?: string;
  referenceNo?: string;
  note?: string;
}) {
  return runAuthorizedAction("finance.payment", () =>
    serverRecordPayment(input),
  );
}

export async function persistFaultSearchAction(input: {
  dtcCode: string;
  vehicleId?: string | null;
  vehiclePlate?: string;
  vehicleModel?: string;
  technicianNotes?: string;
}) {
  return runAuthorizedAction("fault.search", () =>
    serverRecordFaultSearch(input),
  );
}

export async function persistCreateStaffAction(input: {
  userId?: string | null;
  fullName: string;
  roleTitle?: string;
  specialty?: string;
  phone?: string;
  email?: string;
}) {
  return runAuthorizedAction("team.create", () =>
    serverCreateStaffMember(input),
  );
}
