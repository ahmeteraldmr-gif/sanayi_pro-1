import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { migrationConnection } from "../../scripts/migration-connection";
import {
  AccessError,
  assertRuntimeCapabilities,
  backendConfigured,
  getPublicAuthConfig,
  getRuntimeDatabaseUrl,
  parseTenantSelection,
  type RuntimeCapabilities,
} from "../../src/server/security";
const organizationId = "00000000-0000-0000-0000-000000000001",
  branchId = "00000000-0000-0000-0000-000000000011";
test("migration driver translation preserves strict TLS and separate identity", () => {
  const raw = "postgresql://sanayipro_migrator:test@database.invalid/db?schema=sanayipro&sslmode=verify-full";
  assert.equal(migrationConnection(undefined, "prisma", {}), "");
  assert.equal(new URL(migrationConnection(raw, "pg", {})).searchParams.get("sslmode"), "verify-full");
  const native = new URL(migrationConnection(raw, "prisma", {}));
  assert.equal(native.searchParams.get("sslmode"), "require");
  assert.equal(native.searchParams.get("sslaccept"), "strict");
  for (const unsafe of [raw.replace("migrator", "runtime"), raw.replace("verify-full", "require"), `${raw}&sslaccept=accept_invalid_certs`, `${raw}&ssl=false`])
    assert.throws(() => migrationConnection(unsafe, "prisma", {}));
  assert.throws(() => migrationConnection(raw, "pg", { NODE_TLS_REJECT_UNAUTHORIZED: "0" }));
});
test("missing configuration never enables an auth bypass", () => {
  assert.equal(backendConfigured({}), false);
  assert.throws(() => getPublicAuthConfig({}), AccessError);
  assert.throws(() => getRuntimeDatabaseUrl({}), AccessError);
});
test("tenant cookie carries only IDs; injected identity and permissions are ignored", () => {
  assert.deepEqual(
    parseTenantSelection(
      JSON.stringify({
        organizationId,
        branchId,
        userId: "attacker",
        permissions: ["admin"],
        role: "owner",
      }),
    ),
    { organizationId, branchId },
  );
  for (const value of [
    undefined,
    "{}",
    "[]",
    "null",
    "bad",
    JSON.stringify({ organizationId: "';DROP TABLE x;--", branchId }),
    JSON.stringify({ organizationId, branchId: "bad" }),
    "x".repeat(257),
  ])
    assert.equal(parseTenantSelection(value), null);
});
test("secret and service-role Supabase keys are refused", () => {
  const base = { NEXT_PUBLIC_SUPABASE_URL: "https://project.invalid" };
  for (const key of [
    "sb_secret_test",
    `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`,
  ])
    assert.throws(
      () =>
        getPublicAuthConfig({
          ...base,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        }),
      AccessError,
    );
  assert.throws(
    () =>
      getPublicAuthConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://remote.invalid",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    AccessError,
  );
});
test("runtime rejects admin connections and insecure remote TLS", () => {
  for (const url of [
    "postgresql://postgres:test@localhost/db?schema=sanayipro",
    "postgresql://sanayipro_migrator:test@localhost/db?schema=sanayipro",
    "postgresql://sanayipro_runtime:test@remote.invalid/db?schema=sanayipro&sslmode=require",
    "postgresql://sanayipro_runtime:test@remote.invalid/db?schema=sanayipro&sslmode=verify-full&ssl=false",
    "postgresql://sanayipro_runtime:test@localhost/db?schema=public",
  ])
    assert.throws(
      () => getRuntimeDatabaseUrl({ DATABASE_URL: url }),
      AccessError,
    );
  const safe =
    "postgresql://sanayipro_runtime:test@remote.invalid/db?schema=sanayipro&sslmode=verify-full";
  assert.equal(getRuntimeDatabaseUrl({ DATABASE_URL: safe }), safe);
  assert.throws(
    () =>
      getRuntimeDatabaseUrl({
        DATABASE_URL: safe,
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
      }),
    AccessError,
  );
});
test("runtime role guard fails on any elevated or missing capability", () => {
  const safe: RuntimeCapabilities = {
    role_name: "sanayipro_runtime",
    superuser: false,
    bypass_rls: false,
    create_role: false,
    create_db: false,
    inherit_roles: false,
    replication: false,
    member_of_roles: false,
    owns_tables: false,
    create_schema_objects: false,
    can_mutate: false,
  };
  assert.doesNotThrow(() => assertRuntimeCapabilities(safe));
  assert.throws(() => assertRuntimeCapabilities(undefined), AccessError);
  assert.throws(
    () =>
      assertRuntimeCapabilities({
        role_name: "sanayipro_runtime",
      } as RuntimeCapabilities),
    AccessError,
  );
  for (const key of Object.keys(safe).filter((key) => key !== "role_name"))
    assert.throws(
      () => assertRuntimeCapabilities({ ...safe, [key]: true }),
      AccessError,
    );
});
test("protected layout and proxy both enforce authorization; no runtime migration secret or unsafe raw SQL", async () => {
  const layout = await readFile("src/app/app/layout.tsx", "utf8"),
    proxy = await readFile("src/proxy.ts", "utf8");
  assert.match(layout, /await getTenantContext\(/);
  assert.match(proxy, /authorizeVerifiedIdentity\(\s*data\.user\.id/);
  for (const file of [
    "database",
    "authorization",
    "auth",
    "supabase",
    "tenant",
    "onboarding",
    "post-auth",
    "local-auth",
  ]) {
    const source = await readFile(`src/server/${file}.ts`, "utf8");
    assert.match(source, /import "server-only"/);
    assert.doesNotMatch(
      source,
      /MIGRATION_DATABASE_URL|SERVICE_ROLE_KEY|auth\.admin|\$queryRawUnsafe|\$executeRawUnsafe|\.auth\.getSession\(/,
    );
  }
});

test("local fallback is isolated, hashed and disabled in production; provisioning never uses admin keys", async () => {
  const local = await readFile("src/server/local-auth.ts", "utf8");
  const proxy = await readFile("src/proxy.ts", "utf8");
  const actions = await readFile("src/app/auth/actions.ts", "utf8");
  const onboarding = await readFile("src/server/onboarding.ts", "utf8");
  assert.match(local, /scryptSync/);
  assert.doesNotMatch(local, /\bpassword:\s*(input\.)?password\b/);
  assert.match(proxy, /localAuthEnabled\(\)\s*&&/);
  assert.match(local, /if \(!localAuthEnabled\(\)\)/);
  // The server action module must not carry any cookie-auth logic of its own.
  assert.doesNotMatch(actions, /sanayipro-session|sanayipro-registered-users/);
  assert.match(onboarding, /getOnboardingDatabaseUrl/);
  assert.doesNotMatch(onboarding + actions, /getRuntimeDatabaseUrl|auth\.admin|service_role/i);
});