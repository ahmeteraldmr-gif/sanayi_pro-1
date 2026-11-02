import { randomUUID } from "node:crypto";
import { AccessError, isUuid, type TenantSelection } from "./security";

export type OperationalSqlClient = {
  query: <R = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ) => Promise<{ rows: R[] }>;
};

export type OperationalActor = TenantSelection & {
  userId: string;
  actorName?: string;
  actorRole?: string;
};

const cleanText = (val: unknown, max: number = 250): string =>
  typeof val === "string" ? val.replace(/\s+/g, " ").trim().slice(0, max) : "";

export const normalizePlateKey = (plate: string): string =>
  plate.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, "").toUpperCase();

export const normalizePhoneKey = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("90")) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("5")) return `0${digits}`;
  return digits;
};

export async function createCustomer(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    id?: string;
    fullName: string;
    phone: string;
    email?: string;
    notes?: string;
  },
) {
  const fullName = cleanText(input.fullName, 120);
  const phone = cleanText(input.phone, 32);
  const normalizedPhone = normalizePhoneKey(phone);
  if (fullName.length < 2 || normalizedPhone.length < 10) {
    throw new AccessError("VALIDATION", 400, "Geçerli müşteri adı ve telefon girin.");
  }
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM sanayipro.customers WHERE organization_id = $1 AND normalized_phone = $2 LIMIT 1`,
    [actor.organizationId, normalizedPhone],
  );
  if (existing.rows.length > 0) {
    throw new AccessError("CONFLICT", 409, "Bu telefon numarası ile kayıtlı müşteri zaten var.");
  }
  const customerId = input.id && isUuid(input.id) ? input.id : randomUUID();
  const { rows } = await client.query<{
    id: string;
    organization_id: string;
    full_name: string;
    phone: string;
    normalized_phone: string;
    email: string | null;
  }>(
    `INSERT INTO sanayipro.customers (id, organization_id, branch_id, full_name, phone, normalized_phone, email, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, organization_id, full_name, phone, normalized_phone, email`,
    [
      customerId,
      actor.organizationId,
      actor.branchId,
      fullName,
      phone,
      normalizedPhone,
      input.email ? cleanText(input.email, 160) : null,
      input.notes ? cleanText(input.notes, 1000) : null,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Müşteri oluşturma yetkiniz bulunmuyor.");
  }
  return rows[0];
}

export async function createVehicle(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    id?: string;
    customerId: string;
    plate: string;
    brand: string;
    model: string;
    year?: number | null;
    kilometer?: number | null;
    fuelType?: string | null;
    vin?: string | null;
  },
) {
  if (!isUuid(input.customerId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir müşteri seçin.");
  }
  const plate = cleanText(input.plate, 24).toUpperCase();
  const normalizedPlate = normalizePlateKey(plate);
  const brand = cleanText(input.brand || "Belirtilmedi", 80);
  const model = cleanText(input.model || "Belirtilmedi", 120);
  if (normalizedPlate.length < 5 || !model) {
    throw new AccessError("VALIDATION", 400, "Geçerli plaka ve araç modeli girin.");
  }
  const kilometer =
    input.kilometer !== null && input.kilometer !== undefined
      ? Math.max(0, Math.round(Number(input.kilometer)))
      : 0;
  const year =
    input.year !== null && input.year !== undefined ? Number(input.year) : null;
  if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir model yılı girin.");
  }
  const duplicate = await client.query<{ id: string }>(
    `SELECT id FROM sanayipro.vehicles WHERE organization_id = $1 AND normalized_plate = $2 LIMIT 1`,
    [actor.organizationId, normalizedPlate],
  );
  if (duplicate.rows.length > 0) {
    throw new AccessError("CONFLICT", 409, "Bu plaka zaten kayıtlı.");
  }
  const vehicleId = input.id && isUuid(input.id) ? input.id : randomUUID();
  const { rows } = await client.query<{
    id: string;
    organization_id: string;
    customer_id: string;
    plate: string;
    normalized_plate: string;
    brand: string;
    model: string;
    year: number | null;
    kilometer: number;
    fuel_type: string | null;
  }>(
    `INSERT INTO sanayipro.vehicles
       (id, organization_id, customer_id, plate, normalized_plate, brand, model, year, kilometer, fuel_type, vin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, organization_id, customer_id, plate, normalized_plate, brand, model, year, kilometer, fuel_type`,
    [
      vehicleId,
      actor.organizationId,
      input.customerId,
      plate,
      normalizedPlate,
      brand,
      model,
      year,
      kilometer,
      input.fuelType ? cleanText(input.fuelType, 40) : null,
      input.vin ? cleanText(input.vin, 32) : null,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Araç oluşturma yetkiniz bulunmuyor.");
  }
  return rows[0];
}

export async function createStaffMember(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    id?: string;
    userId?: string | null;
    fullName: string;
    roleTitle?: string;
    specialty?: string;
    phone?: string;
    email?: string;
  },
) {
  const fullName = cleanText(input.fullName, 120);
  if (fullName.length < 2) {
    throw new AccessError("VALIDATION", 400, "Personel adı en az 2 karakter olmalıdır.");
  }
  const staffId = input.id && isUuid(input.id) ? input.id : randomUUID();
  const { rows } = await client.query<{
    id: string;
    organization_id: string;
    branch_id: string;
    full_name: string;
    role_title: string;
    specialty: string | null;
  }>(
    `INSERT INTO sanayipro.staff_members
       (id, organization_id, branch_id, user_id, full_name, role_title, specialty, phone, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, organization_id, branch_id, full_name, role_title, specialty`,
    [
      staffId,
      actor.organizationId,
      actor.branchId,
      input.userId && isUuid(input.userId) ? input.userId : null,
      fullName,
      cleanText(input.roleTitle || "Usta", 80),
      input.specialty ? cleanText(input.specialty, 120) : null,
      input.phone ? cleanText(input.phone, 40) : null,
      input.email ? cleanText(input.email, 120) : null,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Personel ekleme yetkiniz bulunmuyor.");
  }
  return rows[0];
}

export async function createWorkOrder(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    id?: string;
    orderNumber?: string;
    customerId: string;
    vehicleId: string;
    primaryTechnicianId?: string | null;
    complaint: string;
    diagnosis?: string;
    intakeKilometer?: number | null;
    fuelLevel?: number | null;
    intakeChecklistJson?: Record<string, unknown> | null;
    dueAt?: string | null;
  },
) {
  if (!isUuid(input.customerId) || !isUuid(input.vehicleId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli müşteri ve araç seçin.");
  }
  const complaint = cleanText(input.complaint, 1000);
  if (!complaint) {
    throw new AccessError("VALIDATION", 400, "Müşteri şikâyeti zorunludur.");
  }
  const activeOrders = await client.query<{ id: string }>(
    `SELECT id FROM sanayipro.work_orders
     WHERE organization_id = $1 AND vehicle_id = $2 AND status NOT IN ('DELIVERED', 'CANCELLED')
     LIMIT 1`,
    [actor.organizationId, input.vehicleId],
  );
  if (activeOrders.rows.length > 0) {
    throw new AccessError(
      "CONFLICT",
      409,
      "Bu aracın zaten açık bir iş emri bulunuyor.",
    );
  }
  const workOrderId = input.id && isUuid(input.id) ? input.id : randomUUID();
  const orderNumber =
    cleanText(input.orderNumber, 40) ||
    `WO-${new Date().getUTCFullYear()}-${workOrderId.slice(0, 6).toUpperCase()}`;
  const techId =
    input.primaryTechnicianId && isUuid(input.primaryTechnicianId)
      ? input.primaryTechnicianId
      : null;

  const { rows } = await client.query<{
    id: string;
    order_number: string;
    status: string;
    grand_total: string;
    paid_amount: string;
  }>(
    `INSERT INTO sanayipro.work_orders
       (id, organization_id, branch_id, order_number, customer_id, vehicle_id, primary_technician_id,
        status, complaint, diagnosis, intake_kilometer, fuel_level, intake_checklist_json, due_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'RECEIVED', $8, $9, $10, $11, $12, $13)
     RETURNING id, order_number, status, grand_total::text, paid_amount::text`,
    [
      workOrderId,
      actor.organizationId,
      actor.branchId,
      orderNumber,
      input.customerId,
      input.vehicleId,
      techId,
      complaint,
      cleanText(input.diagnosis || "Tespit bekleniyor.", 1000),
      input.intakeKilometer ?? null,
      input.fuelLevel ?? null,
      input.intakeChecklistJson ? JSON.stringify(input.intakeChecklistJson) : null,
      input.dueAt ? new Date(input.dueAt).toISOString() : null,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "İş emri oluşturma yetkiniz bulunmuyor.");
  }

  await client.query(
    `INSERT INTO sanayipro.work_order_timelines
       (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
     VALUES ($1, $2, $3, $4, $5, $6, 'CREATED', 'Araç kabul edildi ve iş emri açıldı')`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      workOrderId,
      actor.userId,
      actor.actorName || "Servis Kabul",
    ],
  );

  if (techId) {
    await assignTechnicianToWorkOrder(client, actor, {
      workOrderId,
      staffMemberId: techId,
    });
  }

  return rows[0];
}

export async function assignTechnicianToWorkOrder(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    staffMemberId: string;
    roleInOrder?: string;
  },
) {
  if (!isUuid(input.workOrderId) || !isUuid(input.staffMemberId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli iş emri ve personel seçin.");
  }
  const staff = await client.query<{ id: string; full_name: string }>(
    `SELECT id, full_name FROM sanayipro.staff_members
     WHERE id = $1 AND organization_id = $2 AND branch_id = $3 AND active = true`,
    [input.staffMemberId, actor.organizationId, actor.branchId],
  );
  if (!staff.rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Atanacak personel bu şubede bulunamadı.");
  }

  const assignmentId = randomUUID();
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO sanayipro.technician_assignments
       (id, organization_id, branch_id, work_order_id, staff_member_id, assigned_by_user_id, role_in_order, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     ON CONFLICT (work_order_id, staff_member_id)
     DO UPDATE SET active = true, assigned_by_user_id = EXCLUDED.assigned_by_user_id, assigned_at = now()
     RETURNING id`,
    [
      assignmentId,
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      input.staffMemberId,
      actor.userId,
      cleanText(input.roleInOrder || "PRIMARY", 32),
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Usta atama yetkiniz bulunmuyor.");
  }

  await client.query(
    `UPDATE sanayipro.work_orders
     SET primary_technician_id = $1, version = version + 1, updated_at = now()
     WHERE id = $2 AND organization_id = $3 AND branch_id = $4`,
    [input.staffMemberId, input.workOrderId, actor.organizationId, actor.branchId],
  );

  await client.query(
    `INSERT INTO sanayipro.work_order_timelines
       (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
     VALUES ($1, $2, $3, $4, $5, $6, 'ASSIGNMENT', $7)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      actor.userId,
      actor.actorName || "Yönetici",
      `${staff.rows[0].full_name} sorumlu usta olarak atandı`,
    ],
  );

  return { assignmentId: rows[0].id, staffName: staff.rows[0].full_name };
}

export async function updateWorkOrderStatus(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    status: string;
    description?: string;
  },
) {
  if (!isUuid(input.workOrderId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir iş emri seçin.");
  }
  const status = cleanText(input.status, 40);
  const completedAt = status === "DELIVERED" ? new Date().toISOString() : null;
  const { rows } = await client.query<{
    id: string;
    vehicle_id: string;
    intake_kilometer: number | null;
    status: string;
  }>(
    `UPDATE sanayipro.work_orders
     SET status = $1,
         completed_at = COALESCE($2::timestamptz, completed_at),
         version = version + 1,
         updated_at = now()
     WHERE id = $3 AND organization_id = $4 AND branch_id = $5
     RETURNING id, vehicle_id, intake_kilometer, status`,
    [status, completedAt, input.workOrderId, actor.organizationId, actor.branchId],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "İş emri durumu güncellenemedi.");
  }

  if (status === "DELIVERED") {
    await client.query(
      `UPDATE sanayipro.vehicles
       SET last_service_at = now(),
           kilometer = GREATEST(kilometer, COALESCE($1::int, kilometer)),
           updated_at = now()
       WHERE id = $2 AND organization_id = $3`,
      [rows[0].intake_kilometer, rows[0].vehicle_id, actor.organizationId],
    );
  }

  await client.query(
    `INSERT INTO sanayipro.work_order_timelines
       (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
     VALUES ($1, $2, $3, $4, $5, $6, 'STATUS', $7)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      actor.userId,
      actor.actorName || "Usta",
      cleanText(input.description || `İş emri durumu güncellendi: ${status}`, 500),
    ],
  );

  return rows[0];
}

export async function addWorkOrderNote(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    content: string;
  },
) {
  if (!isUuid(input.workOrderId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir iş emri seçin.");
  }
  const content = cleanText(input.content, 2000);
  if (!content) {
    throw new AccessError("VALIDATION", 400, "Not içeriği boş olamaz.");
  }
  const noteId = randomUUID();
  const { rows } = await client.query<{
    id: string;
    content: string;
    author_name: string;
    created_at: string;
  }>(
    `INSERT INTO sanayipro.work_order_notes
       (id, organization_id, branch_id, work_order_id, author_user_id, author_name, author_role, content)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, content, author_name, created_at::text`,
    [
      noteId,
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      actor.userId,
      actor.actorName || "Usta",
      actor.actorRole || "Usta",
      content,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Not ekleme yetkiniz bulunmuyor.");
  }
  await client.query(
    `INSERT INTO sanayipro.work_order_timelines
       (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
     VALUES ($1, $2, $3, $4, $5, $6, 'NOTE', $7)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      actor.userId,
      actor.actorName || "Usta",
      `${actor.actorName || "Usta"} teknik not ekledi`,
    ],
  );
  return rows[0];
}

export async function createAppointment(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    id?: string;
    vehicleId: string;
    customerId?: string | null;
    staffMemberId?: string | null;
    startsAt: string;
    durationMinutes?: number;
    serviceNote: string;
    status?: string;
  },
) {
  if (!isUuid(input.vehicleId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir araç seçin.");
  }
  const startMs = Date.parse(input.startsAt);
  if (!Number.isFinite(startMs)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir randevu tarihi seçin.");
  }
  const duration = Math.min(720, Math.max(15, Math.round(Number(input.durationMinutes) || 60)));
  const startsAtIso = new Date(startMs).toISOString();
  const endsAtIso = new Date(startMs + duration * 60_000).toISOString();
  const serviceNote = cleanText(input.serviceNote, 500);
  if (!serviceNote) {
    throw new AccessError("VALIDATION", 400, "Randevu açıklaması girin.");
  }
  const staffId =
    input.staffMemberId && isUuid(input.staffMemberId) ? input.staffMemberId : null;

  if (staffId) {
    const overlap = await client.query<{ id: string }>(
      `SELECT id FROM sanayipro.appointments
       WHERE organization_id = $1 AND branch_id = $2 AND staff_member_id = $3
         AND status <> 'İptal'
         AND starts_at < $5::timestamptz AND ends_at > $4::timestamptz
       LIMIT 1`,
      [actor.organizationId, actor.branchId, staffId, startsAtIso, endsAtIso],
    );
    if (overlap.rows.length > 0) {
      throw new AccessError(
        "CONFLICT",
        409,
        "Seçilen ustanın bu saat aralığında başka bir randevusu var.",
      );
    }
  }

  const appointmentId = input.id && isUuid(input.id) ? input.id : randomUUID();
  const { rows } = await client.query<{
    id: string;
    vehicle_id: string;
    staff_member_id: string | null;
    starts_at: string;
    ends_at: string;
    duration_minutes: number;
    status: string;
    service_note: string;
  }>(
    `INSERT INTO sanayipro.appointments
       (id, organization_id, branch_id, customer_id, vehicle_id, staff_member_id,
        starts_at, ends_at, duration_minutes, status, service_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9, $10, $11)
     RETURNING id, vehicle_id, staff_member_id, starts_at::text, ends_at::text, duration_minutes, status, service_note`,
    [
      appointmentId,
      actor.organizationId,
      actor.branchId,
      input.customerId && isUuid(input.customerId) ? input.customerId : null,
      input.vehicleId,
      staffId,
      startsAtIso,
      endsAtIso,
      duration,
      cleanText(input.status || "Planlandı", 40),
      serviceNote,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Randevu oluşturma yetkiniz bulunmuyor.");
  }
  return rows[0];
}

export async function moveAppointment(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    appointmentId: string;
    startsAt: string;
    durationMinutes?: number;
    staffMemberId?: string | null;
    status?: string;
    serviceNote?: string;
  },
) {
  if (!isUuid(input.appointmentId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir randevu seçin.");
  }
  const startMs = Date.parse(input.startsAt);
  if (!Number.isFinite(startMs)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir randevu saati seçin.");
  }
  const existing = await client.query<{
    id: string;
    duration_minutes: number;
    staff_member_id: string | null;
    status: string;
    service_note: string;
  }>(
    `SELECT id, duration_minutes, staff_member_id, status, service_note
     FROM sanayipro.appointments
     WHERE id = $1 AND organization_id = $2 AND branch_id = $3`,
    [input.appointmentId, actor.organizationId, actor.branchId],
  );
  if (!existing.rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Randevu bulunamadı.");
  }
  const duration =
    input.durationMinutes && input.durationMinutes >= 15
      ? Math.round(input.durationMinutes)
      : existing.rows[0].duration_minutes;
  const startsAtIso = new Date(startMs).toISOString();
  const endsAtIso = new Date(startMs + duration * 60_000).toISOString();
  const nextStaffId =
    input.staffMemberId !== undefined
      ? input.staffMemberId && isUuid(input.staffMemberId)
        ? input.staffMemberId
        : null
      : existing.rows[0].staff_member_id;

  if (nextStaffId) {
    const overlap = await client.query<{ id: string }>(
      `SELECT id FROM sanayipro.appointments
       WHERE organization_id = $1 AND branch_id = $2 AND staff_member_id = $3
         AND id <> $4 AND status <> 'İptal'
         AND starts_at < $6::timestamptz AND ends_at > $5::timestamptz
       LIMIT 1`,
      [
        actor.organizationId,
        actor.branchId,
        nextStaffId,
        input.appointmentId,
        startsAtIso,
        endsAtIso,
      ],
    );
    if (overlap.rows.length > 0) {
      throw new AccessError(
        "CONFLICT",
        409,
        "Seçilen ustanın hedef saatte başka bir randevusu bulunuyor.",
      );
    }
  }

  const { rows } = await client.query<{
    id: string;
    starts_at: string;
    ends_at: string;
    duration_minutes: number;
    status: string;
  }>(
    `UPDATE sanayipro.appointments
     SET starts_at = $1::timestamptz,
         ends_at = $2::timestamptz,
         duration_minutes = $3,
         staff_member_id = $4,
         status = $5,
         service_note = $6,
         updated_at = now()
     WHERE id = $7 AND organization_id = $8 AND branch_id = $9
     RETURNING id, starts_at::text, ends_at::text, duration_minutes, status`,
    [
      startsAtIso,
      endsAtIso,
      duration,
      nextStaffId,
      cleanText(input.status || existing.rows[0].status, 40),
      cleanText(input.serviceNote || existing.rows[0].service_note, 500),
      input.appointmentId,
      actor.organizationId,
      actor.branchId,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Randevu güncelleme yetkiniz bulunmuyor.");
  }
  return rows[0];
}

export async function createInventoryItem(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    id?: string;
    supplierId?: string | null;
    sku: string;
    name: string;
    stockQty: number;
    minStockQty?: number;
    unitPrice: number;
    unitCost: number;
  },
) {
  const sku = cleanText(input.sku, 64).toUpperCase();
  const name = cleanText(input.name, 160);
  const stockQty = Math.round(Number(input.stockQty));
  const minStockQty = Math.max(0, Math.round(Number(input.minStockQty ?? 0)));
  const unitPrice = Math.round(Number(input.unitPrice) * 100) / 100;
  const unitCost = Math.round(Number(input.unitCost) * 100) / 100;
  if (!sku || !name || !Number.isFinite(stockQty) || stockQty < 0 || unitPrice < 0 || unitCost < 0) {
    throw new AccessError("VALIDATION", 400, "Geçerli stok kartı bilgileri girin.");
  }
  const itemId = input.id && isUuid(input.id) ? input.id : randomUUID();
  const { rows } = await client.query<{
    id: string;
    sku: string;
    name: string;
    stock_qty: number;
    unit_price: string;
    unit_cost: string;
  }>(
    `INSERT INTO sanayipro.inventory_items
       (id, organization_id, branch_id, supplier_id, sku, name, stock_qty, min_stock_qty, unit_price, unit_cost)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, sku, name, stock_qty, unit_price::text, unit_cost::text`,
    [
      itemId,
      actor.organizationId,
      actor.branchId,
      input.supplierId && isUuid(input.supplierId) ? input.supplierId : null,
      sku,
      name,
      stockQty,
      minStockQty,
      unitPrice,
      unitCost,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Stok kartı oluşturma yetkiniz bulunmuyor.");
  }
  if (stockQty > 0) {
    await client.query(
      `INSERT INTO sanayipro.inventory_movements
         (id, organization_id, branch_id, inventory_item_id, actor_user_id, movement_type, quantity_delta, balance_after, unit_cost, note)
       VALUES ($1, $2, $3, $4, $5, 'INITIAL_IN', $6, $6, $7, 'Stok açılış girişi')`,
      [
        randomUUID(),
        actor.organizationId,
        actor.branchId,
        itemId,
        actor.userId,
        stockQty,
        unitCost,
      ],
    );
  }
  return rows[0];
}

export async function useInventoryPartOnWorkOrder(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    inventoryItemId: string;
    quantity: number;
    note?: string;
  },
) {
  if (!isUuid(input.workOrderId) || !isUuid(input.inventoryItemId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli iş emri ve stok parçası seçin.");
  }
  const quantity = Math.round(Number(input.quantity));
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AccessError("VALIDATION", 400, "Parça kullanım adedi pozitif tam sayı olmalıdır.");
  }

  // Atomic stock decrement with concurrency-safe guard (stock_qty >= quantity)
  const stockUpdate = await client.query<{
    id: string;
    sku: string;
    name: string;
    stock_qty: number;
    unit_price: string;
    unit_cost: string;
  }>(
    `UPDATE sanayipro.inventory_items
     SET stock_qty = stock_qty - $1,
         version = version + 1,
         updated_at = now()
     WHERE id = $2
       AND organization_id = $3
       AND branch_id = $4
       AND stock_qty >= $1
     RETURNING id, sku, name, stock_qty, unit_price::text, unit_cost::text`,
    [quantity, input.inventoryItemId, actor.organizationId, actor.branchId],
  );
  if (!stockUpdate.rows[0]) {
    throw new AccessError(
      "CONFLICT",
      409,
      "Stok miktarı yetersiz veya parça bu şubede bulunamadı.",
    );
  }

  const item = stockUpdate.rows[0];
  const unitPrice = Number(item.unit_price);
  const unitCost = Number(item.unit_cost);
  const totalPrice = Math.round(unitPrice * quantity * 100) / 100;

  const partItemId = randomUUID();
  await client.query(
    `INSERT INTO sanayipro.work_order_part_items
       (id, organization_id, branch_id, work_order_id, inventory_item_id, name, sku, quantity, unit_price, unit_cost, total_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      partItemId,
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      item.id,
      item.name,
      item.sku,
      quantity,
      unitPrice,
      unitCost,
      totalPrice,
    ],
  );

  await client.query(
    `INSERT INTO sanayipro.inventory_movements
       (id, organization_id, branch_id, inventory_item_id, work_order_id, actor_user_id, movement_type, quantity_delta, balance_after, unit_cost, note)
     VALUES ($1, $2, $3, $4, $5, $6, 'WORK_ORDER_OUT', $7, $8, $9, $10)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      item.id,
      input.workOrderId,
      actor.userId,
      -quantity,
      item.stock_qty,
      unitCost,
      cleanText(input.note || `İş emrinde ${quantity} adet kullanıldı`, 250),
    ],
  );

  const orderUpdate = await client.query<{
    parts_total: string;
    grand_total: string;
  }>(
    `UPDATE sanayipro.work_orders
     SET parts_total = parts_total + $1,
         grand_total = grand_total + $1,
         version = version + 1,
         updated_at = now()
     WHERE id = $2 AND organization_id = $3 AND branch_id = $4
     RETURNING parts_total::text, grand_total::text`,
    [totalPrice, input.workOrderId, actor.organizationId, actor.branchId],
  );
  if (!orderUpdate.rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "İş emri bulunamadı.");
  }

  await client.query(
    `INSERT INTO sanayipro.work_order_timelines
       (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
     VALUES ($1, $2, $3, $4, $5, $6, 'PART_USED', $7)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      actor.userId,
      actor.actorName || "Usta",
      `${item.name} (${quantity} adet) stoktan düşülerek iş emrine eklendi`,
    ],
  );

  return {
    partItemId,
    remainingStock: item.stock_qty,
    totalPrice,
    grandTotal: Number(orderUpdate.rows[0].grand_total),
  };
}

export async function addWorkOrderLabor(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    name: string;
    hours?: number;
    hourlyRate: number;
  },
) {
  if (!isUuid(input.workOrderId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir iş emri seçin.");
  }
  const name = cleanText(input.name, 160);
  const hours = Math.max(0.25, Math.round(Number(input.hours ?? 1) * 100) / 100);
  const hourlyRate = Math.round(Number(input.hourlyRate) * 100) / 100;
  if (!name || hourlyRate < 0) {
    throw new AccessError("VALIDATION", 400, "Geçerli işçilik bilgisi girin.");
  }
  const totalPrice = Math.round(hours * hourlyRate * 100) / 100;
  const laborId = randomUUID();
  await client.query(
    `INSERT INTO sanayipro.work_order_labor_items
       (id, organization_id, branch_id, work_order_id, name, hours, hourly_rate, total_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      laborId,
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      name,
      hours,
      hourlyRate,
      totalPrice,
    ],
  );
  const updated = await client.query<{ grand_total: string }>(
    `UPDATE sanayipro.work_orders
     SET labor_total = labor_total + $1,
         grand_total = grand_total + $1,
         version = version + 1,
         updated_at = now()
     WHERE id = $2 AND organization_id = $3 AND branch_id = $4
     RETURNING grand_total::text`,
    [totalPrice, input.workOrderId, actor.organizationId, actor.branchId],
  );
  return { laborId, totalPrice, grandTotal: Number(updated.rows[0]?.grand_total ?? 0) };
}

export async function recordPayment(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    amount: number;
    paymentMethod?: string;
    referenceNo?: string;
    note?: string;
  },
) {
  if (!isUuid(input.workOrderId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir iş emri seçin.");
  }
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AccessError("VALIDATION", 400, "Tahsilat tutarı 0'dan büyük olmalıdır.");
  }

  // Atomic balance check & increment on work_orders
  const updatedOrder = await client.query<{
    id: string;
    customer_id: string;
    grand_total: string;
    paid_amount: string;
  }>(
    `UPDATE sanayipro.work_orders
     SET paid_amount = paid_amount + $1,
         version = version + 1,
         updated_at = now()
     WHERE id = $2
       AND organization_id = $3
       AND branch_id = $4
       AND status <> 'CANCELLED'
       AND (paid_amount + $1) <= grand_total
     RETURNING id, customer_id, grand_total::text, paid_amount::text`,
    [amount, input.workOrderId, actor.organizationId, actor.branchId],
  );
  if (!updatedOrder.rows[0]) {
    throw new AccessError(
      "CONFLICT",
      409,
      "Tahsilat tutarı kalan bakiyeyi aşamaz veya iş emri tahsilata uygun değil.",
    );
  }

  const paymentId = randomUUID();
  const { rows } = await client.query<{
    id: string;
    amount: string;
    payment_method: string;
    paid_at: string;
  }>(
    `INSERT INTO sanayipro.payments
       (id, organization_id, branch_id, work_order_id, customer_id, recorded_by_user_id, amount, payment_method, reference_no, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, amount::text, payment_method, paid_at::text`,
    [
      paymentId,
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      updatedOrder.rows[0].customer_id,
      actor.userId,
      amount,
      cleanText(input.paymentMethod || "CASH", 32),
      input.referenceNo ? cleanText(input.referenceNo, 64) : null,
      input.note ? cleanText(input.note, 500) : null,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Tahsilat kaydetme yetkiniz bulunmuyor.");
  }

  await client.query(
    `INSERT INTO sanayipro.work_order_timelines
       (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
     VALUES ($1, $2, $3, $4, $5, $6, 'PAYMENT', $7)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      actor.userId,
      actor.actorName || "Kasa",
      `₺${amount.toFixed(2)} tahsilat alındı`,
    ],
  );

  return {
    paymentId: rows[0].id,
    amount: Number(rows[0].amount),
    paidAmount: Number(updatedOrder.rows[0].paid_amount),
    remainingBalance:
      Math.round(
        (Number(updatedOrder.rows[0].grand_total) -
          Number(updatedOrder.rows[0].paid_amount)) *
          100,
      ) / 100,
  };
}

export async function recordFaultCodeSearch(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    dtcCode: string;
    vehicleId?: string | null;
    vehiclePlate?: string;
    vehicleModel?: string;
    technicianNotes?: string;
  },
) {
  const dtcCode = cleanText(input.dtcCode, 16).toUpperCase();
  if (!dtcCode) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir OBD-II arıza kodu girin.");
  }
  const searchId = randomUUID();
  const { rows } = await client.query<{
    id: string;
    dtc_code: string;
    queried_at: string;
  }>(
    `INSERT INTO sanayipro.fault_code_searches
       (id, organization_id, branch_id, user_id, vehicle_id, dtc_code, vehicle_plate, vehicle_model, technician_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, dtc_code, queried_at::text`,
    [
      searchId,
      actor.organizationId,
      actor.branchId,
      actor.userId,
      input.vehicleId && isUuid(input.vehicleId) ? input.vehicleId : null,
      dtcCode,
      input.vehiclePlate ? cleanText(input.vehiclePlate, 32) : null,
      input.vehicleModel ? cleanText(input.vehicleModel, 120) : null,
      input.technicianNotes ? cleanText(input.technicianNotes, 1000) : null,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Arıza sorgusu kaydetme yetkiniz bulunmuyor.");
  }
  return rows[0];
}

export async function updateCustomer(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    customerId: string;
    fullName: string;
    phone: string;
    email?: string | null;
    notes?: string | null;
  },
) {
  if (!isUuid(input.customerId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir müşteri seçin.");
  }
  const fullName = cleanText(input.fullName, 120);
  const phone = cleanText(input.phone, 32);
  const normalizedPhone = normalizePhoneKey(phone);
  if (fullName.length < 2 || normalizedPhone.length < 10) {
    throw new AccessError("VALIDATION", 400, "Geçerli müşteri adı ve telefon girin.");
  }
  const duplicate = await client.query<{ id: string }>(
    `SELECT id FROM sanayipro.customers
     WHERE organization_id = $1 AND normalized_phone = $2 AND id <> $3
     LIMIT 1`,
    [actor.organizationId, normalizedPhone, input.customerId],
  );
  if (duplicate.rows.length > 0) {
    throw new AccessError("CONFLICT", 409, "Bu telefon numarası başka bir müşteride kayıtlı.");
  }
  const { rows } = await client.query<{
    id: string;
    full_name: string;
    phone: string;
    normalized_phone: string;
    email: string | null;
  }>(
    `UPDATE sanayipro.customers
     SET full_name = $1,
         phone = $2,
         normalized_phone = $3,
         email = $4,
         notes = COALESCE($5, notes),
         updated_at = now()
     WHERE id = $6 AND organization_id = $7
     RETURNING id, full_name, phone, normalized_phone, email`,
    [
      fullName,
      phone,
      normalizedPhone,
      input.email ? cleanText(input.email, 160) : null,
      input.notes !== undefined ? (input.notes ? cleanText(input.notes, 1000) : null) : null,
      input.customerId,
      actor.organizationId,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Müşteri bulunamadı veya güncelleme yetkiniz yok.");
  }
  return rows[0];
}

export async function deleteCustomer(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: { customerId: string },
) {
  if (!isUuid(input.customerId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir müşteri seçin.");
  }
  const hasOrders = await client.query<{ id: string }>(
    `SELECT id FROM sanayipro.work_orders
     WHERE organization_id = $1 AND customer_id = $2
     LIMIT 1`,
    [actor.organizationId, input.customerId],
  );
  if (hasOrders.rows.length > 0) {
    throw new AccessError(
      "CONFLICT",
      409,
      "İş emri geçmişi olan müşteri silinemez.",
    );
  }
  await client.query(
    `DELETE FROM sanayipro.appointments WHERE organization_id = $1 AND customer_id = $2`,
    [actor.organizationId, input.customerId],
  );
  await client.query(
    `DELETE FROM sanayipro.vehicles WHERE organization_id = $1 AND customer_id = $2`,
    [actor.organizationId, input.customerId],
  );
  const { rows } = await client.query<{ id: string }>(
    `DELETE FROM sanayipro.customers
     WHERE id = $1 AND organization_id = $2
     RETURNING id`,
    [input.customerId, actor.organizationId],
  );
  if (!rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Müşteri bulunamadı veya silme yetkiniz yok.");
  }
  return rows[0];
}

export async function updateVehicle(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    vehicleId: string;
    plate: string;
    brand?: string;
    model: string;
    year?: number | null;
    kilometer?: number | null;
    fuelType?: string | null;
    active?: boolean;
  },
) {
  if (!isUuid(input.vehicleId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir araç seçin.");
  }
  const plate = cleanText(input.plate, 24).toUpperCase();
  const normalizedPlate = normalizePlateKey(plate);
  const model = cleanText(input.model, 120);
  if (normalizedPlate.length < 5 || !model) {
    throw new AccessError("VALIDATION", 400, "Geçerli plaka ve araç modeli girin.");
  }
  const year =
    input.year !== null && input.year !== undefined ? Number(input.year) : null;
  if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir model yılı girin.");
  }
  const duplicate = await client.query<{ id: string }>(
    `SELECT id FROM sanayipro.vehicles
     WHERE organization_id = $1 AND normalized_plate = $2 AND id <> $3
     LIMIT 1`,
    [actor.organizationId, normalizedPlate, input.vehicleId],
  );
  if (duplicate.rows.length > 0) {
    throw new AccessError("CONFLICT", 409, "Bu plaka başka bir araçta kayıtlı.");
  }
  const kilometer =
    input.kilometer !== null && input.kilometer !== undefined
      ? Math.max(0, Math.round(Number(input.kilometer)))
      : null;

  const { rows } = await client.query<{
    id: string;
    plate: string;
    normalized_plate: string;
    brand: string;
    model: string;
    year: number | null;
    kilometer: number;
    fuel_type: string | null;
    active: boolean;
  }>(
    `UPDATE sanayipro.vehicles
     SET plate = $1,
         normalized_plate = $2,
         brand = COALESCE($3, brand),
         model = $4,
         year = $5,
         kilometer = COALESCE($6, kilometer),
         fuel_type = COALESCE($7, fuel_type),
         active = COALESCE($8, active),
         updated_at = now()
     WHERE id = $9 AND organization_id = $10
     RETURNING id, plate, normalized_plate, brand, model, year, kilometer, fuel_type, active`,
    [
      plate,
      normalizedPlate,
      input.brand ? cleanText(input.brand, 80) : null,
      model,
      year,
      kilometer,
      input.fuelType ? cleanText(input.fuelType, 40) : null,
      input.active !== undefined ? Boolean(input.active) : null,
      input.vehicleId,
      actor.organizationId,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Araç bulunamadı veya güncelleme yetkiniz yok.");
  }
  return rows[0];
}

export async function toggleVehicleActive(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: { vehicleId: string; active: boolean },
) {
  if (!isUuid(input.vehicleId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir araç seçin.");
  }
  const { rows } = await client.query<{ id: string; active: boolean }>(
    `UPDATE sanayipro.vehicles
     SET active = $1, updated_at = now()
     WHERE id = $2 AND organization_id = $3
     RETURNING id, active`,
    [Boolean(input.active), input.vehicleId, actor.organizationId],
  );
  if (!rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Araç bulunamadı.");
  }
  return rows[0];
}

export async function replaceCustomerVehicle(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    customerId: string;
    oldVehicleId: string;
    newVehicleId?: string;
    plate: string;
    brand: string;
    model: string;
    year?: number | null;
    kilometer?: number | null;
    fuelType?: string | null;
  },
) {
  if (!isUuid(input.customerId) || !isUuid(input.oldVehicleId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli müşteri ve araç seçin.");
  }
  await toggleVehicleActive(client, actor, {
    vehicleId: input.oldVehicleId,
    active: false,
  });
  return createVehicle(client, actor, {
    id: input.newVehicleId,
    customerId: input.customerId,
    plate: input.plate,
    brand: input.brand,
    model: input.model,
    year: input.year,
    kilometer: input.kilometer,
    fuelType: input.fuelType,
  });
}

export async function deleteVehicle(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: { vehicleId: string },
) {
  if (!isUuid(input.vehicleId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir araç seçin.");
  }
  const hasOrders = await client.query<{ id: string }>(
    `SELECT id FROM sanayipro.work_orders
     WHERE organization_id = $1 AND vehicle_id = $2
     LIMIT 1`,
    [actor.organizationId, input.vehicleId],
  );
  if (hasOrders.rows.length > 0) {
    throw new AccessError(
      "CONFLICT",
      409,
      "İş emri geçmişi olan araç silinemez.",
    );
  }
  await client.query(
    `DELETE FROM sanayipro.appointments WHERE organization_id = $1 AND vehicle_id = $2`,
    [actor.organizationId, input.vehicleId],
  );
  const { rows } = await client.query<{ id: string }>(
    `DELETE FROM sanayipro.vehicles
     WHERE id = $1 AND organization_id = $2
     RETURNING id`,
    [input.vehicleId, actor.organizationId],
  );
  if (!rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Araç bulunamadı veya silme yetkiniz yok.");
  }
  return rows[0];
}

export async function deleteAppointment(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: { appointmentId: string },
) {
  if (!isUuid(input.appointmentId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir randevu seçin.");
  }
  const { rows } = await client.query<{ id: string }>(
    `DELETE FROM sanayipro.appointments
     WHERE id = $1 AND organization_id = $2 AND branch_id = $3
     RETURNING id`,
    [input.appointmentId, actor.organizationId, actor.branchId],
  );
  if (!rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Randevu bulunamadı veya iptal yetkiniz yok.");
  }
  return rows[0];
}

export async function updateWorkOrderDetails(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    diagnosis?: string;
    complaint?: string;
    dueAt?: string | null;
    approvalStatus?: string;
  },
) {
  if (!isUuid(input.workOrderId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir iş emri seçin.");
  }
  const diagnosis =
    input.diagnosis !== undefined ? cleanText(input.diagnosis, 1000) : null;
  const complaint =
    input.complaint !== undefined ? cleanText(input.complaint, 1000) : null;
  const dueAtIso =
    input.dueAt !== undefined
      ? input.dueAt
        ? new Date(input.dueAt).toISOString()
        : null
      : null;
  const approvalStatus =
    input.approvalStatus !== undefined
      ? cleanText(input.approvalStatus, 32)
      : null;

  const { rows } = await client.query<{
    id: string;
    diagnosis: string;
    complaint: string;
    approval_status: string;
  }>(
    `UPDATE sanayipro.work_orders
     SET diagnosis = COALESCE($1, diagnosis),
         complaint = COALESCE($2, complaint),
         due_at = CASE WHEN $3::boolean THEN $4::timestamptz ELSE due_at END,
         approval_status = COALESCE($5, approval_status),
         version = version + 1,
         updated_at = now()
     WHERE id = $6 AND organization_id = $7 AND branch_id = $8
     RETURNING id, diagnosis, complaint, approval_status`,
    [
      diagnosis,
      complaint,
      input.dueAt !== undefined,
      dueAtIso,
      approvalStatus,
      input.workOrderId,
      actor.organizationId,
      actor.branchId,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "İş emri bulunamadı.");
  }
  if (diagnosis) {
    await client.query(
      `INSERT INTO sanayipro.work_order_timelines
         (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
       VALUES ($1, $2, $3, $4, $5, $6, 'DIAGNOSIS', $7)`,
      [
        randomUUID(),
        actor.organizationId,
        actor.branchId,
        input.workOrderId,
        actor.userId,
        actor.actorName || "Usta",
        `Ön tespit güncellendi: ${diagnosis.slice(0, 180)}`,
      ],
    );
  }
  return rows[0];
}

export async function addWorkOrderQuoteItem(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    itemId?: string;
    operation: string;
    laborAmount: number;
    inventoryItemId?: string | null;
    partName?: string | null;
    quantity: number;
    unitPrice: number;
    note?: string | null;
  },
) {
  if (!isUuid(input.workOrderId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir iş emri seçin.");
  }
  const operation = cleanText(input.operation, 200);
  if (!operation) {
    throw new AccessError("VALIDATION", 400, "Yapılacak işlem açıklaması zorunludur.");
  }
  const laborAmount = Math.max(0, Math.round(Number(input.laborAmount || 0) * 100) / 100);
  const quantity = Math.max(1, Math.round(Number(input.quantity || 1)));
  const unitPrice = Math.max(0, Math.round(Number(input.unitPrice || 0) * 100) / 100);
  const partTotal = Math.round(quantity * unitPrice * 100) / 100;
  const lineTotal = Math.round((laborAmount + partTotal) * 100) / 100;

  const orderCheck = await client.query<{
    id: string;
    customer_id: string;
    vehicle_id: string;
  }>(
    `SELECT id, customer_id, vehicle_id FROM sanayipro.work_orders
     WHERE id = $1 AND organization_id = $2 AND branch_id = $3`,
    [input.workOrderId, actor.organizationId, actor.branchId],
  );
  if (!orderCheck.rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "İş emri bulunamadı.");
  }

  const existingQuote = await client.query<{ id: string }>(
    `SELECT id FROM sanayipro.quotes
     WHERE work_order_id = $1 AND organization_id = $2 AND branch_id = $3
     ORDER BY created_at DESC LIMIT 1`,
    [input.workOrderId, actor.organizationId, actor.branchId],
  );
  let quoteId = existingQuote.rows[0]?.id;
  if (!quoteId) {
    quoteId = randomUUID();
    const quoteNumber = `QT-${new Date().getUTCFullYear()}-${quoteId.slice(0, 6).toUpperCase()}`;
    await client.query(
      `INSERT INTO sanayipro.quotes
         (id, organization_id, branch_id, work_order_id, customer_id, vehicle_id, quote_number, status, subtotal_amount, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING_APPROVAL', 0, 0)`,
      [
        quoteId,
        actor.organizationId,
        actor.branchId,
        input.workOrderId,
        orderCheck.rows[0].customer_id,
        orderCheck.rows[0].vehicle_id,
        quoteNumber,
      ],
    );
  }

  const quoteItemId = input.itemId && isUuid(input.itemId) ? input.itemId : randomUUID();
  const { rows } = await client.query<{
    id: string;
    title: string;
    total_price: string;
  }>(
    `INSERT INTO sanayipro.quote_items
       (id, organization_id, quote_id, item_type, title, quantity, unit_price, total_price, status)
     VALUES ($1, $2, $3, 'COMBINED', $4, $5, $6, $7, 'PENDING')
     RETURNING id, title, total_price::text`,
    [
      quoteItemId,
      actor.organizationId,
      quoteId,
      JSON.stringify({
        operation,
        laborAmount,
        partId: input.inventoryItemId && isUuid(input.inventoryItemId) ? input.inventoryItemId : undefined,
        partName: input.partName ? cleanText(input.partName, 160) : undefined,
        quantity,
        unitPrice,
        note: input.note ? cleanText(input.note, 300) : undefined,
        status: "PENDING",
      }),
      quantity,
      unitPrice,
      lineTotal,
    ],
  );

  await client.query(
    `UPDATE sanayipro.quotes
     SET subtotal_amount = subtotal_amount + $1,
         total_amount = total_amount + $1,
         status = 'PENDING_APPROVAL',
         updated_at = now()
     WHERE id = $2 AND organization_id = $3`,
    [lineTotal, quoteId, actor.organizationId],
  );

  await client.query(
    `UPDATE sanayipro.work_orders
     SET approval_status = 'PENDING',
         version = version + 1,
         updated_at = now()
     WHERE id = $1 AND organization_id = $2 AND branch_id = $3`,
    [input.workOrderId, actor.organizationId, actor.branchId],
  );

  await client.query(
    `INSERT INTO sanayipro.work_order_timelines
       (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
     VALUES ($1, $2, $3, $4, $5, $6, 'QUOTE_ITEM', $7)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      actor.userId,
      actor.actorName || "Danışman",
      `Teklif kalemi eklendi: ${operation} (₺${lineTotal.toFixed(2)})`,
    ],
  );

  return { quoteId, quoteItemId: rows[0].id, lineTotal };
}

export async function updateWorkOrderQuoteStatus(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    status: string;
    channel?: string;
  },
) {
  if (!isUuid(input.workOrderId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir iş emri seçin.");
  }
  const status = cleanText(input.status, 40);
  const channel = cleanText(input.channel || "Telefon", 40);

  const existingQuote = await client.query<{ id: string }>(
    `SELECT id FROM sanayipro.quotes
     WHERE work_order_id = $1 AND organization_id = $2 AND branch_id = $3
     ORDER BY created_at DESC LIMIT 1`,
    [input.workOrderId, actor.organizationId, actor.branchId],
  );
  const quoteId = existingQuote.rows[0]?.id;
  let approvedDelta = 0;

  if (quoteId) {
    const items = await client.query<{ id: string; title: string; total_price: string }>(
      `SELECT id, title, total_price::text FROM sanayipro.quote_items
       WHERE quote_id = $1 AND organization_id = $2`,
      [quoteId, actor.organizationId],
    );

    for (const item of items.rows) {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(item.title) as Record<string, unknown>;
      } catch {
        parsed = { operation: item.title, status: "PENDING" };
      }
      if (status === "APPROVED" && parsed.status !== "APPROVED") {
        approvedDelta += Number(item.total_price);
        parsed.status = "APPROVED";
      } else if (status === "REJECTED") {
        parsed.status = "REJECTED";
      }
      const nextItemStatus = String(parsed.status || "PENDING");
      await client.query(
        `UPDATE sanayipro.quote_items
         SET title = $1, status = $2
         WHERE id = $3 AND organization_id = $4`,
        [JSON.stringify(parsed), nextItemStatus, item.id, actor.organizationId],
      );
    }

    await client.query(
      `UPDATE sanayipro.quotes
       SET status = $1,
           updated_at = now()
       WHERE id = $2 AND organization_id = $3`,
      [status, quoteId, actor.organizationId],
    );
  }

  const approvalStatus =
    status === "APPROVED" || status === "PARTIALLY_APPROVED" ? "APPROVED" : "PENDING";

  const { rows } = await client.query<{
    id: string;
    grand_total: string;
    approval_status: string;
  }>(
    `UPDATE sanayipro.work_orders
     SET approval_status = $1,
         labor_total = labor_total + $2,
         grand_total = grand_total + $2,
         version = version + 1,
         updated_at = now()
     WHERE id = $3 AND organization_id = $4 AND branch_id = $5
     RETURNING id, grand_total::text, approval_status`,
    [approvalStatus, approvedDelta, input.workOrderId, actor.organizationId, actor.branchId],
  );
  if (!rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "İş emri bulunamadı.");
  }

  await client.query(
    `INSERT INTO sanayipro.work_order_timelines
       (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
     VALUES ($1, $2, $3, $4, $5, $6, 'APPROVAL', $7)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      actor.userId,
      actor.actorName || "Danışman",
      `${channel} üzerinden teklif durumu güncellendi: ${status}`,
    ],
  );

  return {
    workOrderId: rows[0].id,
    approvalStatus: rows[0].approval_status,
    grandTotal: Number(rows[0].grand_total),
  };
}

export async function toggleWorkOrderQuoteItemStatus(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    quoteItemId: string;
    nextStatus: "APPROVED" | "REJECTED";
  },
) {
  if (!isUuid(input.workOrderId) || !isUuid(input.quoteItemId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli iş emri ve teklif kalemi seçin.");
  }
  const itemRow = await client.query<{
    id: string;
    quote_id: string;
    title: string;
    total_price: string;
  }>(
    `SELECT id, quote_id, title, total_price::text
     FROM sanayipro.quote_items
     WHERE id = $1 AND organization_id = $2`,
    [input.quoteItemId, actor.organizationId],
  );
  if (!itemRow.rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Teklif kalemi bulunamadı.");
  }
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(itemRow.rows[0].title) as Record<string, unknown>;
  } catch {
    parsed = { operation: itemRow.rows[0].title, status: "PENDING_APPROVAL" };
  }
  const prevStatus = String(parsed.status || "PENDING_APPROVAL");
  const totalAmount = Number(itemRow.rows[0].total_price);
  let delta = 0;
  if (prevStatus !== "APPROVED" && input.nextStatus === "APPROVED") {
    delta = totalAmount;
  } else if (prevStatus === "APPROVED" && input.nextStatus === "REJECTED") {
    delta = -totalAmount;
  }
  parsed.status = input.nextStatus;

  await client.query(
    `UPDATE sanayipro.quote_items
     SET title = $1, status = $2
     WHERE id = $3 AND organization_id = $4`,
    [JSON.stringify(parsed), input.nextStatus, input.quoteItemId, actor.organizationId],
  );

  await client.query(
    `UPDATE sanayipro.work_orders
     SET labor_total = GREATEST(0, labor_total + $1),
         grand_total = GREATEST(0, grand_total + $1),
         approval_status = CASE WHEN $2 = 'APPROVED' THEN 'APPROVED' ELSE approval_status END,
         version = version + 1,
         updated_at = now()
     WHERE id = $3 AND organization_id = $4 AND branch_id = $5`,
    [delta, input.nextStatus, input.workOrderId, actor.organizationId, actor.branchId],
  );

  return { quoteItemId: input.quoteItemId, status: input.nextStatus, delta };
}

export async function createWorkOrderPartRequest(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    id?: string;
    workOrderId: string;
    inventoryItemId?: string | null;
    partName: string;
    quantity: number;
    requestedBy: string;
    note?: string | null;
  },
) {
  if (!isUuid(input.workOrderId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir iş emri seçin.");
  }
  const partName = cleanText(input.partName, 160);
  const quantity = Math.max(1, Math.round(Number(input.quantity || 1)));
  if (!partName) {
    throw new AccessError("VALIDATION", 400, "Parça adı zorunludur.");
  }
  const requestId = input.id && isUuid(input.id) ? input.id : randomUUID();
  const { rows } = await client.query<{
    id: string;
    part_name: string;
    quantity: number;
    status: string;
  }>(
    `INSERT INTO sanayipro.part_requests
       (id, organization_id, branch_id, work_order_id, inventory_item_id, part_name, quantity, requested_by, status, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'REQUESTED', $9)
     RETURNING id, part_name, quantity, status`,
    [
      requestId,
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      input.inventoryItemId && isUuid(input.inventoryItemId) ? input.inventoryItemId : null,
      partName,
      quantity,
      cleanText(input.requestedBy || actor.actorName || "Usta", 100),
      input.note ? cleanText(input.note, 400) : null,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Parça talebi oluşturulamadı.");
  }

  await client.query(
    `INSERT INTO sanayipro.work_order_timelines
       (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
     VALUES ($1, $2, $3, $4, $5, $6, 'PART_REQUEST', $7)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      actor.userId,
      actor.actorName || "Usta",
      `Parça talebi oluşturuldu: ${partName} (${quantity} adet)`,
    ],
  );

  return rows[0];
}

export async function updateWorkOrderPartRequestStatus(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    requestId: string;
    status: string;
  },
) {
  if (!isUuid(input.workOrderId) || !isUuid(input.requestId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli iş emri ve parça talebi seçin.");
  }
  const status = cleanText(input.status, 32);
  const { rows } = await client.query<{
    id: string;
    part_name: string;
    quantity: number;
    status: string;
  }>(
    `UPDATE sanayipro.part_requests
     SET status = $1, updated_at = now()
     WHERE id = $2 AND work_order_id = $3 AND organization_id = $4 AND branch_id = $5
     RETURNING id, part_name, quantity, status`,
    [status, input.requestId, input.workOrderId, actor.organizationId, actor.branchId],
  );
  if (!rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Parça talebi bulunamadı.");
  }
  await client.query(
    `INSERT INTO sanayipro.work_order_timelines
       (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
     VALUES ($1, $2, $3, $4, $5, $6, 'PART_REQUEST_STATUS', $7)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      input.workOrderId,
      actor.userId,
      actor.actorName || "Depo",
      `Parça talebi güncellendi (${rows[0].part_name}): ${status}`,
    ],
  );
  return rows[0];
}

export async function attachFaultRecordToWorkOrder(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    workOrderId: string;
    dtcCode: string;
    titleTr: string;
    checklist: string[];
  },
) {
  if (!isUuid(input.workOrderId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir iş emri seçin.");
  }
  const dtcCode = cleanText(input.dtcCode, 16).toUpperCase();
  const titleTr = cleanText(input.titleTr, 240);
  if (!dtcCode || !titleTr) {
    throw new AccessError("VALIDATION", 400, "Arıza kodu ve başlığı zorunludur.");
  }

  const orderRow = await client.query<{
    id: string;
    vehicle_id: string;
    diagnosis: string;
  }>(
    `SELECT id, vehicle_id, diagnosis FROM sanayipro.work_orders
     WHERE id = $1 AND organization_id = $2 AND branch_id = $3`,
    [input.workOrderId, actor.organizationId, actor.branchId],
  );
  if (!orderRow.rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "İş emri bulunamadı.");
  }

  const faultRecordId = randomUUID();
  const checklistText = (input.checklist || []).slice(0, 6).join(" · ");
  await client.query(
    `INSERT INTO sanayipro.vehicle_fault_records
       (id, organization_id, branch_id, vehicle_id, work_order_id, dtc_code, title_tr, checklist_json, status, technician_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN', $9)`,
    [
      faultRecordId,
      actor.organizationId,
      actor.branchId,
      orderRow.rows[0].vehicle_id,
      input.workOrderId,
      dtcCode,
      titleTr,
      JSON.stringify(input.checklist || []),
      `${titleTr}${checklistText ? ` — Kontrol: ${checklistText}` : ""}`,
    ],
  );

  const curDiag = orderRow.rows[0].diagnosis || "";
  const nextDiag = curDiag.includes(dtcCode)
    ? curDiag
    : `${curDiag ? `${curDiag} · ` : ""}[OBD ${dtcCode}] ${titleTr}`;

  await client.query(
    `UPDATE sanayipro.work_orders
     SET diagnosis = $1, version = version + 1, updated_at = now()
     WHERE id = $2 AND organization_id = $3 AND branch_id = $4`,
    [nextDiag, input.workOrderId, actor.organizationId, actor.branchId],
  );

  await addWorkOrderNote(client, actor, {
    workOrderId: input.workOrderId,
    content: `Arıza Bul (${dtcCode} — ${titleTr}): Önerilen kontrol adımları: ${checklistText}`,
  });

  return { faultRecordId, diagnosis: nextDiag };
}

export async function adjustInventoryStock(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    inventoryItemId: string;
    mode: "entry" | "count";
    quantity: number;
    unitCost?: number;
    unitPrice?: number;
    note?: string;
  },
) {
  if (!isUuid(input.inventoryItemId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir stok kalemi seçin.");
  }
  const quantity = Math.round(Number(input.quantity));
  if (!Number.isInteger(quantity)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir stok miktarı girin.");
  }

  const current = await client.query<{
    id: string;
    stock_qty: number;
    reserved_qty: number;
    unit_cost: string;
    unit_price: string;
  }>(
    `SELECT id, stock_qty, reserved_qty, unit_cost::text, unit_price::text
     FROM sanayipro.inventory_items
     WHERE id = $1 AND organization_id = $2 AND branch_id = $3`,
    [input.inventoryItemId, actor.organizationId, actor.branchId],
  );
  if (!current.rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Stok kartı bu şubede bulunamadı.");
  }

  const cur = current.rows[0];
  let nextQty = cur.stock_qty;
  let delta = 0;
  if (input.mode === "entry") {
    if (quantity <= 0) {
      throw new AccessError("VALIDATION", 400, "Stok giriş miktarı pozitif olmalıdır.");
    }
    delta = quantity;
    nextQty = cur.stock_qty + quantity;
  } else {
    if (quantity < cur.reserved_qty) {
      throw new AccessError(
        "CONFLICT",
        409,
        "Fiziksel stok ayrılan miktardan az olamaz.",
      );
    }
    delta = quantity - cur.stock_qty;
    nextQty = quantity;
  }

  const nextCost =
    input.unitCost !== undefined && Number(input.unitCost) >= 0
      ? Math.round(Number(input.unitCost) * 100) / 100
      : Number(cur.unit_cost);
  const nextPrice =
    input.unitPrice !== undefined && Number(input.unitPrice) >= 0
      ? Math.round(Number(input.unitPrice) * 100) / 100
      : Number(cur.unit_price);

  const { rows } = await client.query<{
    id: string;
    stock_qty: number;
    unit_cost: string;
    unit_price: string;
  }>(
    `UPDATE sanayipro.inventory_items
     SET stock_qty = $1,
         unit_cost = $2,
         unit_price = $3,
         version = version + 1,
         updated_at = now()
     WHERE id = $4 AND organization_id = $5 AND branch_id = $6
     RETURNING id, stock_qty, unit_cost::text, unit_price::text`,
    [
      nextQty,
      nextCost,
      nextPrice,
      input.inventoryItemId,
      actor.organizationId,
      actor.branchId,
    ],
  );

  await client.query(
    `INSERT INTO sanayipro.inventory_movements
       (id, organization_id, branch_id, inventory_item_id, actor_user_id, movement_type, quantity_delta, balance_after, unit_cost, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      randomUUID(),
      actor.organizationId,
      actor.branchId,
      input.inventoryItemId,
      actor.userId,
      input.mode === "entry" ? "STOCK_IN" : "COUNT_ADJUST",
      delta,
      nextQty,
      nextCost,
      cleanText(
        input.note ||
          (input.mode === "entry" ? "Tedarik stok girişi" : "Sayım düzeltmesi"),
        250,
      ),
    ],
  );

  return {
    id: rows[0].id,
    stockQty: rows[0].stock_qty,
    delta,
    unitCost: Number(rows[0].unit_cost),
    unitPrice: Number(rows[0].unit_price),
  };
}

export async function upsertSupplier(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    id?: string;
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
  },
) {
  const name = cleanText(input.name, 140);
  if (name.length < 2) {
    throw new AccessError("VALIDATION", 400, "Tedarikçi firma adını girin.");
  }
  const supplierId = input.id && isUuid(input.id) ? input.id : randomUUID();
  const { rows } = await client.query<{
    id: string;
    name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
  }>(
    `INSERT INTO sanayipro.suppliers
       (id, organization_id, name, contact_name, phone, email, active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           contact_name = EXCLUDED.contact_name,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           updated_at = now()
       WHERE sanayipro.suppliers.organization_id = EXCLUDED.organization_id
     RETURNING id, name, contact_name, phone, email`,
    [
      supplierId,
      actor.organizationId,
      name,
      input.contactName ? cleanText(input.contactName, 120) : null,
      input.phone ? cleanText(input.phone, 40) : null,
      input.email ? cleanText(input.email, 140) : null,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Tedarikçi kaydedilemedi.");
  }
  return rows[0];
}

export async function recordExpenseOrRefund(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    id?: string;
    workOrderId?: string | null;
    kind: "expense" | "refund";
    title: string;
    amount: number;
    category?: string;
    note?: string;
  },
) {
  const title = cleanText(input.title, 200);
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (title.length < 2 || !Number.isFinite(amount) || amount <= 0) {
    throw new AccessError("VALIDATION", 400, "Geçerli açıklama ve tutar girin.");
  }
  const workOrderId =
    input.workOrderId && isUuid(input.workOrderId) ? input.workOrderId : null;

  if (input.kind === "refund") {
    if (!workOrderId) {
      throw new AccessError("VALIDATION", 400, "İade için geçerli bir iş emri seçin.");
    }
    const orderUpdate = await client.query<{ id: string; paid_amount: string }>(
      `UPDATE sanayipro.work_orders
       SET paid_amount = paid_amount - $1,
           version = version + 1,
           updated_at = now()
       WHERE id = $2
         AND organization_id = $3
         AND branch_id = $4
         AND paid_amount >= $1
       RETURNING id, paid_amount::text`,
      [amount, workOrderId, actor.organizationId, actor.branchId],
    );
    if (!orderUpdate.rows[0]) {
      throw new AccessError(
        "CONFLICT",
        409,
        "İade tutarı tahsil edilen tutarı aşamaz.",
      );
    }
    await client.query(
      `INSERT INTO sanayipro.work_order_timelines
         (id, organization_id, branch_id, work_order_id, actor_user_id, actor_name, event_type, description)
       VALUES ($1, $2, $3, $4, $5, $6, 'REFUND', $7)`,
      [
        randomUUID(),
        actor.organizationId,
        actor.branchId,
        workOrderId,
        actor.userId,
        actor.actorName || "Kasa",
        `₺${amount.toFixed(2)} ödeme iadesi kaydedildi: ${title}`,
      ],
    );
  }

  const expenseId = input.id && isUuid(input.id) ? input.id : randomUUID();
  const { rows } = await client.query<{
    id: string;
    kind: string;
    title: string;
    amount: string;
    incurred_at: string;
  }>(
    `INSERT INTO sanayipro.expenses
       (id, organization_id, branch_id, work_order_id, recorded_by_user_id, kind, title, amount, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, kind, title, amount::text, incurred_at::text`,
    [
      expenseId,
      actor.organizationId,
      actor.branchId,
      workOrderId,
      actor.userId,
      input.kind === "refund" ? "refund" : "expense",
      title,
      amount,
      input.note ? cleanText(input.note, 400) : null,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("FORBIDDEN", 403, "Finans işlemi kaydedilemedi.");
  }
  return rows[0];
}

export async function updateStaffMember(
  client: OperationalSqlClient,
  actor: OperationalActor,
  input: {
    staffId: string;
    fullName: string;
    roleTitle?: string;
    specialty?: string;
    phone?: string;
    email?: string;
    active?: boolean;
  },
) {
  if (!isUuid(input.staffId)) {
    throw new AccessError("VALIDATION", 400, "Geçerli bir personel seçin.");
  }
  const fullName = cleanText(input.fullName, 120);
  if (fullName.length < 2) {
    throw new AccessError("VALIDATION", 400, "Personel adı en az 2 karakter olmalıdır.");
  }
  const { rows } = await client.query<{
    id: string;
    full_name: string;
    role_title: string;
    specialty: string | null;
    active: boolean;
  }>(
    `UPDATE sanayipro.staff_members
     SET full_name = $1,
         role_title = COALESCE($2, role_title),
         specialty = COALESCE($3, specialty),
         phone = COALESCE($4, phone),
         email = COALESCE($5, email),
         active = COALESCE($6, active),
         updated_at = now()
     WHERE id = $7 AND organization_id = $8 AND branch_id = $9
     RETURNING id, full_name, role_title, specialty, active`,
    [
      fullName,
      input.roleTitle ? cleanText(input.roleTitle, 80) : null,
      input.specialty ? cleanText(input.specialty, 120) : null,
      input.phone ? cleanText(input.phone, 40) : null,
      input.email ? cleanText(input.email, 120) : null,
      input.active !== undefined ? Boolean(input.active) : null,
      input.staffId,
      actor.organizationId,
      actor.branchId,
    ],
  );
  if (!rows[0]) {
    throw new AccessError("NOT_FOUND", 404, "Personel bulunamadı veya güncelleme yetkiniz yok.");
  }
  return rows[0];
}

