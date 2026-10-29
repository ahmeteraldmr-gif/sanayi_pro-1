import { config } from "dotenv";
import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import { Client } from "pg";
import { createServerClient } from "@supabase/ssr";
import { getPublicAuthConfig, getRuntimeDatabaseUrl, assertRuntimeCapabilities, RUNTIME_ROLE_CHECK_SQL, TENANT_COOKIE, AccessError, type RuntimeCapabilities } from "../src/server/security";
import { authorizeVerifiedIdentity, tenantChoicesForVerifiedIdentity } from "../src/server/authorization";
import { withVerifiedIdentity } from "../src/server/database";
import { migrationConnection } from "./migration-connection";
import { liveFixture, provisionLiveFixtures, type LiveFixture } from "./live-fixtures";

config({ path: ".env.local", quiet: true });
let stage = "configuration";
let checks = 0;
function passed(name: string) { checks++; console.log(`PASS ${name}`); }

async function main() {
  const { values } = parseArgs({ options: { provision: { type: "boolean" }, "http-base": { type: "string" } }, strict: true });
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "DATABASE_URL", ...(values.provision ? ["MIGRATION_DATABASE_URL"] : []), "SUPABASE_TEST_USER_A_EMAIL", "SUPABASE_TEST_USER_A_PASSWORD", "SUPABASE_TEST_USER_B_EMAIL", "SUPABASE_TEST_USER_B_PASSWORD"];
  const missing = required.filter(name => !process.env[name]?.trim());
  if (missing.length) {
    console.error(`Missing local environment variables: ${missing.join(", ")}`);
    throw new Error("Local configuration incomplete");
  }
  const { url, key } = getPublicAuthConfig();
  getRuntimeDatabaseUrl();
  const credentials = (["A", "B"] as const).map(label => {
    const email = process.env[`SUPABASE_TEST_USER_${label}_EMAIL`];
    const password = process.env[`SUPABASE_TEST_USER_${label}_PASSWORD`];
    if (!email || !password) throw new Error("Missing local test-account variables");
    return { label, email, password };
  });
  assert.notEqual(credentials[0].email.toLowerCase(), credentials[1].email.toLowerCase());
  const httpBase = values["http-base"] ? new URL(values["http-base"]) : null;
  // Never transmit session cookies to an arbitrary test URL or follow redirects.
  if (httpBase) assert.ok(httpBase.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(httpBase.hostname) && httpBase.pathname === "/" && !httpBase.username && !httpBase.password && !httpBase.search && !httpBase.hash, "HTTP tests require a local server origin");
  const clients: ReturnType<typeof createServerClient>[] = [];
  const actors: { fixture: LiveFixture; cookie: () => string }[] = [];
  try {
    for (const c of credentials) {
      stage = `Supabase Auth ${c.label}`;
      const jar = new Map<string, string>();
      const client = createServerClient(url, key, {
        global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
        cookies: {
          getAll: () => [...jar].map(([name, value]) => ({ name, value })),
          setAll: entries => { for (const entry of entries) jar.set(entry.name, entry.value); },
        },
      });
      clients.push(client);
      const login = await client.auth.signInWithPassword({ email: c.email, password: c.password });
      assert.ok(!login.error && login.data.session && login.data.user && !login.data.user.is_anonymous, "Auth login failed");
      const verified = await client.auth.getUser();
      assert.ok(!verified.error && verified.data.user?.email_confirmed_at, "Verified and confirmed Auth identity required");
      assert.equal(verified.data.user.id, login.data.user.id);
      actors.push({ fixture: liveFixture(verified.data.user.id, c.label), cookie: () => [...jar].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; ") });
      passed(stage);
    }
    assert.notEqual(actors[0].fixture.userId, actors[1].fixture.userId);

    if (values.provision) {
      stage = "dedicated demo tenant provisioning";
      const connectionString = migrationConnection(process.env.MIGRATION_DATABASE_URL, "pg");
      assert.ok(connectionString, "Missing migration connection");
      const admin = new Client({ connectionString, connectionTimeoutMillis: 5000, query_timeout: 15000, application_name: "sanayipro-provision" });
      try {
        await admin.connect();
        assert.equal((await admin.query("SELECT current_user AS role")).rows[0].role, "sanayipro_migrator");
        await provisionLiveFixtures(admin, actors.map(a => a.fixture));
        passed(stage);
      } finally { await admin.end(); }
    }
    stage = "Prisma connection and runtime role";
    await withVerifiedIdentity(actors[0].fixture.userId, async tx => {
      const capabilities = await tx.$queryRaw<RuntimeCapabilities[]>( (await import("../src/generated/prisma/client")).Prisma.raw(RUNTIME_ROLE_CHECK_SQL));
      assertRuntimeCapabilities(capabilities[0]);
      const tables = await tx.$queryRaw<{relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean}[]>`SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace='sanayipro'::regnamespace AND relname IN ('organizations','branches','user_profiles','organization_memberships','branch_memberships','roles','permissions','role_permissions') AND relkind='r'`;
      assert.equal(tables.length, 8);
      assert.ok(tables.every(t => t.relrowsecurity && t.relforcerowsecurity));
    });
    passed(stage);
    for (const [index, actor] of actors.entries()) {
      const own = actor.fixture, other = actors[1 - index].fixture;
      stage = `tenant ${own.label}: raw reads and permission`;
      const choices = await tenantChoicesForVerifiedIdentity(own.userId);
      assert.ok(choices.some(c => c.organizationId === own.organizationId && c.branchId === own.branchId));
      assert.ok(!choices.some(c => c.organizationId === other.organizationId));
      await authorizeVerifiedIdentity(own.userId, own, "tenant.read", async (tx, tenant) => {
        assert.equal(tenant.organizationId, own.organizationId);
        // Deliberately no tenant WHERE clause: the DB must isolate these reads.
        assert.deepEqual((await tx.$queryRaw<{id: string}[]>`SELECT id FROM sanayipro.organizations`).map(r => r.id), [own.organizationId]);
        assert.deepEqual((await tx.$queryRaw<{id: string}[]>`SELECT id FROM sanayipro.branches`).map(r => r.id), [own.branchId]);
        assert.deepEqual((await tx.$queryRaw<{id: string}[]>`SELECT id FROM sanayipro.user_profiles`).map(r => r.id), [own.userId]);
        for (const rows of [await tx.organizationMembership.findMany(), await tx.branchMembership.findMany(), await tx.role.findMany(), await tx.rolePermission.findMany()]) {
          assert.ok(rows.length > 0 && rows.every(r => r.organizationId === own.organizationId));
        }
      });
      passed(stage);
      stage = `tenant ${own.label}: forged tenant / mixed branch / unassigned branch`;
      for (const selection of [other, { organizationId: own.organizationId, branchId: other.branchId }, { organizationId: own.organizationId, branchId: own.unassignedBranchId }]) {
        await assert.rejects(authorizeVerifiedIdentity(own.userId, selection, "app.access", async () => { throw new Error("Unauthorized callback reached"); }), (e: unknown) => e instanceof AccessError && e.code === "FORBIDDEN");
        await withVerifiedIdentity(own.userId, async tx => {
          await tx.$queryRaw`SELECT set_config('app.organization_id',${selection.organizationId},true),set_config('app.branch_id',${selection.branchId},true)`;
          assert.equal((await tx.$queryRaw<unknown[]>`SELECT id FROM sanayipro.branches`).length, 0);
          assert.deepEqual(await tx.$queryRaw`SELECT sanayipro.has_permission('app.access') AS allowed`, [{ allowed: false }]);
        });
      }
      passed(stage);
    }
    stage = "runtime pooled context cleanup";
    const runtime = new Client({ connectionString: getRuntimeDatabaseUrl(), connectionTimeoutMillis: 5000, query_timeout: 10000 });
    try {
      await runtime.connect();
      for (const { fixture: own } of actors) {
        stage = `tenant ${own.label}: runtime write denied`;
        await runtime.query("BEGIN");
        try {
          await runtime.query("SELECT set_config('request.jwt.claims',$1,true),set_config('app.organization_id',$2,true),set_config('app.branch_id',$3,true)", [JSON.stringify({ sub: own.userId }), own.organizationId, own.branchId]);
          await assert.rejects(runtime.query("UPDATE sanayipro.organizations SET name=name WHERE id=$1", [own.organizationId]), (e: unknown) => typeof e === "object" && e !== null && "code" in e && e.code === "42501");
        } finally { await runtime.query("ROLLBACK"); }
        passed(stage);
      }
      stage = "runtime pooled context cleanup";
      await runtime.query("BEGIN");
      await runtime.query("SELECT set_config('request.jwt.claims',$1,true),set_config('app.organization_id',$2,true),set_config('app.branch_id',$3,true)", [JSON.stringify({ sub: actors[0].fixture.userId }), actors[0].fixture.organizationId, actors[0].fixture.branchId]);
      await runtime.query("COMMIT");
      assert.equal((await runtime.query("SELECT id FROM sanayipro.organizations")).rowCount, 0);
      assert.equal((await runtime.query("SELECT id FROM sanayipro.branches")).rowCount, 0);
      passed(stage);
    } finally { await runtime.end(); }

    if (httpBase) {
      const request = async (path: string, cookie = "", extra: Record<string, string> = {}) => {
        const r = await fetch(new URL(path, httpBase), { redirect: "manual", signal: AbortSignal.timeout(20000), headers: { cookie, ...extra } });
        assert.match(r.headers.get("cache-control") ?? "", /no-store/);
        return r;
      };
      stage = "anonymous app/API guard";
      for (const path of ["/app", "/app/customers", "/app/vehicles", "/app/intake", "/app/work-orders"]) {
        const r = await request(path, "", { "x-user-id": actors[0].fixture.userId, "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy" });
        assert.equal(r.status, 307);
        assert.equal(new URL(r.headers.get("location")!, httpBase).pathname, "/login");
      }
      assert.equal((await request("/api/tenant/context")).status, 401);
      passed(stage);
      for (const [index, actor] of actors.entries()) {
        const own = actor.fixture, other = actors[1 - index].fixture;
        const selected = (f: LiveFixture) => `${actor.cookie()}; ${TENANT_COOKIE}=${encodeURIComponent(JSON.stringify({ organizationId: f.organizationId, branchId: f.branchId }))}`;
        stage = `HTTP tenant ${own.label}: app, context and forgery`;
        const withoutTenant = await request("/app", actor.cookie());
        assert.equal(withoutTenant.status, 307);
        assert.equal(new URL(withoutTenant.headers.get("location")!, httpBase).pathname, "/auth/tenant");
        assert.equal((await request("/auth/tenant", actor.cookie())).status, 200);
        assert.equal((await request("/app", selected(own))).status, 200);
        const context = await request("/api/tenant/context", selected(own));
        assert.equal(context.status, 200);
        const body = await context.json();
        assert.equal(body.tenant.organizationId, own.organizationId);
        assert.equal(body.tenant.userId, own.userId);
        assert.equal((await request("/api/tenant/context", selected(other))).status, 403);
        const forged = await request("/app", selected(other), { RSC: "1" });
        assert.equal(forged.status, 307);
        assert.equal(new URL(forged.headers.get("location")!, httpBase).pathname, "/auth/tenant");
        passed(stage);
      }
    }
    console.log(`${checks} live checks passed.${httpBase ? "" : " HTTP checks not run; provide --http-base for the local production server."}`);
  } finally {
    for (const client of clients) await client.auth.signOut({ scope: "local" }).catch(() => {});
  }
}
main().catch(() => {
  // Provider/Prisma error objects can contain credentials, URLs or session data.
  console.error(`FAIL ${stage}. Details withheld to protect local secrets; no success is claimed.`);
  process.exitCode = 1;
});
