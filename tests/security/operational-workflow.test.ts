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
  assignTechnicianToWorkOrder,
  createAppointment,
  createCustomer,
  createInventoryItem,
  createStaffMember,
  createVehicle,
  createWorkOrder,
  moveAppointment,
  recordFaultCodeSearch,
  recordPayment,
  updateWorkOrderStatus,
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
  },
);
