import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import {
  provisionOwner,
  type SqlClient,
} from "../../src/server/onboarding-core";
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
} from "../../src/server/operations-core";
import {
  AccessError,
  assertRuntimeCapabilities,
  RUNTIME_ROLE_CHECK_SQL,
  type RuntimeCapabilities,
} from "../../src/server/security";

const id = (value: number) =>
  `00000000-0000-0000-0000-${String(value).padStart(12, "0")}`;

let db: PGlite;

function txAsOperationalClient(tx: Transaction): OperationalSqlClient {
  return {
    async query<R = Record<string, unknown>>(text: string, values: unknown[] = []) {
      const res = await tx.query<R>(text, values);
      return { rows: res.rows };
    },
  };
}

async function asOnboarding<T>(work: () => Promise<T>): Promise<T> {
  await db.exec("SET ROLE sanayipro_onboarding");
  try {
    return await work();
  } finally {
    await db.exec("RESET ROLE");
  }
}

async function asRuntimeActor<T>(
  userId: string,
  organizationId: string,
  branchId: string,
  actorName: string,
  actorRole: string,
  work: (client: OperationalSqlClient, actor: OperationalActor, tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE sanayipro_runtime");
    await tx.query(
      "SELECT set_config('request.jwt.claims',$1,true), set_config('app.organization_id',$2,true), set_config('app.branch_id',$3,true)",
      [
        JSON.stringify({ sub: userId, role: "authenticated" }),
        organizationId,
        branchId,
      ],
    );
    const client = txAsOperationalClient(tx);
    const actor: OperationalActor = {
      userId,
      organizationId,
      branchId,
      actorName,
      actorRole,
    };
    return work(client, actor, tx);
  });
}

