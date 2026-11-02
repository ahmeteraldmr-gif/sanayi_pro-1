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
