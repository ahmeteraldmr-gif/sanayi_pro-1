import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { TenantTransaction } from "./database";
import {
  addWorkOrderLabor,
  addWorkOrderNote,
  addWorkOrderQuoteItem,
  adjustInventoryStock,
  assignTechnicianToWorkOrder,
  attachFaultRecordToWorkOrder,
  createAppointment,
  createCustomer,
  createInventoryItem,
  createStaffMember,
  createVehicle,
  createWorkOrder,
  createWorkOrderPartRequest,
  deleteAppointment,
  deleteCustomer,
  deleteVehicle,
  moveAppointment,
  recordExpenseOrRefund,
  recordFaultCodeSearch,
  recordPayment,
  replaceCustomerVehicle,
  toggleVehicleActive,
  toggleWorkOrderQuoteItemStatus,
  updateCustomer,
  updateStaffMember,
  updateVehicle,
  updateWorkOrderDetails,
  updateWorkOrderPartRequestStatus,
  updateWorkOrderQuoteStatus,
  updateWorkOrderStatus,
  upsertSupplier,
  useInventoryPartOnWorkOrder,
  type OperationalActor,
  type OperationalSqlClient,
} from "./operations-core";
import { type TenantContext } from "./security";
import { withTenantAuthorization } from "./tenant";
import type {
  Customer,
  PartRequestStatus,
  QuoteItem,
  QuoteStatus,
  Vehicle,
  WorkOrder,
  WorkOrderStatus,
} from "@/lib/demo-data";
import type { Operations } from "@/components/modules/operations-store";

export type ServerWorkspaceSnapshot = {
  customers: Customer[];
  vehicles: Vehicle[];
  orders: WorkOrder[];
  operations: Operations;
  appointments: {
    id: string;
    vehicleId: string;
    at: string;
    durationMinutes?: number;
    endAt?: string;
    updatedAt?: string;
    note: string;
    branchId: "dortyol" | "iskenderun";
    technicianId?: string;
    status?: string;
  }[];
  payments: {
    id: string;
    orderId: string;
    amount: number;
    at: string;
  }[];
  faultHistory: {
    id: string;
    code: string;
    queriedAt: string;
    vehicleId?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    technicianNotes?: string;
  }[];
};

function prismaTxToSqlClient(tx: TenantTransaction): OperationalSqlClient {
  return {
    async query<R = Record<string, unknown>>(text: string, values: unknown[] = []) {
      const parts = text.split(/\$\d+/g);
      const interpolated: unknown[] = [];
      for (let i = 0; i < values.length; i++) {
        interpolated.push(values[i]);
      }
      const query = Prisma.raw;
      void query;
      const sqlObj = new Prisma.Sql(parts, interpolated);
      const rows = await tx.$queryRaw<R[]>(sqlObj);
      return { rows };
    },
  };
}

function toActor(tenant: TenantContext, actorName?: string): OperationalActor {
  return {
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    userId: tenant.userId,
    actorName: actorName || tenant.organizationName,
    actorRole: tenant.roleName || "İşletme Sahibi",
  };
}

