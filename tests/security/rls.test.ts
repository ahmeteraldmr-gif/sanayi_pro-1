import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import {
  assertRuntimeCapabilities,
  RUNTIME_ROLE_CHECK_SQL,
  type RuntimeCapabilities,
} from "../../src/server/security";

const id = (value: number) =>
  `00000000-0000-0000-0000-${String(value).padStart(12, "0")}`;
let db: PGlite;
async function actor<T>(
  user: number | null,
  org: number | null,
  branch: number | null,
  work: (tx: Transaction) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE sanayipro_runtime");
    await tx.query(
      "SELECT set_config('request.jwt.claims',$1,true), set_config('app.organization_id',$2,true), set_config('app.branch_id',$3,true)",
      [
        JSON.stringify(user ? { sub: id(user), role: "authenticated" } : {}),
        org ? id(org) : "",
        branch ? id(branch) : "",
      ],
    );
    return work(tx);
  });
}
async function ids(tx: Transaction, table: string) {
  return (
    await tx.query<{ id: string }>(
      `SELECT id FROM sanayipro.${table} ORDER BY id`,
    )
  ).rows.map((row) => row.id);
}

describe(
  "Tenant isolation on actual embedded PostgreSQL (not mocked SQL)",
  { concurrency: false },
  () => {
    before(async () => {
      db = await PGlite.create();
      // Supabase owns auth.*. This tiny test-only substitute supplies FK subjects
      // and the same JWT sub lookup. It is never part of production migrations.
      await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')::uuid $$;
      CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;`);
      for (const user of [101, 102, 103, 104, 105])
        await db.query("INSERT INTO auth.users(id) VALUES ($1)", [id(user)]);
      await db.exec(await readFile("prisma/bootstrap.sql", "utf8"));
      await db.exec("SET ROLE sanayipro_migrator");
      await db.exec(
        await readFile(
          "prisma/migrations/202610220001_tenant_foundation/migration.sql",
          "utf8",
        ),
      );
      await db.exec(await readFile("tests/security/fixtures.sql", "utf8"));
      await db.exec("RESET ROLE");
    });
    after(async () => {
      await db?.close();
    });

    test("all eight domain tables enable AND force RLS", async () => {
      const result = await db.query<{
        relname: string;
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(
        "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace='sanayipro'::regnamespace AND relkind='r'",
      );
      assert.equal(result.rows.length, 8);
      assert.ok(
        result.rows.every(
          (row) => row.relrowsecurity && row.relforcerowsecurity,
        ),
      );
    });
    test("runtime is non-owner, non-superuser, NOINHERIT and NOBYPASSRLS", async () => {
      await actor(101, 1, 11, async (tx) => {
        const capabilities = await tx.query<RuntimeCapabilities>(
          RUNTIME_ROLE_CHECK_SQL,
        );
        assert.doesNotThrow(() =>
          assertRuntimeCapabilities(capabilities.rows[0]),
        );
        const { rows } = await tx.query<{
          rolname: string;
          rolsuper: boolean;
          rolbypassrls: boolean;
          rolinherit: boolean;
          rolcreaterole: boolean;
        }>(
          "SELECT rolname,rolsuper,rolbypassrls,rolinherit,rolcreaterole FROM pg_roles WHERE rolname=current_user",
        );
        assert.deepEqual(rows[0], {
          rolname: "sanayipro_runtime",
          rolsuper: false,
          rolbypassrls: false,
          rolinherit: false,
          rolcreaterole: false,
        });
        assert.equal(
          (
            await tx.query(
              "SELECT 1 FROM pg_class WHERE relnamespace='sanayipro'::regnamespace AND relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)",
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await tx.query<{ member: boolean }>(
              "SELECT pg_has_role(current_user,'sanayipro_migrator','MEMBER') AS member",
            )
          ).rows[0].member,
          false,
        );
      });
    });
    test("A reads only A and its selected branch, even with no WHERE filter", async () => {
      await actor(101, 1, 11, async (tx) => {
        assert.deepEqual(await ids(tx, "organizations"), [id(1)]);
        assert.deepEqual(await ids(tx, "branches"), [id(11)]);
        assert.deepEqual(await ids(tx, "roles"), [id(201), id(202)]);
      });
    });
    test("B cannot read A", async () => {
      await actor(102, 2, 21, async (tx) => {
        assert.deepEqual(await ids(tx, "organizations"), [id(2)]);
        assert.deepEqual(await ids(tx, "branches"), [id(21)]);
      });
    });
    test("forged B organization and branch selection from A fails closed", async () => {
      await actor(101, 2, 21, async (tx) => {
        for (const table of ["organizations", "branches", "roles"])
          assert.deepEqual(await ids(tx, table), []);
        assert.equal(
          (
            await tx.query<{ allowed: boolean }>(
              "SELECT sanayipro.has_permission('app.access') AS allowed",
            )
          ).rows[0].allowed,
          false,
        );
      });
    });
    test("a valid organization cannot be combined with another organization's branch", async () => {
      await actor(101, 1, 21, async (tx) => {
        assert.deepEqual(await ids(tx, "branches"), []);
        assert.equal(
          (
            await tx.query<{ allowed: boolean }>(
              "SELECT sanayipro.has_permission('app.access') AS allowed",
            )
          ).rows[0].allowed,
          false,
        );
      });
    });
    test("owner still needs explicit branch membership", async () => {
      await actor(101, 1, 13, async (tx) => {
        assert.deepEqual(await ids(tx, "branches"), []);
        assert.equal(
          (
            await tx.query<{ allowed: boolean }>(
              "SELECT sanayipro.has_permission('app.access') AS allowed",
            )
          ).rows[0].allowed,
          false,
        );
      });
    });
    test("bootstrap sees only own allowed branches, never A's unassigned branch or B", async () => {
      await actor(101, null, null, async (tx) => {
        assert.deepEqual(await ids(tx, "organizations"), [id(1)]);
        assert.deepEqual(await ids(tx, "branches"), [id(11), id(12)]);
      });
    });
    test("a dual member remains narrowed to the selected tenant", async () => {
      await actor(105, 1, 11, async (tx) => {
        assert.deepEqual(await ids(tx, "organizations"), [id(1)]);
        assert.deepEqual(await ids(tx, "branches"), [id(11)]);
      });
    });
    test("users never read each other's profiles or membership rows", async () => {
      await actor(101, 1, 11, async (tx) => {
        assert.deepEqual(await ids(tx, "user_profiles"), [id(101)]);
        for (const table of ["organization_memberships", "branch_memberships"])
          assert.ok(
            (
              await tx.query<{ user_id: string }>(
                `SELECT user_id FROM sanayipro.${table}`,
              )
            ).rows.every((row) => row.user_id === id(101)),
          );
      });
    });
    test("no authenticated identity or inactive profile means no tenant rows", async () => {
      for (const user of [null, 104])
        await actor(user, 1, 11, async (tx) => {
          for (const table of [
            "organizations",
            "branches",
            "roles",
            "user_profiles",
          ])
            assert.deepEqual(await ids(tx, table), []);
        });
    });
    test("permissions require a real role grant, not just membership", async () => {
      assert.equal(
        await actor(
          101,
          1,
          11,
          async (tx) =>
            (
              await tx.query<{ allowed: boolean }>(
                "SELECT sanayipro.has_permission('app.access') AS allowed",
              )
            ).rows[0].allowed,
        ),
        true,
      );
      assert.equal(
        await actor(
          103,
          1,
          11,
          async (tx) =>
            (
              await tx.query<{ allowed: boolean }>(
                "SELECT sanayipro.has_permission('app.access') AS allowed",
              )
            ).rows[0].allowed,
        ),
        false,
      );
    });
    test("disabled organization and branch both revoke access", async () => {
      for (const [table, target] of [
        ["organizations", 1],
        ["branches", 11],
      ] as const) {
        await db.exec("SET ROLE sanayipro_migrator");
        await db.query(
          `UPDATE sanayipro.${table} SET active=false WHERE id=$1`,
          [id(target)],
        );
        await db.exec("RESET ROLE");
        try {
          await actor(101, 1, 11, async (tx) => {
            assert.deepEqual(await ids(tx, "branches"), []);
            assert.equal(
              (
                await tx.query<{ allowed: boolean }>(
                  "SELECT sanayipro.has_permission('app.access') AS allowed",
                )
              ).rows[0].allowed,
              false,
            );
          });
        } finally {
          await db.exec("SET ROLE sanayipro_migrator");
          await db.query(
            `UPDATE sanayipro.${table} SET active=true WHERE id=$1`,
            [id(target)],
          );
          await db.exec("RESET ROLE");
        }
      }
    });
    test("disabled organization membership revokes branch access", async () => {
      await db.exec("SET ROLE sanayipro_migrator");
      await db.query(
        "UPDATE sanayipro.organization_memberships SET active=false WHERE organization_id=$1 AND user_id=$2",
        [id(1), id(101)],
      );
      await db.exec("RESET ROLE");
      try {
        await actor(101, 1, 11, async (tx) => {
          assert.deepEqual(await ids(tx, "organizations"), []);
          assert.deepEqual(await ids(tx, "branches"), []);
        });
      } finally {
        await db.exec("SET ROLE sanayipro_migrator");
        await db.query(
          "UPDATE sanayipro.organization_memberships SET active=true WHERE organization_id=$1 AND user_id=$2",
          [id(1), id(101)],
        );
        await db.exec("RESET ROLE");
      }
    });
    test("suspended branch membership is immediately rejected", async () => {
      await db.exec("SET ROLE sanayipro_migrator");
      await db.query(
        "UPDATE sanayipro.branch_memberships SET active=false WHERE user_id=$1 AND branch_id=$2",
        [id(101), id(11)],
      );
      await db.exec("RESET ROLE");
      try {
        await actor(101, 1, 11, async (tx) => {
          assert.deepEqual(await ids(tx, "branches"), []);
          assert.equal(
            (
              await tx.query<{ allowed: boolean }>(
                "SELECT sanayipro.has_permission('app.access') AS allowed",
              )
            ).rows[0].allowed,
            false,
          );
        });
      } finally {
        await db.exec("SET ROLE sanayipro_migrator");
        await db.query(
          "UPDATE sanayipro.branch_memberships SET active=true WHERE user_id=$1 AND branch_id=$2",
          [id(101), id(11)],
        );
        await db.exec("RESET ROLE");
      }
    });
    test("runtime cannot self-grant membership, change roles or delete organizations", async () => {
      for (const sql of [
        "UPDATE sanayipro.organization_memberships SET active=true",
        "INSERT INTO sanayipro.organizations(name) VALUES ('Attack')",
        "DELETE FROM sanayipro.organizations",
      ])
        await assert.rejects(
          actor(101, 1, 11, (tx) => tx.exec(sql)),
          /permission denied/,
        );
    });
    test("RLS still blocks writes if someone accidentally grants DML", async () => {
      await db.exec(
        "SET ROLE sanayipro_migrator; GRANT INSERT,UPDATE ON sanayipro.organizations TO sanayipro_runtime; RESET ROLE",
      );
      try {
        await actor(101, 1, 11, async (tx) => {
          const capabilities = await tx.query<RuntimeCapabilities>(
            RUNTIME_ROLE_CHECK_SQL,
          );
          assert.throws(() => assertRuntimeCapabilities(capabilities.rows[0]));
        });
        await assert.rejects(
          actor(101, 1, 11, (tx) =>
            tx.exec(
              "INSERT INTO sanayipro.organizations(name) VALUES ('Attack')",
            ),
          ),
          /row-level security/,
        );
        await actor(101, 1, 11, async (tx) => {
          assert.equal(
            (
              await tx.query(
                "UPDATE sanayipro.organizations SET name='Attack' RETURNING id",
              )
            ).rows.length,
            0,
          );
        });
      } finally {
        await db.exec(
          "SET ROLE sanayipro_migrator; REVOKE INSERT,UPDATE ON sanayipro.organizations FROM sanayipro_runtime; RESET ROLE",
        );
      }
    });
    test("database composite FKs reject cross-tenant branch/role assignment even by maintenance", async () => {
      await assert.rejects(
        db.transaction(async (tx) => {
          await tx.exec("SET LOCAL ROLE sanayipro_migrator");
          await tx.query(
            "INSERT INTO sanayipro.branch_memberships(branch_id,organization_id,user_id,role_id) VALUES ($1,$2,$3,$4)",
            [id(21), id(1), id(101), id(201)],
          );
        }),
        /foreign key/,
      );
      await assert.rejects(
        db.transaction(async (tx) => {
          await tx.exec("SET LOCAL ROLE sanayipro_migrator");
          await tx.query(
            "UPDATE sanayipro.organization_memberships SET role_id=$1 WHERE organization_id=$2 AND user_id=$3",
            [id(203), id(1), id(101)],
          );
        }),
        /foreign key/,
      );
    });
    test("transaction-local identity/tenant context cannot leak to the next request", async () => {
      await actor(101, 1, 11, (tx) => ids(tx, "branches"));
      await db.transaction(async (tx) => {
        await tx.exec("SET LOCAL ROLE sanayipro_runtime");
        assert.deepEqual(await ids(tx, "organizations"), []);
        assert.deepEqual(await ids(tx, "branches"), []);
      });
    });
    test("Data API roles cannot read the private schema", async () => {
      for (const role of ["anon", "authenticated", "service_role"])
        await assert.rejects(
          db.transaction(async (tx) => {
            await tx.exec(`SET LOCAL ROLE ${role}`);
            await tx.query("SELECT * FROM sanayipro.organizations");
          }),
          /permission denied/,
        );
    });
    test("no SECURITY DEFINER, destructive SQL or bypass role is introduced", async () => {
      const { rows } = await db.query<{ prosecdef: boolean }>(
        "SELECT prosecdef FROM pg_proc WHERE pronamespace='sanayipro'::regnamespace",
      );
      assert.ok(rows.every((row) => !row.prosecdef));
      const sql = (
        await readFile(
          "prisma/migrations/202610220001_tenant_foundation/migration.sql",
          "utf8",
        )
      ).replace(/--.*$/gm, "");
      assert.doesNotMatch(sql, /\b(DROP|TRUNCATE)\b/i);
    });
  },
);
