import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import {
  normalizeOnboardingInput,
  provisionOwner,
  type SqlClient,
} from "../../src/server/onboarding-core";
import {
  getOnboardingDatabaseUrl,
  localAuthEnabled,
  onboardingConfigured,
  AccessError,
} from "../../src/server/security";

const id = (value: number) =>
  `00000000-0000-0000-0000-${String(value).padStart(12, "0")}`;
let db: PGlite;

const input = (user: number, org = "Yılmaz Oto Servis", branch = "Merkez Şube") => ({
  userId: id(user),
  displayName: `Kullanıcı ${user}`,
  organizationName: org,
  branchName: branch,
});
// Production code talks to PostgreSQL through the onboarding login only.
async function asOnboarding<T>(work: () => Promise<T>) {
  await db.exec("SET ROLE sanayipro_onboarding");
  try {
    return await work();
  } finally {
    await db.exec("RESET ROLE");
  }
}
async function runtime<T>(
  user: number,
  org: number | string | null,
  branch: number | string | null,
  work: (tx: Transaction) => Promise<T>,
) {
  const text = (value: number | string | null) =>
    value === null ? "" : typeof value === "string" ? value : id(value);
  return db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE sanayipro_runtime");
    await tx.query(
      "SELECT set_config('request.jwt.claims',$1,true), set_config('app.organization_id',$2,true), set_config('app.branch_id',$3,true)",
      [JSON.stringify({ sub: id(user), role: "authenticated" }), text(org), text(branch)],
    );
    return work(tx);
  });
}
async function asRaw<T>(user: number, onboardingOrg: string, work: (tx: Transaction) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE sanayipro_onboarding");
    await tx.query(
      "SELECT set_config('request.jwt.claims',$1,true), set_config('app.onboarding_organization_id',$2,true)",
      [JSON.stringify({ sub: id(user), role: "authenticated" }), onboardingOrg],
    );
    return work(tx);
  });
}
async function count(table: string, where: string, params: unknown[] = []) {
  // Maintenance identity is used here only to inspect the result of the tests.
  await db.exec("SET ROLE sanayipro_migrator");
  try {
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM sanayipro.${table} WHERE ${where}`,
      params,
    );
    return rows[0].n;
  } finally {
    await db.exec("RESET ROLE");
  }
}

describe("Sign-up provisioning on actual embedded PostgreSQL", { concurrency: false }, () => {
  before(async () => {
    db = await PGlite.create();
    await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')::uuid $$;
      CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;`);
    for (const user of [101, 102, 103, 104, 105, 201, 202, 203, 204, 205, 206, 207, 208, 209])
      await db.query("INSERT INTO auth.users(id) VALUES ($1)", [id(user)]);
    await db.exec(await readFile("prisma/bootstrap.sql", "utf8"));
    await db.exec("SET ROLE sanayipro_migrator");
    for (const file of [
      "202610220001_tenant_foundation",
      "202610260001_onboarding_provisioning",
    ])
      await db.exec(await readFile(`prisma/migrations/${file}/migration.sql`, "utf8"));
    await db.exec(await readFile("tests/security/fixtures.sql", "utf8"));
    await db.exec("RESET ROLE");
  });
  after(async () => {
    await db?.close();
  });

  test("onboarding login is least-privilege: no bypass, no update/delete, no ownership", async () => {
    await asOnboarding(async () => {
      const { rows } = await db.query<Record<string, unknown>>(
        `SELECT rolsuper,rolbypassrls,rolinherit,rolcreaterole,rolcreatedb,rolreplication FROM pg_roles WHERE rolname=current_user`,
      );
      assert.ok(Object.values(rows[0]).every((value) => value === false));
    });
    const grants = await db.query<{ privilege_type: string }>(
      `SELECT DISTINCT privilege_type FROM information_schema.role_table_grants WHERE grantee='sanayipro_onboarding' AND table_schema='sanayipro'`,
    );
    assert.deepEqual(grants.rows.map((r) => r.privilege_type).sort(), ["INSERT", "SELECT"]);
  });

  test("new sign-up creates profile, organization, branch, owner role and both memberships", async () => {
    const result = await asOnboarding(() => provisionOwner(db as SqlClient, input(201)));
    assert.equal(result.created, true);
    assert.equal(await count("user_profiles", "id=$1", [id(201)]), 1);
    assert.equal(await count("organizations", "id=$1", [result.organizationId]), 1);
    assert.equal(await count("branches", "organization_id=$1", [result.organizationId]), 1);
    assert.equal(await count("roles", "organization_id=$1 AND code='owner'", [result.organizationId]), 1);
    assert.equal(await count("role_permissions", "organization_id=$1", [result.organizationId]), 2);
    assert.equal(await count("organization_memberships", "user_id=$1", [id(201)]), 1);
    assert.equal(await count("branch_memberships", "user_id=$1", [id(201)]), 1);

    // The runtime login (RLS, read-only) immediately authorises the new owner.
    await runtime(201, result.organizationId, result.branchId, async (tx) => {
      const permissions = await tx.query<{ code: string }>(
        "SELECT code FROM sanayipro.permissions WHERE sanayipro.has_permission(code) ORDER BY code",
      );
      assert.deepEqual(permissions.rows.map((r) => r.code), ["app.access", "tenant.read"]);
      const orgs = await tx.query<{ id: string }>("SELECT id FROM sanayipro.organizations");
      assert.deepEqual(orgs.rows.map((r) => r.id), [result.organizationId]);
    });
  });

  test("tenant isolation: new owner cannot reach another organization and vice versa", async () => {
    await db.exec("SET ROLE sanayipro_migrator");
    const own = (
      await db.query<{ o: string; b: string }>(
        "SELECT organization_id AS o, branch_id AS b FROM sanayipro.branch_memberships WHERE user_id=$1",
        [id(201)],
      )
    ).rows[0];
    await db.exec("RESET ROLE");
    // Forged selection of organization A (fixtures org 1 / branch 11) by user 201.
    await runtime(201, 1, 11, async (tx) => {
      assert.equal((await tx.query("SELECT 1 FROM sanayipro.organizations")).rows.length, 0);
      assert.equal(
        (await tx.query("SELECT code FROM sanayipro.permissions WHERE sanayipro.has_permission(code)")).rows.length,
        0,
      );
    });
    // Fixture owner of A cannot see the freshly provisioned tenant.
    await runtime(101, own.o, own.b, async (tx) => {
      assert.equal((await tx.query("SELECT 1 FROM sanayipro.organizations WHERE id=$1", [own.o])).rows.length, 0);
      assert.equal((await tx.query("SELECT 1 FROM sanayipro.branches WHERE id=$1", [own.b])).rows.length, 0);
    });
  });

  test("provisioning is idempotent: a repeated call creates nothing", async () => {
    const before = await count("organizations", "true");
    const result = await asOnboarding(() => provisionOwner(db as SqlClient, input(201, "Başka Oto", "Şube")));
    assert.equal(result.created, false);
    assert.equal(await count("organizations", "true"), before);
    assert.equal(await count("organization_memberships", "user_id=$1", [id(201)]), 1);
  });

  test("a failure in ANY step rolls the whole onboarding back (no half-created tenant)", async () => {
    const steps = [
      "INSERT INTO sanayipro.user_profiles",
      "INSERT INTO sanayipro.organizations",
      "INSERT INTO sanayipro.branches",
      "INSERT INTO sanayipro.roles",
      "INSERT INTO sanayipro.role_permissions",
      "INSERT INTO sanayipro.organization_memberships",
      "INSERT INTO sanayipro.branch_memberships",
    ];
    const users = [203, 204, 205, 206, 207, 208, 209];
    const orgsBefore = await count("organizations", "true");
    for (const [index, step] of steps.entries()) {
      const failing: SqlClient = {
        query: async (text, values) => {
          if (text.startsWith(step)) throw new Error("simulated outage");
          return db.query(text, values as never[]);
        },
      };
      const user = users[index];
      const profiles = await count("user_profiles", "true");
      const memberships = await count("organization_memberships", "true");
      await asOnboarding(async () => {
        await assert.rejects(
          provisionOwner(failing, input(user, `Hatalı ${index}`, "Şube")),
          (error: unknown) => error instanceof AccessError && error.code === "UNAVAILABLE",
        );
      });
      assert.equal(await count("organizations", "true"), orgsBefore, step);
      assert.equal(await count("branches", "name=$1", ["Şube"]), 0, step);
      assert.equal(await count("user_profiles", "true"), profiles, step);
      assert.equal(await count("organization_memberships", "true"), memberships, step);
    }
    // The connection is clean again: a real retry for one of those users succeeds.
    const retry = await asOnboarding(() => provisionOwner(db as SqlClient, input(202)));
    assert.equal(retry.created, true);
  });

  test("an Auth user that does not exist cannot be provisioned (FK) and leaves nothing", async () => {
    const orgsBefore = await count("organizations", "true");
    await asOnboarding(async () => {
      await assert.rejects(provisionOwner(db as SqlClient, input(999)));
    });
    assert.equal(await count("organizations", "true"), orgsBefore);
  });

  test("the onboarding login cannot attach itself to an EXISTING organization", async () => {
    const attacks: [string, unknown[]][] = [
      ["INSERT INTO sanayipro.branches(organization_id,name) VALUES ($1,'Kaçak Şube')", [id(1)]],
      ["INSERT INTO sanayipro.roles(organization_id,code,name) VALUES ($1,'owner','x')", [id(1)]],
      [
        "INSERT INTO sanayipro.organization_memberships(organization_id,user_id,role_id) SELECT $1,$2,id FROM (SELECT id FROM sanayipro.roles LIMIT 1) r",
        [id(1), id(203)],
      ],
    ];
    for (const [sql, params] of attacks)
      await assert.rejects(
        asRaw(203, id(1), (tx) => tx.query(sql, params as never[])),
        /row-level security|permission denied|violates/,
        sql,
      );
  });

  test("the onboarding login cannot impersonate another user or escalate role/permissions", async () => {
    const org = id(900);
    const cases: [string, string, unknown[]][] = [
      ["profile for someone else", "INSERT INTO sanayipro.user_profiles(id,display_name) VALUES ($1,'x')", [id(204)]],
      ["role other than owner", "INSERT INTO sanayipro.roles(organization_id,code,name) VALUES ($1,'admin','x')", [org]],
    ];
    for (const [name, sql, params] of cases)
      await assert.rejects(
        asRaw(203, org, async (tx) => {
          await tx.query("INSERT INTO sanayipro.organizations(id,name) VALUES ($1,'Tx Org')", [org]);
          return tx.query(sql, params as never[]);
        }),
        /row-level security/,
        name,
      );
    // Membership for another user inside a brand-new tenant is refused as well.
    await assert.rejects(
      asRaw(203, org, async (tx) => {
        await tx.query("INSERT INTO sanayipro.organizations(id,name) VALUES ($1,'Tx Org')", [org]);
        await tx.query("INSERT INTO sanayipro.roles(id,organization_id,code,name) VALUES ($1,$2,'owner','x')", [id(901), org]);
        await tx.query("INSERT INTO sanayipro.user_profiles(id,display_name) VALUES ($1,'x')", [id(203)]);
        await tx.query("INSERT INTO sanayipro.organization_memberships(organization_id,user_id,role_id) VALUES ($1,$2,$3)", [org, id(101), id(901)]);
      }),
      /row-level security/,
    );
    assert.equal(await count("organizations", "id=$1", [org]), 0);
  });

  test("a user who already belongs to a tenant cannot create another organization", async () => {
    await assert.rejects(
      asRaw(101, id(902), (tx) => tx.query("INSERT INTO sanayipro.organizations(id,name) VALUES ($1,'İkinci')", [id(902)])),
      /row-level security/,
    );
  });

  test("onboarding login cannot read, update or delete tenant data", async () => {
    for (const sql of [
      "SELECT * FROM sanayipro.branches",
      "SELECT * FROM sanayipro.roles",
      "SELECT * FROM sanayipro.user_profiles",
      "UPDATE sanayipro.organizations SET name='x'",
      "DELETE FROM sanayipro.organizations",
      "TRUNCATE sanayipro.organizations",
    ])
      await assert.rejects(asRaw(201, "", (tx) => tx.query(sql)), /permission denied/, sql);
    // Visible organizations are limited to those written by the current transaction.
    await asRaw(201, "", async (tx) => {
      assert.equal((await tx.query("SELECT 1 FROM sanayipro.organizations")).rows.length, 0);
      assert.equal((await tx.query("SELECT 1 FROM sanayipro.organization_memberships WHERE user_id<>auth.uid()")).rows.length, 0);
    });
  });

  test("runtime login stays read-only and the schema still has no SECURITY DEFINER", async () => {
    await assert.rejects(
      runtime(201, null, null, (tx) => tx.query("INSERT INTO sanayipro.organizations(name) VALUES ('x')")),
      /permission denied/,
    );
    const { rows } = await db.query<{ prosecdef: boolean }>(
      "SELECT prosecdef FROM pg_proc WHERE pronamespace='sanayipro'::regnamespace",
    );
    assert.ok(rows.every((row) => !row.prosecdef));
    const sql = (await readFile("prisma/migrations/202610260001_onboarding_provisioning/migration.sql", "utf8")).replace(/--.*$/gm, "");
    assert.doesNotMatch(sql, /\b(DROP|TRUNCATE|SECURITY DEFINER|BYPASSRLS)\b/i);
  });
});