describe(
  "AŞAMA 7 — 14-Step End-to-End Multi-Tenant Operational Workflow on Embedded PostgreSQL",
  { concurrency: false },
  () => {
    const ownerAUserId = id(301);
    const employeeAUserId = id(302);
    const viewerAUserId = id(303);
    const ownerBUserId = id(401);

    let orgAId = "";
    let branchAId = "";
    let orgBId = "";
    let branchBId = "";

    let customerAId = "";
    let vehicleAId = "";
    let staffTechnicianAId = "";
    let workOrderAId = "";
    let appointmentAId = "";
    let inventoryItemAId = "";

    before(async () => {
      db = await PGlite.create();
      await db.exec(`
        CREATE SCHEMA auth;
        CREATE TABLE auth.users(id uuid PRIMARY KEY);
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
          SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')::uuid
        $$;
        CREATE ROLE anon NOLOGIN;
        CREATE ROLE authenticated NOLOGIN;
        CREATE ROLE service_role NOLOGIN;
      `);
      for (const u of [ownerAUserId, employeeAUserId, viewerAUserId, ownerBUserId]) {
        await db.query("INSERT INTO auth.users(id) VALUES ($1)", [u]);
      }
      await db.exec(await readFile("prisma/bootstrap.sql", "utf8"));
      await db.exec("SET ROLE sanayipro_migrator");
      for (const migration of [
        "202610220001_tenant_foundation",
        "202610260001_onboarding_provisioning",
        "202611020001_operational_schema",
      ]) {
        await db.exec(
          await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"),
        );
      }
      await db.exec("RESET ROLE");
    });

    after(async () => {
      await db?.close();
    });

    test("All 29 tables in sanayipro schema enable AND force RLS; runtime capabilities pass", async () => {
      const tables = await db.query<{
        relname: string;
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(
        "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relnamespace='sanayipro'::regnamespace AND relkind='r' ORDER BY relname",
      );
      assert.equal(tables.rows.length, 29);
      assert.ok(
        tables.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity),
        "Every table in sanayipro must enable and force RLS",
      );

      const procs = await db.query<{ proname: string; prosecdef: boolean }>(
        "SELECT proname, prosecdef FROM pg_proc WHERE pronamespace='sanayipro'::regnamespace",
      );
      assert.ok(
        procs.rows.every((p) => !p.prosecdef),
        "No function in sanayipro may use SECURITY DEFINER",
      );
    });

    test("Step 1 & 2: Create Organization A (Owner account) and Employee + Viewer accounts", async () => {
      const provisionedA = await asOnboarding(() =>
        provisionOwner(db as SqlClient, {
          userId: ownerAUserId,
          displayName: "Ahmet Yılmaz",
          organizationName: "Yılmaz Oto Servis A.Ş.",
          branchName: "Dörtyol Merkez Şube",
        }),
      );
      assert.equal(provisionedA.created, true);
      orgAId = provisionedA.organizationId;
      branchAId = provisionedA.branchId;

      // Provision employee (Usta) and viewer (Stajyer/Kısıtlı) memberships in Organization A
      const techRoleId = id(501);
      const viewerRoleId = id(502);
      await db.exec("SET ROLE sanayipro_migrator");
      try {
        await db.query(
          "INSERT INTO sanayipro.user_profiles(id, display_name) VALUES ($1, 'Mehmet Usta'), ($2, 'Can Danışman')",
          [employeeAUserId, viewerAUserId],
        );
        await db.query(
          "INSERT INTO sanayipro.roles(id, organization_id, code, name) VALUES ($1, $3, 'technician', 'Atölye Ustası'), ($2, $3, 'viewer', 'Kısıtlı Gözlemci')",
          [techRoleId, viewerRoleId, orgAId],
        );
        // Technician gets operational read/write permissions EXCEPT finance.write and work_orders.assign
        const techPermissions = [
          "app.access",
          "tenant.read",
          "customers.read",
          "vehicles.read",
          "work_orders.read",
          "work_orders.write",
          "appointments.read",
          "appointments.write",
          "inventory.read",
          "inventory.write",
          "faults.read",
          "faults.write",
          "team.read",
        ];
        await db.query(
          "INSERT INTO sanayipro.role_permissions(organization_id, role_id, permission_code) SELECT $1, $2, unnest($3::text[])",
          [orgAId, techRoleId, techPermissions],
        );
        // Viewer gets only read permissions
        const viewerPermissions = [
          "app.access",
          "tenant.read",
          "customers.read",
          "vehicles.read",
          "work_orders.read",
          "appointments.read",
          "inventory.read",
        ];
        await db.query(
          "INSERT INTO sanayipro.role_permissions(organization_id, role_id, permission_code) SELECT $1, $2, unnest($3::text[])",
          [orgAId, viewerRoleId, viewerPermissions],
        );
        await db.query(
          "INSERT INTO sanayipro.organization_memberships(organization_id, user_id, role_id) VALUES ($1, $2, $3), ($1, $4, $5)",
          [orgAId, employeeAUserId, techRoleId, viewerAUserId, viewerRoleId],
        );
        await db.query(
          "INSERT INTO sanayipro.branch_memberships(branch_id, organization_id, user_id, role_id) VALUES ($1, $2, $3, $4), ($1, $2, $5, $6)",
          [branchAId, orgAId, employeeAUserId, techRoleId, viewerAUserId, viewerRoleId],
        );
      } finally {
        await db.exec("RESET ROLE");
      }

      // Verify runtime capability guard for Owner A
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (_client, _actor, tx) => {
          const cap = await tx.query<RuntimeCapabilities>(RUNTIME_ROLE_CHECK_SQL);
          assert.doesNotThrow(() => assertRuntimeCapabilities(cap.rows[0]));
        },
      );
    });

    test("Step 3 & 4: Owner adds Customer and Vehicle in Organization A (with duplicate plate protection)", async () => {
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client, actor) => {
          const customer = await createCustomer(client, actor, {
            fullName: "Kemal Kaya",
            phone: "0532 555 01 42",
            email: "kemal.kaya@ornek.com",
          });
          customerAId = customer.id;
          assert.equal(customer.full_name, "Kemal Kaya");
          assert.equal(customer.normalized_phone, "05325550142");

          const vehicle = await createVehicle(client, actor, {
            customerId: customerAId,
            plate: "31 SNY 202",
            brand: "Volkswagen",
            model: "Passat 2.0 TDI",
            year: 2021,
            kilometer: 84500,
            fuelType: "Dizel",
          });
          vehicleAId = vehicle.id;
          assert.equal(vehicle.plate, "31 SNY 202");
          assert.equal(vehicle.kilometer, 84500);

          // Duplicate plate in the same organization must fail with CONFLICT
          await assert.rejects(
            createVehicle(client, actor, {
              customerId: customerAId,
              plate: "31 sny 202",
              brand: "Volkswagen",
              model: "Passat",
              year: 2021,
            }),
            (err: unknown) => err instanceof AccessError && err.code === "CONFLICT",
          );
        },
      );
    });

    test("Step 5 & 6: Owner opens Work Order, adds labor & note, and assigns Technician", async () => {
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client, actor) => {
          const staff = await createStaffMember(client, actor, {
            userId: employeeAUserId,
            fullName: "Mehmet Usta",
            roleTitle: "Atölye Ustası",
            specialty: "Motor & Mekanik",
            phone: "0532 410 20 30",
          });
          staffTechnicianAId = staff.id;

          const order = await createWorkOrder(client, actor, {
            orderNumber: "WO-2026-00101",
            customerId: customerAId,
            vehicleId: vehicleAId,
            complaint: "Motor soğukken tekleme ve P0300 arıza lambası",
            intakeKilometer: 84500,
            fuelLevel: 60,
          });
          workOrderAId = order.id;
          assert.equal(order.order_number, "WO-2026-00101");
          assert.equal(order.status, "RECEIVED");

          // Assign technician explicitly (Step 6)
          const assignment = await assignTechnicianToWorkOrder(client, actor, {
            workOrderId: workOrderAId,
            staffMemberId: staffTechnicianAId,
          });
          assert.equal(assignment.staffName, "Mehmet Usta");

          // Add labor item
          const labor = await addWorkOrderLabor(client, actor, {
            workOrderId: workOrderAId,
            name: "Enjektör ve Ateşleme Teşhis İşçiliği",
            hours: 2,
            hourlyRate: 750,
          });
          assert.equal(labor.totalPrice, 1500);
          assert.equal(labor.grandTotal, 1500);

          // Add note & fault search
          await addWorkOrderNote(client, actor, {
            workOrderId: workOrderAId,
            content: "1. ve 3. silindir ateşleme bobini soketleri kontrol edildi.",
          });
          await recordFaultCodeSearch(client, actor, {
            dtcCode: "P0300",
            vehicleId: vehicleAId,
            vehiclePlate: "31 SNY 202",
            vehicleModel: "Volkswagen Passat 2.0 TDI",
            technicianNotes: "Rastgele/çoklu silindir tekleme tespiti",
          });
        },
      );
    });

    test("Step 7: Owner creates an Appointment and moves it via Calendar Drag & Drop", async () => {
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client, actor) => {
          const appt = await createAppointment(client, actor, {
            vehicleId: vehicleAId,
            customerId: customerAId,
            staffMemberId: staffTechnicianAId,
            startsAt: "2026-11-05T09:00:00.000Z",
            durationMinutes: 60,
            serviceNote: "Periyodik Bakım ve Kontrol",
          });
          appointmentAId = appt.id;
          assert.equal(appt.duration_minutes, 60);

          // Overlapping appointment for the same technician must be rejected
          await assert.rejects(
            createAppointment(client, actor, {
              vehicleId: vehicleAId,
              staffMemberId: staffTechnicianAId,
              startsAt: "2026-11-05T09:30:00.000Z",
              durationMinutes: 60,
              serviceNote: "Çakışan Randevu",
            }),
            (err: unknown) => err instanceof AccessError && err.code === "CONFLICT",
          );

          // Move appointment to 11:15 UTC (90 minutes duration)
          const moved = await moveAppointment(client, actor, {
            appointmentId: appointmentAId,
            startsAt: "2026-11-05T11:15:00.000Z",
            durationMinutes: 90,
            status: "Onaylandı",
          });
          assert.equal(moved.duration_minutes, 90);
          assert.equal(moved.status, "Onaylandı");
          assert.equal(
            new Date(moved.starts_at).toISOString(),
            "2026-11-05T11:15:00.000Z",
          );
        },
      );
    });

    test("Step 8: Owner creates Inventory Item and uses parts on Work Order (atomic stock & negative stock guard)", async () => {
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client, actor) => {
          const item = await createInventoryItem(client, actor, {
            sku: "IGN-COIL-01",
            name: "Ateşleme Bobini OEM",
            stockQty: 5,
            minStockQty: 2,
            unitPrice: 1250,
            unitCost: 850,
          });
          inventoryItemAId = item.id;
          assert.equal(item.stock_qty, 5);

          // Use 2 units on work order -> stock becomes 3, parts_total += 2500, grand_total = 1500 + 2500 = 4000
          const usage = await useInventoryPartOnWorkOrder(client, actor, {
            workOrderId: workOrderAId,
            inventoryItemId: inventoryItemAId,
            quantity: 2,
            note: "2 adet bobin yenilendi",
          });
          assert.equal(usage.remainingStock, 3);
          assert.equal(usage.totalPrice, 2500);
          assert.equal(usage.grandTotal, 4000);

          // Attempting to use 4 units when only 3 remain must fail with CONFLICT and leave stock at 3
          await assert.rejects(
            useInventoryPartOnWorkOrder(client, actor, {
              workOrderId: workOrderAId,
              inventoryItemId: inventoryItemAId,
              quantity: 4,
            }),
            (err: unknown) => err instanceof AccessError && err.code === "CONFLICT",
          );

          const verifyStock = await client.query<{ stock_qty: number }>(
            "SELECT stock_qty FROM sanayipro.inventory_items WHERE id = $1",
            [inventoryItemAId],
          );
          assert.equal(verifyStock.rows[0].stock_qty, 3);
        },
      );
    });

    test("Step 9: Owner records Payment on Work Order (with overpayment guard)", async () => {
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client, actor) => {
          // Grand total is 4000. Record 2500 first.
          const firstPayment = await recordPayment(client, actor, {
            workOrderId: workOrderAId,
            amount: 2500,
            paymentMethod: "CREDIT_CARD",
            referenceNo: "POS-001",
          });
          assert.equal(firstPayment.paidAmount, 2500);
          assert.equal(firstPayment.remainingBalance, 1500);

          // Attempting to collect 2000 (exceeding remaining 1500) must fail with CONFLICT
          await assert.rejects(
            recordPayment(client, actor, {
              workOrderId: workOrderAId,
              amount: 2000,
              paymentMethod: "CASH",
            }),
            (err: unknown) => err instanceof AccessError && err.code === "CONFLICT",
          );

          // Collect remaining 1500
          const secondPayment = await recordPayment(client, actor, {
            workOrderId: workOrderAId,
            amount: 1500,
            paymentMethod: "CASH",
          });
          assert.equal(secondPayment.paidAmount, 4000);
          assert.equal(secondPayment.remainingBalance, 0);
        },
      );
    });

    test("Step 10: Logout and Re-login as Owner A — all operational data persists in PostgreSQL", async () => {
      // Simulate clean session logout (empty context transaction)
      await db.transaction(async (tx) => {
        await tx.exec("SET LOCAL ROLE sanayipro_runtime");
        const emptyCheck = await tx.query("SELECT id FROM sanayipro.work_orders");
        assert.equal(emptyCheck.rows.length, 0);
      });

      // Re-login as Owner A in a new session transaction
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client) => {
          const customers = await client.query<{ id: string }>(
            "SELECT id FROM sanayipro.customers",
          );
          const vehicles = await client.query<{ id: string }>(
            "SELECT id FROM sanayipro.vehicles",
          );
          const orders = await client.query<{
            id: string;
            grand_total: string;
            paid_amount: string;
            primary_technician_id: string;
          }>(
            "SELECT id, grand_total::text, paid_amount::text, primary_technician_id FROM sanayipro.work_orders",
          );
          const appointments = await client.query<{ id: string; status: string }>(
            "SELECT id, status FROM sanayipro.appointments",
          );
          const payments = await client.query<{ id: string; amount: string }>(
            "SELECT id, amount::text FROM sanayipro.payments ORDER BY created_at",
          );
          const stock = await client.query<{ stock_qty: number }>(
            "SELECT stock_qty FROM sanayipro.inventory_items WHERE id = $1",
            [inventoryItemAId],
          );

          assert.equal(customers.rows.length, 1);
          assert.equal(vehicles.rows.length, 1);
          assert.equal(orders.rows.length, 1);
          assert.equal(Number(orders.rows[0].grand_total), 4000);
          assert.equal(Number(orders.rows[0].paid_amount), 4000);
          assert.equal(orders.rows[0].primary_technician_id, staffTechnicianAId);
          assert.equal(appointments.rows.length, 1);
          assert.equal(appointments.rows[0].status, "Onaylandı");
          assert.equal(payments.rows.length, 2);
          assert.equal(stock.rows[0].stock_qty, 3);
        },
      );
    });

    test("Step 11: Second employee (Technician) of Organization A logs in, reads authorized data, and updates work order", async () => {
      await asRuntimeActor(
        employeeAUserId,
        orgAId,
        branchAId,
        "Mehmet Usta",
        "Atölye Ustası",
        async (client, actor) => {
          // Employee sees Organization A's customer, vehicle, work order, appointment, and inventory
          const orders = await client.query<{ id: string; order_number: string }>(
            "SELECT id, order_number FROM sanayipro.work_orders",
          );
          assert.equal(orders.rows.length, 1);
          assert.equal(orders.rows[0].id, workOrderAId);

          // Employee can add a technician note and update work order status to READY
          const note = await addWorkOrderNote(client, actor, {
            workOrderId: workOrderAId,
            content: "Yol testi yapıldı, P0300 tekleme arızası tamamen giderildi.",
          });
          assert.equal(note.author_name, "Mehmet Usta");

          const statusRes = await updateWorkOrderStatus(client, actor, {
            workOrderId: workOrderAId,
            status: "READY",
            description: "Mehmet Usta son kontrolü tamamladı · Araç hazır",
          });
          assert.equal(statusRes.status, "READY");
        },
      );
    });

    test("Step 12: Create Organization B and prove complete cross-tenant isolation (SELECT, INSERT, UPDATE, DELETE, FK)", async () => {
      const provisionedB = await asOnboarding(() =>
        provisionOwner(db as SqlClient, {
          userId: ownerBUserId,
          displayName: "Burak Demir",
          organizationName: "Demir Oto Servis",
          branchName: "İskenderun Şubesi",
        }),
      );
      assert.equal(provisionedB.created, true);
      orgBId = provisionedB.organizationId;
      branchBId = provisionedB.branchId;

      await asRuntimeActor(
        ownerBUserId,
        orgBId,
        branchBId,
        "Burak Demir",
        "İşletme Sahibi",
        async (client, _actor, tx) => {
          // 1. Organization B sees 0 rows from Organization A across all operational tables
          for (const table of [
            "customers",
            "vehicles",
            "staff_members",
            "work_orders",
            "work_order_timelines",
            "work_order_notes",
            "technician_assignments",
            "work_order_labor_items",
            "work_order_part_items",
            "appointments",
            "inventory_items",
            "inventory_movements",
            "payments",
            "fault_code_searches",
          ]) {
            const res = await client.query(`SELECT id FROM sanayipro.${table}`);
            assert.equal(
              res.rows.length,
              0,
              `Organization B must see 0 rows in ${table}`,
            );
          }

          // 2. Organization B cannot UPDATE or DELETE Organization A's records by ID
          const updateAttempt = await tx.query(
            "UPDATE sanayipro.work_orders SET status = 'CANCELLED' WHERE id = $1 RETURNING id",
            [workOrderAId],
          );
          assert.equal(updateAttempt.rows.length, 0);

          const deleteAttempt = await tx.query(
            "DELETE FROM sanayipro.customers WHERE id = $1 RETURNING id",
            [customerAId],
          );
          assert.equal(deleteAttempt.rows.length, 0);

          // 3. Organization B cannot INSERT a row with Organization A's organization_id
          await assert.rejects(
            tx.query(
              "INSERT INTO sanayipro.customers(organization_id, full_name, phone, normalized_phone) VALUES ($1, 'Kaçak', '05320000000', '05320000000')",
              [orgAId],
            ),
            /row-level security/,
          );
        },
      );

      // 4. Forged tenant context (User B claiming Org A + Branch A) fails closed
      await asRuntimeActor(
        ownerBUserId,
        orgAId,
        branchAId,
        "Burak Demir",
        "İşletme Sahibi",
        async (client) => {
          const orders = await client.query("SELECT id FROM sanayipro.work_orders");
          assert.equal(orders.rows.length, 0);
        },
      );

      // 5. Composite Foreign Key blocks cross-tenant linking even at DB constraint level
      await assert.rejects(
        db.transaction(async (tx) => {
          await tx.exec("SET LOCAL ROLE sanayipro_migrator");
          await tx.query(
            `INSERT INTO sanayipro.work_orders
               (organization_id, branch_id, order_number, customer_id, vehicle_id, complaint)
             VALUES ($1, $2, 'WO-CROSS-1', $3, $4, 'Cross tenant attack')`,
            [orgBId, branchBId, customerAId, vehicleAId],
          );
        }),
        /foreign key/,
      );
    });

    test("Step 13: Unauthorized roles cannot execute restricted operations (RLS permission enforcement)", async () => {
      // 1a. Technician (employeeAUserId) lacks 'finance.write' -> cannot insert into payments
      await assert.rejects(
        asRuntimeActor(
          employeeAUserId,
          orgAId,
          branchAId,
          "Mehmet Usta",
          "Atölye Ustası",
          (_client, _actor, tx) =>
            tx.query(
              `INSERT INTO sanayipro.payments
                 (organization_id, branch_id, work_order_id, customer_id, amount, payment_method)
               VALUES ($1, $2, $3, $4, 100, 'CASH')`,
              [orgAId, branchAId, workOrderAId, customerAId],
            ),
        ),
        /row-level security/,
      );

      // 1b. Technician lacks 'work_orders.assign' -> cannot assign technicians
      await assert.rejects(
        asRuntimeActor(
          employeeAUserId,
          orgAId,
          branchAId,
          "Mehmet Usta",
          "Atölye Ustası",
          (client, actor) =>
            assignTechnicianToWorkOrder(client, actor, {
              workOrderId: workOrderAId,
              staffMemberId: staffTechnicianAId,
            }),
        ),
        /row-level security|FORBIDDEN/,
      );

      // 2a. Viewer (viewerAUserId) can read work orders and cannot delete appointments
      await asRuntimeActor(
        viewerAUserId,
        orgAId,
        branchAId,
        "Can Danışman",
        "Kısıtlı Gözlemci",
        async (client, actor, tx) => {
          const orders = await client.query("SELECT id FROM sanayipro.work_orders");
          assert.equal(orders.rows.length, 1);

          // Viewer cannot update work order status (0 rows updated -> FORBIDDEN)
          await assert.rejects(
            updateWorkOrderStatus(client, actor, {
              workOrderId: workOrderAId,
              status: "DELIVERED",
            }),
            (err: unknown) => err instanceof AccessError && err.code === "FORBIDDEN",
          );

          // Viewer cannot delete appointments (0 rows deleted by RLS)
          const del = await tx.query(
            "DELETE FROM sanayipro.appointments WHERE id = $1 RETURNING id",
            [appointmentAId],
          );
          assert.equal(del.rows.length, 0);
        },
      );

      // 2b. Viewer cannot insert a customer (rejected by RLS WITH CHECK)
      await assert.rejects(
        asRuntimeActor(
          viewerAUserId,
          orgAId,
          branchAId,
          "Can Danışman",
          "Kısıtlı Gözlemci",
          (client, actor) =>
            createCustomer(client, actor, {
              fullName: "Yetkisiz Kayıt",
              phone: "0532 999 88 77",
            }),
        ),
        /row-level security|FORBIDDEN/,
      );
    });

    test("Step 14: Data integrity & persistence verified after full workflow completion (DELIVERED)", async () => {
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client, actor) => {
          const delivered = await updateWorkOrderStatus(client, actor, {
            workOrderId: workOrderAId,
            status: "DELIVERED",
            description: "Araç müşteriye teslim edildi",
          });
          assert.equal(delivered.status, "DELIVERED");

          const vehicleCheck = await client.query<{
            kilometer: number;
            last_service_at: string | null;
          }>(
            "SELECT kilometer, last_service_at::text FROM sanayipro.vehicles WHERE id = $1",
            [vehicleAId],
          );
          assert.equal(vehicleCheck.rows[0].kilometer, 84500);
          assert.ok(vehicleCheck.rows[0].last_service_at !== null);

          const timelineCheck = await client.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM sanayipro.work_order_timelines WHERE work_order_id = $1",
            [workOrderAId],
          );
          assert.ok(timelineCheck.rows[0].count >= 7);
        },
      );
    });

    test("Step 15: Full CRUD — Customer edit/delete (with FK protection), Vehicle update/toggle/replace/delete, Appointment cancel/delete, Staff update", async () => {
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client, actor) => {
          // 1. Update Customer A
          const updatedCust = await updateCustomer(client, actor, {
            customerId: customerAId,
            fullName: "Kemal Kaya (Güncellendi)",
            phone: "0532 411 22 33",
            email: "kemal.yeni@example.com",
          });
          assert.equal(updatedCust.full_name, "Kemal Kaya (Güncellendi)");
          assert.equal(updatedCust.email, "kemal.yeni@example.com");

          // 2. Customer A has work orders -> deleteCustomer must reject with CONFLICT
          await assert.rejects(
            deleteCustomer(client, actor, { customerId: customerAId }),
            (err: unknown) => err instanceof AccessError && err.code === "CONFLICT",
          );

          // 3. Create a temporary Customer & Vehicle without work orders, then delete them
          const tempCust = await createCustomer(client, actor, {
            fullName: "Geçici Müşteri",
            phone: "0533 888 77 66",
          });
          const tempVeh = await createVehicle(client, actor, {
            customerId: tempCust.id,
            plate: "31 TMP 999",
            brand: "Fiat",
            model: "Fiat Egea",
            year: 2021,
            kilometer: 40000,
          });
          const delVehRes = await deleteVehicle(client, actor, {
            vehicleId: tempVeh.id,
          });
          assert.equal(delVehRes.id, tempVeh.id);

          const delCustRes = await deleteCustomer(client, actor, {
            customerId: tempCust.id,
          });
          assert.equal(delCustRes.id, tempCust.id);

          // 4. Vehicle A has work orders -> deleteVehicle must reject with CONFLICT
          await assert.rejects(
            deleteVehicle(client, actor, { vehicleId: vehicleAId }),
            (err: unknown) => err instanceof AccessError && err.code === "CONFLICT",
          );

          // 5. Update Vehicle A, toggle active, and replace Customer A's vehicle
          const updatedVeh = await updateVehicle(client, actor, {
            vehicleId: vehicleAId,
            plate: "31 KML 321",
            brand: "Volkswagen",
            model: "Volkswagen Passat 2.0 TDI Elegance",
            year: 2020,
            kilometer: 86000,
            fuelType: "Dizel",
          });
          assert.equal(updatedVeh.kilometer, 86000);
          assert.equal(updatedVeh.model, "Volkswagen Passat 2.0 TDI Elegance");

          const replacedVeh = await replaceCustomerVehicle(client, actor, {
            customerId: customerAId,
            oldVehicleId: vehicleAId,
            plate: "31 YEN 2026",
            brand: "Audi",
            model: "Audi A4 40 TDI",
            year: 2024,
            kilometer: 12000,
            fuelType: "Dizel",
          });
          assert.equal(replacedVeh.plate, "31 YEN 2026");

          const oldVehState = await client.query<{ active: boolean }>(
            "SELECT active FROM sanayipro.vehicles WHERE id = $1",
            [vehicleAId],
          );
          assert.equal(oldVehState.rows[0].active, false);

          // Re-activate old vehicle
          const reactivated = await toggleVehicleActive(client, actor, {
            vehicleId: vehicleAId,
            active: true,
          });
          assert.equal(reactivated.active, true);

          // 6. Update Staff Member
          const updatedStaff = await updateStaffMember(client, actor, {
            staffId: staffTechnicianAId,
            fullName: "Mehmet Usta (Başteknisyen)",
            roleTitle: "Baş Usta",
            specialty: "Motor & Şanzıman",
            active: true,
          });
          assert.equal(updatedStaff.full_name, "Mehmet Usta (Başteknisyen)");

          // 7. Cancel / Delete Appointment
          const delAppt = await deleteAppointment(client, actor, {
            appointmentId: appointmentAId,
          });
          assert.equal(delAppt.id, appointmentAId);
        },
      );
    });

    test("Step 16: Full CRUD — Suppliers, Stock Entry/Correction, Quotes & Quote Items, Part Requests, Expenses & Refunds, and Fault Record attachment", async () => {
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client, actor) => {
          // 1. Upsert Supplier (Create & Edit)
          const supCreated = await upsertSupplier(client, actor, {
            name: "Çukurova Oto Yedek Parça A.Ş.",
            contactName: "Serkan Bey",
            phone: "0326 618 00 11",
            email: "siparis@cukurovaoto.com",
          });
          assert.equal(supCreated.name, "Çukurova Oto Yedek Parça A.Ş.");

          const supEdited = await upsertSupplier(client, actor, {
            id: supCreated.id,
            name: "Çukurova Oto Parça & Ekipman A.Ş.",
            contactName: "Serkan Kaya",
            phone: "0326 618 00 22",
            email: "kurumsal@cukurovaoto.com",
          });
          assert.equal(supEdited.id, supCreated.id);
          assert.equal(supEdited.contact_name, "Serkan Kaya");

          // 2. Stock Entry (+10) & Stock Count Correction (to 11)
          const stockIn = await adjustInventoryStock(client, actor, {
            inventoryItemId: inventoryItemAId,
            mode: "entry",
            quantity: 10,
            note: "Tedarikçiden yeni parti girişi",
          });
          assert.equal(stockIn.stockQty, 13); // 3 + 10 = 13

          const stockCount = await adjustInventoryStock(client, actor, {
            inventoryItemId: inventoryItemAId,
            mode: "count",
            quantity: 11,
            note: "Yıl sonu raf sayım düzeltmesi",
          });
          assert.equal(stockCount.stockQty, 11);
          assert.equal(stockCount.delta, -2);

          // 3. Work Order Details Update, Quote Item Add, Quote Item Toggle, Quote Status Approval
          const updatedDetails = await updateWorkOrderDetails(client, actor, {
            workOrderId: workOrderAId,
            diagnosis: "Ateşleme bobini ve buji seti değişimi tamamlandı.",
          });
          assert.ok(updatedDetails.diagnosis.includes("Ateşleme bobini"));

          const quoteItem = await addWorkOrderQuoteItem(client, actor, {
            workOrderId: workOrderAId,
            operation: "DSG Mekatronik Basınç Testi",
            laborAmount: 1200,
            inventoryItemId: inventoryItemAId,
            partName: "Ateşleme Bobini OEM",
            quantity: 1,
            unitPrice: 1250,
            note: "Orijinal parça garantili",
          });
          assert.equal(quoteItem.lineTotal, 2450);

          const toggled = await toggleWorkOrderQuoteItemStatus(client, actor, {
            workOrderId: workOrderAId,
            quoteItemId: quoteItem.quoteItemId,
            nextStatus: "APPROVED",
          });
          assert.equal(toggled.status, "APPROVED");
          assert.equal(toggled.delta, 2450);

          const quoteApproved = await updateWorkOrderQuoteStatus(client, actor, {
            workOrderId: workOrderAId,
            status: "APPROVED",
            channel: "WhatsApp",
          });
          assert.equal(quoteApproved.approvalStatus, "APPROVED");
          assert.equal(quoteApproved.grandTotal, 6450); // 4000 + 2450

          // 4. Part Request Create & Status Update
          const partReq = await createWorkOrderPartRequest(client, actor, {
            workOrderId: workOrderAId,
            inventoryItemId: inventoryItemAId,
            partName: "Ateşleme Bobini OEM",
            quantity: 1,
            requestedBy: "Mehmet Usta",
            note: "Acil",
          });
          assert.equal(partReq.status, "REQUESTED");

          const partReqUpdated = await updateWorkOrderPartRequestStatus(
            client,
            actor,
            {
              workOrderId: workOrderAId,
              requestId: partReq.id,
              status: "DELIVERED",
            },
          );
          assert.equal(partReqUpdated.status, "DELIVERED");

          // 5. Attach OBD-II Fault Record to Work Order (vehicle_fault_records)
          const attachedFault = await attachFaultRecordToWorkOrder(client, actor, {
            workOrderId: workOrderAId,
            dtcCode: "P0300",
            titleTr: "Rastgele / Çoklu Silindir Tekleme Tespit Edildi",
            checklist: [
              "Buji ve ateşleme bobinlerini kontrol et",
              "Enjektör balans değerlerini ölç",
            ],
          });
          assert.ok(attachedFault.diagnosis.includes("P0300"));

          const vfRows = await client.query<{ id: string; dtc_code: string }>(
            "SELECT id, dtc_code FROM sanayipro.vehicle_fault_records WHERE work_order_id = $1",
            [workOrderAId],
          );
          assert.equal(vfRows.rows.length, 1);
          assert.equal(vfRows.rows[0].dtc_code, "P0300");

          // 6. Record Expense & Refund (with atomic paid_amount decrement)
          const expense = await recordExpenseOrRefund(client, actor, {
            kind: "expense",
            title: "Atölye Elektrik ve Kompresör Bakımı",
            amount: 1850,
          });
          assert.equal(expense.kind, "expense");
          assert.equal(Number(expense.amount), 1850);

          const refund = await recordExpenseOrRefund(client, actor, {
            kind: "refund",
            workOrderId: workOrderAId,
            title: "Müşteri İskonto İadesi",
            amount: 500,
          });
          assert.equal(refund.kind, "refund");

          const orderAfterRefund = await client.query<{ paid_amount: string }>(
            "SELECT paid_amount::text FROM sanayipro.work_orders WHERE id = $1",
            [workOrderAId],
          );
          assert.equal(Number(orderAfterRefund.rows[0].paid_amount), 3500); // 4000 - 500
        },
      );
    });

    test("Step 17: Cross-Tenant IDOR Defense — Organization B cannot mutate any Organization A entity via DAL functions", async () => {
      await asRuntimeActor(
        ownerBUserId,
        orgBId,
        branchBId,
        "Burak Demir",
        "İşletme Sahibi",
        async (client, actor) => {
          // Every DAL mutation targeting Organization A's IDs must fail with NOT_FOUND / FORBIDDEN / CONFLICT
          await assert.rejects(
            updateCustomer(client, actor, {
              customerId: customerAId,
              fullName: "IDOR Hack",
              phone: "0532 111 22 33",
            }),
            (err: unknown) => err instanceof AccessError,
          );

          await assert.rejects(
            deleteCustomer(client, actor, { customerId: customerAId }),
            (err: unknown) => err instanceof AccessError,
          );

          await assert.rejects(
            updateVehicle(client, actor, {
              vehicleId: vehicleAId,
              plate: "31 HCK 999",
              model: "Hacked",
            }),
            (err: unknown) => err instanceof AccessError,
          );

          await assert.rejects(
            deleteVehicle(client, actor, { vehicleId: vehicleAId }),
            (err: unknown) => err instanceof AccessError,
          );

          await assert.rejects(
            adjustInventoryStock(client, actor, {
              inventoryItemId: inventoryItemAId,
              mode: "entry",
              quantity: 5,
            }),
            (err: unknown) => err instanceof AccessError,
          );

          await assert.rejects(
            addWorkOrderQuoteItem(client, actor, {
              workOrderId: workOrderAId,
              operation: "IDOR Quote",
              laborAmount: 500,
              quantity: 1,
              unitPrice: 0,
            }),
            (err: unknown) => err instanceof AccessError,
          );

          await assert.rejects(
            recordExpenseOrRefund(client, actor, {
              kind: "refund",
              workOrderId: workOrderAId,
              title: "IDOR Refund",
              amount: 100,
            }),
            (err: unknown) => err instanceof AccessError,
          );
        },
      );
    });

    test("Step 18: Super Admin (`sanayipro.platform_admins`) security — unauthorized users rejected, authorized Platform Admin verified", async () => {
      const platformAdminUserId = id(9001);
      await db.query(
        "INSERT INTO auth.users(id) VALUES ($1) ON CONFLICT DO NOTHING",
        [platformAdminUserId],
      );

      // 1. Regular tenant owner (ownerAUserId) is NOT a platform admin and cannot read/insert platform_admins
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client, _actor, tx) => {
          const isAdmin = await client.query<{ val: boolean }>(
            "SELECT sanayipro.is_platform_admin() AS val",
          );
          assert.equal(isAdmin.rows[0].val, false);

          const rows = await client.query("SELECT user_id FROM sanayipro.platform_admins");
          assert.equal(rows.rows.length, 0);

          await assert.rejects(
            tx.query(
              "INSERT INTO sanayipro.platform_admins(user_id, active) VALUES ($1, true)",
              [ownerAUserId],
            ),
            /permission denied|row-level security/,
          );
        },
      );

      // 2. Grant platform_admin to platformAdminUserId via migrator role
      await db.transaction(async (tx) => {
        await tx.exec("SET LOCAL ROLE sanayipro_migrator");
        await tx.query(
          "INSERT INTO sanayipro.user_profiles(id, display_name, active) VALUES ($1, 'Süper Yönetici', true) ON CONFLICT DO NOTHING",
          [platformAdminUserId],
        );
        await tx.query(
          "INSERT INTO sanayipro.platform_admins(user_id, email, active) VALUES ($1, 'superadmin@sanayipro.com', true)",
          [platformAdminUserId],
        );
      });

      // 3. Verify platformAdminUserId has is_platform_admin() = true and can read platform_admins + organizations
      await asRuntimeActor(
        platformAdminUserId,
        orgAId,
        branchAId,
        "Platform Admin",
        "Super Admin",
        async (client) => {
          const isAdmin = await client.query<{ val: boolean }>(
            "SELECT sanayipro.is_platform_admin() AS val",
          );
          assert.equal(isAdmin.rows[0].val, true);

          const admins = await client.query<{ user_id: string }>(
            "SELECT user_id FROM sanayipro.platform_admins",
          );
          assert.equal(admins.rows.length, 1);
          assert.equal(admins.rows[0].user_id, platformAdminUserId);

          const allOrgs = await client.query<{ id: string }>(
            "SELECT id FROM sanayipro.organizations",
          );
          assert.ok(allOrgs.rows.length >= 2);
        },
      );

      // 4. Deactivate platformAdminUserId (active = false) -> immediately loses platform admin privileges
      await db.transaction(async (tx) => {
        await tx.exec("SET LOCAL ROLE sanayipro_migrator");
        await tx.query(
          "UPDATE sanayipro.platform_admins SET active = false WHERE user_id = $1",
          [platformAdminUserId],
        );
      });

      await asRuntimeActor(
        platformAdminUserId,
        orgAId,
        branchAId,
        "Platform Admin",
        "Super Admin",
        async (client) => {
          const isAdmin = await client.query<{ val: boolean }>(
            "SELECT sanayipro.is_platform_admin() AS val",
          );
          assert.equal(isAdmin.rows[0].val, false);
        },
      );
    });

    test("Step 19: Transaction Rollback & Concurrency Guard — mid-transaction error leaves zero partial writes", async () => {
      // Simulate a multi-step transaction that fails halfway through (e.g., DB error or constraint violation)
      await assert.rejects(
        asRuntimeActor(
          ownerAUserId,
          orgAId,
          branchAId,
          "Ahmet Yılmaz",
          "İşletme Sahibi",
          async (client, actor) => {
            await createCustomer(client, actor, {
              fullName: "Rollback Test Müşterisi",
              phone: "0544 123 45 67",
            });
            // Trigger a failure inside the same transaction (overpayment conflict)
            await recordPayment(client, actor, {
              workOrderId: workOrderAId,
              amount: 999999,
            });
          },
        ),
        (err: unknown) => err instanceof AccessError && err.code === "CONFLICT",
      );

      // Verify that 'Rollback Test Müşterisi' was completely rolled back
      await asRuntimeActor(
        ownerAUserId,
        orgAId,
        branchAId,
        "Ahmet Yılmaz",
        "İşletme Sahibi",
        async (client) => {
          const rolledBack = await client.query(
            "SELECT id FROM sanayipro.customers WHERE full_name = 'Rollback Test Müşterisi'",
          );
          assert.equal(rolledBack.rows.length, 0);
        },
      );
    });
  },
);