export async function loadTenantWorkspaceSnapshot(): Promise<ServerWorkspaceSnapshot> {
  return withTenantAuthorization("tenant.read", async (tx, tenant) => {
    const [
      dbCustomers,
      dbVehicles,
      dbStaff,
      dbSuppliers,
      dbInventory,
      dbMovements,
      dbOrders,
      dbAppointments,
      dbPayments,
      dbExpenses,
      dbFaultSearches,
    ] = await Promise.all([
      tx.customer.findMany({
        where: { organizationId: tenant.organizationId, active: true },
        orderBy: { createdAt: "desc" },
      }),
      tx.vehicle.findMany({
        where: { organizationId: tenant.organizationId },
        orderBy: { createdAt: "desc" },
      }),
      tx.staffMember.findMany({
        where: {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
        },
        orderBy: { createdAt: "asc" },
      }),
      tx.supplier.findMany({
        where: { organizationId: tenant.organizationId, active: true },
        orderBy: { createdAt: "asc" },
      }),
      tx.inventoryItem.findMany({
        where: {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
          active: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      tx.inventoryMovement.findMany({
        where: {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      tx.workOrder.findMany({
        where: {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
        },
        include: {
          timelines: { orderBy: { createdAt: "asc" } },
          notes: { orderBy: { createdAt: "asc" } },
          assignments: { where: { active: true } },
          laborItems: true,
          partItems: true,
          partRequests: true,
          quotes: {
            include: { items: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      tx.appointment.findMany({
        where: {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
        },
        orderBy: { startsAt: "asc" },
      }),
      tx.payment.findMany({
        where: {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
        },
        orderBy: { paidAt: "desc" },
      }),
      tx.expense.findMany({
        where: {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
        },
        orderBy: { incurredAt: "desc" },
      }),
      tx.faultCodeSearch.findMany({
        where: {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
        },
        orderBy: { queriedAt: "desc" },
        take: 50,
      }),
    ]);

    const customers: Customer[] = dbCustomers.map((c) => ({
      id: c.id,
      name: c.fullName,
      phone: c.phone,
      email: c.email ?? undefined,
    }));

    const vehicles: Vehicle[] = dbVehicles.map((v) => ({
      id: v.id,
      plate: v.plate,
      brand: v.brand,
      model: v.model,
      year: v.year,
      mileage: v.kilometer,
      fuelType: v.fuelType ?? undefined,
      active: v.active,
      customerId: v.customerId,
      lastService: v.lastServiceAt
        ? {
            date: v.lastServiceAt.toLocaleDateString("tr-TR"),
            title: "Servis Kaydı",
            mileage: v.kilometer,
          }
        : null,
    }));

    const orders: WorkOrder[] = dbOrders.map((o) => ({
      id: o.id,
      vehicleId: o.vehicleId,
      customerId: o.customerId,
      branchId: "dortyol",
      technicianId: o.primaryTechnicianId ?? (dbStaff[0]?.id || "unassigned"),
      assigneeIds: o.assignments.map((a) => a.staffMemberId),
      status: (o.status as WorkOrderStatus) || "RECEIVED",
      createdAt: o.createdAt.toISOString(),
      dueAt: o.dueAt ? o.dueAt.toISOString() : o.createdAt.toISOString(),
      completedAt: o.completedAt ? o.completedAt.toISOString() : undefined,
      updatedLabel: "Güncel",
      stageDuration: "Aktif",
      complaint: o.complaint,
      diagnosis: o.diagnosis,
      intakeMileage: o.intakeKilometer ?? 0,
      fuel: o.fuelLevel ?? 50,
      labor: o.laborItems.map((l) => ({
        id: l.id,
        name: l.name,
        amount: Number(l.totalPrice),
      })),
      parts: o.partItems.map((p) => ({
        id: p.inventoryItemId ?? p.id,
        name: p.name,
        quantity: p.quantity,
        price: Number(p.unitPrice),
        historicCost: Number(p.unitCost),
        state: "CONSUMED" as const,
      })),
      total: Number(o.grandTotal),
      paid: Number(o.paidAmount),
      quoteRevision: o.version,
      approval: o.approvalStatus === "APPROVED" ? "APPROVED" : "PENDING",
      approvalChannel: "Sistem",
      quoteStatus: ((o.quotes[0]?.status as QuoteStatus) ||
        (o.approvalStatus === "APPROVED" ? "APPROVED" : "DRAFT")) as QuoteStatus,
      quoteItems: (o.quotes[0]?.items ?? []).map((qi): QuoteItem => {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(qi.title) as Record<string, unknown>;
        } catch {
          parsed = { operation: qi.title };
        }
        const laborAmount = Number(parsed.laborAmount ?? 0);
        const quantity = Number(parsed.quantity ?? qi.quantity ?? 1);
        const unitPrice = Number(parsed.unitPrice ?? qi.unitPrice ?? 0);
        return {
          id: qi.id,
          operation: String(parsed.operation || qi.title),
          laborAmount,
          partId: typeof parsed.partId === "string" ? parsed.partId : undefined,
          partName: typeof parsed.partName === "string" ? parsed.partName : "",
          quantity,
          unitPrice,
          total: Number(qi.totalPrice),
          status:
            parsed.status === "APPROVED"
              ? "APPROVED"
              : parsed.status === "REJECTED"
                ? "REJECTED"
                : "PENDING",
          note: typeof parsed.note === "string" ? parsed.note : "",
        };
      }),
      partRequests: o.partRequests.map((pr) => ({
        id: pr.id,
        orderId: o.id,
        partId: pr.inventoryItemId ?? undefined,
        partName: pr.partName,
        quantity: pr.quantity,
        requestedBy: pr.requestedBy,
        requestedAt: pr.createdAt.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: (pr.status as PartRequestStatus) || "REQUESTED",
        note: pr.note ?? undefined,
      })),
      notes: o.notes.map((n) => ({
        id: n.id,
        text: n.content,
        author: n.authorName,
        createdAt: n.createdAt.toLocaleString("tr-TR"),
        internal: true,
      })),
      additionalCosts: 0,
      intake: {
        damage: "Kayıtlı",
        keyCount: 1,
        leftItems: "",
        checklist: (o.intakeChecklistJson as Record<string, "yes" | "no" | "na">) ?? {},
        photos: [],
      },
      timeline: o.timelines.map((t) => ({
        id: t.id,
        time: t.createdAt.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: t.description,
      })),
    }));

    const operations: Operations = {
      employees: dbStaff.map((s) => ({
        id: s.id,
        name: s.fullName,
        role: s.roleTitle,
        specialty: s.specialty ?? "Genel Servis",
        phone: s.phone ?? "",
        email: s.email ?? "",
        branchId: "dortyol",
        active: s.active,
      })),
      suppliers: dbSuppliers.map((sup) => ({
        id: sup.id,
        name: sup.name,
        contact: sup.contactName ?? "",
        phone: sup.phone ?? "",
        email: sup.email ?? "",
      })),
      parts: dbInventory.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.sku,
        physical: item.stockQty,
        reserved: item.reservedQty,
        minimum: item.minStockQty,
        price: Number(item.unitPrice),
        cost: Number(item.unitCost),
        supplierId: item.supplierId ?? "",
        branchId: "dortyol",
      })),
      movements: dbMovements.map((m) => ({
        id: m.id,
        partId: m.inventoryItemId,
        amount: m.quantityDelta,
        at: m.createdAt.toISOString(),
        note: m.note,
        orderId: m.workOrderId ?? undefined,
      })),
      expenses: dbExpenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: Number(e.amount),
        at: e.incurredAt.toISOString(),
        branchId: "dortyol",
        kind: e.kind === "refund" ? "refund" : "expense",
        orderId: e.workOrderId ?? undefined,
      })),
      settings: {
        business: tenant.organizationName,
        phone: "",
        address: "",
        dortyol: tenant.branchName,
        iskenderun: "Merkez",
        currency: "TRY",
        minimum: "3",
        fuel: "25",
        notifications: "Açık",
        workflow: "Onay gerekli",
        userRole: tenant.roleName || "İşletme Sahibi",
        checklist: "Zorunlu",
        vat: "20",
      },
    };

    const appointments = dbAppointments.map((a) => ({
      id: a.id,
      vehicleId: a.vehicleId,
      at: a.startsAt.toISOString().slice(0, 16),
      durationMinutes: a.durationMinutes,
      endAt: a.endsAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      note: a.serviceNote,
      branchId: "dortyol" as const,
      technicianId: a.staffMemberId ?? undefined,
      status: a.status,
    }));

    const payments = dbPayments.map((p) => ({
      id: p.id,
      orderId: p.workOrderId,
      amount: Number(p.amount),
      at: p.paidAt.toISOString(),
    }));

    const faultHistory = dbFaultSearches.map((f) => ({
      id: f.id,
      code: f.dtcCode,
      queriedAt: f.queriedAt.toISOString(),
      vehicleId: f.vehicleId ?? undefined,
      vehiclePlate: f.vehiclePlate ?? undefined,
      vehicleModel: f.vehicleModel ?? undefined,
      technicianNotes: f.technicianNotes ?? undefined,
    }));

    return {
      customers,
      vehicles,
      orders,
      operations,
      appointments,
      payments,
      faultHistory,
    };
  });
}

export async function serverCreateCustomerAndVehicle(input: {
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
  return withTenantAuthorization("vehicles.write", async (tx, tenant) => {
    const sql = prismaTxToSqlClient(tx);
    const actor = toActor(tenant);
    let customerId = input.customerId;
    let createdCustomer = null;
    if (!customerId) {
      createdCustomer = await createCustomer(sql, actor, {
        fullName: input.fullName || "",
        phone: input.phone || "",
        email: input.email,
      });
      customerId = createdCustomer.id;
    }
    const createdVehicle = await createVehicle(sql, actor, {
      customerId,
      plate: input.plate,
      brand: input.brand,
      model: input.model,
      year: input.year,
      kilometer: input.kilometer,
      fuelType: input.fuelType,
    });
    return { customer: createdCustomer, vehicle: createdVehicle };
  });
}

export async function serverCreateWorkOrder(input: {
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
  return withTenantAuthorization("work_orders.write", async (tx, tenant) =>
    createWorkOrder(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverAssignTechnician(input: {
  workOrderId: string;
  staffMemberId: string;
}) {
  return withTenantAuthorization("work_orders.assign", async (tx, tenant) =>
    assignTechnicianToWorkOrder(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverUpdateWorkOrderStatus(input: {
  workOrderId: string;
  status: string;
  description?: string;
}) {
  return withTenantAuthorization("work_orders.write", async (tx, tenant) =>
    updateWorkOrderStatus(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverAddWorkOrderNote(input: {
  workOrderId: string;
  content: string;
  authorName?: string;
}) {
  return withTenantAuthorization("work_orders.write", async (tx, tenant) =>
    addWorkOrderNote(
      prismaTxToSqlClient(tx),
      toActor(tenant, input.authorName),
      input,
    ),
  );
}

export async function serverCreateAppointment(input: {
  vehicleId: string;
  customerId?: string | null;
  staffMemberId?: string | null;
  startsAt: string;
  durationMinutes?: number;
  serviceNote: string;
  status?: string;
}) {
  return withTenantAuthorization("appointments.write", async (tx, tenant) =>
    createAppointment(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverMoveAppointment(input: {
  appointmentId: string;
  startsAt: string;
  durationMinutes?: number;
  staffMemberId?: string | null;
  status?: string;
  serviceNote?: string;
}) {
  return withTenantAuthorization("appointments.write", async (tx, tenant) =>
    moveAppointment(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverUseInventoryPart(input: {
  workOrderId: string;
  inventoryItemId: string;
  quantity: number;
  note?: string;
}) {
  return withTenantAuthorization("inventory.write", async (tx, tenant) =>
    useInventoryPartOnWorkOrder(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverCreateInventoryItem(input: {
  supplierId?: string | null;
  sku: string;
  name: string;
  stockQty: number;
  minStockQty?: number;
  unitPrice: number;
  unitCost: number;
}) {
  return withTenantAuthorization("inventory.write", async (tx, tenant) =>
    createInventoryItem(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverAddWorkOrderLabor(input: {
  workOrderId: string;
  name: string;
  hours?: number;
  hourlyRate: number;
}) {
  return withTenantAuthorization("work_orders.write", async (tx, tenant) =>
    addWorkOrderLabor(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverRecordPayment(input: {
  workOrderId: string;
  amount: number;
  paymentMethod?: string;
  referenceNo?: string;
  note?: string;
}) {
  return withTenantAuthorization("finance.write", async (tx, tenant) =>
    recordPayment(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverRecordFaultSearch(input: {
  dtcCode: string;
  vehicleId?: string | null;
  vehiclePlate?: string;
  vehicleModel?: string;
  technicianNotes?: string;
}) {
  return withTenantAuthorization("faults.write", async (tx, tenant) =>
    recordFaultCodeSearch(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverCreateStaffMember(input: {
  id?: string;
  userId?: string | null;
  fullName: string;
  roleTitle?: string;
  specialty?: string;
  phone?: string;
  email?: string;
}) {
  return withTenantAuthorization("team.write", async (tx, tenant) =>
    createStaffMember(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverCreateCustomer(input: {
  id?: string;
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
}) {
  return withTenantAuthorization("customers.write", async (tx, tenant) =>
    createCustomer(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverUpdateCustomer(input: {
  customerId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
}) {
  return withTenantAuthorization("customers.write", async (tx, tenant) =>
    updateCustomer(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverDeleteCustomer(input: { customerId: string }) {
  return withTenantAuthorization("customers.write", async (tx, tenant) =>
    deleteCustomer(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverUpdateVehicle(input: {
  vehicleId: string;
  plate: string;
  brand?: string;
  model: string;
  year?: number | null;
  kilometer?: number | null;
  fuelType?: string | null;
  active?: boolean;
}) {
  return withTenantAuthorization("vehicles.write", async (tx, tenant) =>
    updateVehicle(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverToggleVehicleActive(input: {
  vehicleId: string;
  active: boolean;
}) {
  return withTenantAuthorization("vehicles.write", async (tx, tenant) =>
    toggleVehicleActive(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverReplaceCustomerVehicle(input: {
  customerId: string;
  oldVehicleId: string;
  newVehicleId?: string;
  plate: string;
  brand: string;
  model: string;
  year?: number | null;
  kilometer?: number | null;
  fuelType?: string | null;
}) {
  return withTenantAuthorization("vehicles.write", async (tx, tenant) =>
    replaceCustomerVehicle(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverDeleteVehicle(input: { vehicleId: string }) {
  return withTenantAuthorization("vehicles.write", async (tx, tenant) =>
    deleteVehicle(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverDeleteAppointment(input: { appointmentId: string }) {
  return withTenantAuthorization("appointments.write", async (tx, tenant) =>
    deleteAppointment(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverUpdateWorkOrderDetails(input: {
  workOrderId: string;
  diagnosis?: string;
  complaint?: string;
  dueAt?: string | null;
  approvalStatus?: string;
}) {
  return withTenantAuthorization("work_orders.write", async (tx, tenant) =>
    updateWorkOrderDetails(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverAddWorkOrderQuoteItem(input: {
  workOrderId: string;
  itemId?: string;
  operation: string;
  laborAmount: number;
  inventoryItemId?: string | null;
  partName?: string | null;
  quantity: number;
  unitPrice: number;
  note?: string | null;
}) {
  return withTenantAuthorization("quotes.write", async (tx, tenant) =>
    addWorkOrderQuoteItem(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverUpdateWorkOrderQuoteStatus(input: {
  workOrderId: string;
  status: string;
  channel?: string;
}) {
  return withTenantAuthorization("quotes.write", async (tx, tenant) =>
    updateWorkOrderQuoteStatus(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverToggleWorkOrderQuoteItemStatus(input: {
  workOrderId: string;
  quoteItemId: string;
  nextStatus: "APPROVED" | "REJECTED";
}) {
  return withTenantAuthorization("quotes.write", async (tx, tenant) =>
    toggleWorkOrderQuoteItemStatus(
      prismaTxToSqlClient(tx),
      toActor(tenant),
      input,
    ),
  );
}

export async function serverCreateWorkOrderPartRequest(input: {
  id?: string;
  workOrderId: string;
  inventoryItemId?: string | null;
  partName: string;
  quantity: number;
  requestedBy: string;
  note?: string | null;
}) {
  return withTenantAuthorization("work_orders.write", async (tx, tenant) =>
    createWorkOrderPartRequest(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverUpdateWorkOrderPartRequestStatus(input: {
  workOrderId: string;
  requestId: string;
  status: string;
}) {
  return withTenantAuthorization("work_orders.write", async (tx, tenant) =>
    updateWorkOrderPartRequestStatus(
      prismaTxToSqlClient(tx),
      toActor(tenant),
      input,
    ),
  );
}

export async function serverAttachFaultRecordToWorkOrder(input: {
  workOrderId: string;
  dtcCode: string;
  titleTr: string;
  checklist: string[];
}) {
  return withTenantAuthorization("work_orders.write", async (tx, tenant) =>
    attachFaultRecordToWorkOrder(
      prismaTxToSqlClient(tx),
      toActor(tenant),
      input,
    ),
  );
}

export async function serverAdjustInventoryStock(input: {
  inventoryItemId: string;
  mode: "entry" | "count";
  quantity: number;
  unitCost?: number;
  unitPrice?: number;
  note?: string;
}) {
  return withTenantAuthorization("inventory.write", async (tx, tenant) =>
    adjustInventoryStock(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverUpsertSupplier(input: {
  id?: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
}) {
  return withTenantAuthorization("suppliers.write", async (tx, tenant) =>
    upsertSupplier(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverRecordExpenseOrRefund(input: {
  id?: string;
  workOrderId?: string | null;
  kind: "expense" | "refund";
  title: string;
  amount: number;
  category?: string;
  note?: string;
}) {
  return withTenantAuthorization("finance.write", async (tx, tenant) =>
    recordExpenseOrRefund(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

export async function serverUpdateStaffMember(input: {
  staffId: string;
  fullName: string;
  roleTitle?: string;
  specialty?: string;
  phone?: string;
  email?: string;
  active?: boolean;
}) {
  return withTenantAuthorization("team.write", async (tx, tenant) =>
    updateStaffMember(prismaTxToSqlClient(tx), toActor(tenant), input),
  );
}