describe("onboarding configuration", () => {
  test("input is normalised and unsafe values are refused", () => {
    assert.deepEqual(
      normalizeOnboardingInput({ userId: id(1), displayName: "  Ahmet   Yılmaz ", organizationName: "Yılmaz Oto Servis", branchName: "Merkez Şube" }),
      { userId: id(1), displayName: "Ahmet Yılmaz", organizationName: "Yılmaz Oto Servis", branchName: "Merkez Şube" },
    );
    for (const bad of [
      { userId: "x", displayName: "a", organizationName: "b", branchName: "c" },
      { userId: id(1), displayName: "", organizationName: "b", branchName: "c" },
      { userId: id(1), displayName: "a", organizationName: " ", branchName: "c" },
      { userId: id(1), displayName: "a", organizationName: "b", branchName: 3 },
    ])
      assert.equal(normalizeOnboardingInput(bad), null);
  });
  test("onboarding URL must use the dedicated login with verified TLS", () => {
    const safe = "postgresql://sanayipro_onboarding:test@remote.invalid/db?schema=sanayipro&sslmode=verify-full";
    assert.equal(getOnboardingDatabaseUrl({ ONBOARDING_DATABASE_URL: safe }), safe);
    for (const url of [
      safe.replace("onboarding", "runtime"),
      safe.replace("onboarding", "migrator"),
      safe.replace("postgresql://sanayipro_onboarding", "postgresql://postgres"),
      safe.replace("verify-full", "require"),
      safe.replace("schema=sanayipro", "schema=public"),
      `${safe}&ssl=false`,
    ])
      assert.throws(() => getOnboardingDatabaseUrl({ ONBOARDING_DATABASE_URL: url }), AccessError);
    assert.equal(onboardingConfigured({}), false);
    assert.throws(() => getOnboardingDatabaseUrl({ ONBOARDING_DATABASE_URL: safe, NODE_TLS_REJECT_UNAUTHORIZED: "0" }));
  });
  test("cookie fallback is development-only", () => {
    assert.equal(localAuthEnabled({ NODE_ENV: "production" }), false);
    assert.equal(localAuthEnabled({ NODE_ENV: "production", SANAYIPRO_LOCAL_PREVIEW: "true" }), false);
    assert.equal(localAuthEnabled({ NODE_ENV: "production", SANAYIPRO_LOCAL_PREVIEW: "1" }), true);
    assert.equal(localAuthEnabled({ NODE_ENV: "development" }), true);
  });
});
