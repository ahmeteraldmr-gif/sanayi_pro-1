export class AccessError extends Error {
  constructor(
    public readonly code:
      | "CONFIGURATION"
      | "UNAUTHENTICATED"
      | "TENANT_REQUIRED"
      | "FORBIDDEN"
      | "RATE_LIMITED"
      | "VALIDATION"
      | "CONFLICT"
      | "NOT_FOUND"
      | "UNAVAILABLE",
    public readonly status: number,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "AccessError";
  }
}
export const TENANT_COOKIE = "sanayipro-tenant";
export const permissionCodes = ["app.access", "tenant.read"] as const;
export const operationalPermissionCodes = [
  "customers.read",
  "customers.write",
  "vehicles.read",
  "vehicles.write",
  "work_orders.read",
  "work_orders.write",
  "work_orders.assign",
  "appointments.read",
  "appointments.write",
  "inventory.read",
  "inventory.write",
  "suppliers.read",
  "suppliers.write",
  "quotes.read",
  "quotes.write",
  "finance.read",
  "finance.write",
  "faults.read",
  "faults.write",
  "team.read",
  "team.write",
  "platform.super_admin",
] as const;
export type PermissionCode =
  | (typeof permissionCodes)[number]
  | (typeof operationalPermissionCodes)[number];
export type TenantSelection = Readonly<{
  organizationId: string;
  branchId: string;
}>;
export type TenantContext = TenantSelection &
  Readonly<{
    userId: string;
    organizationName: string;
    branchName: string;
    roleCode?: string;
    roleName?: string;
    permissions: readonly string[];
  }>;
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function parseTenantSelection(
  value: string | undefined,
): TenantSelection | null {
  if (!value || value.length > 256) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || !parsed) return null;
    const candidate = parsed as Record<string, unknown>;
    return isUuid(candidate.organizationId) && isUuid(candidate.branchId)
      ? {
          organizationId: candidate.organizationId,
          branchId: candidate.branchId,
        }
      : null;
  } catch {
    return null;
  }
}
type Environment = Readonly<Record<string, string | undefined>>;
export function getPublicAuthConfig(env: Environment = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new AccessError("CONFIGURATION", 503);
  try {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:"))
      throw new Error();
    if (
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    )
      throw new Error();
    if (!key.startsWith("sb_publishable_")) {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8"),
      );
      if (payload.role !== "anon") throw new Error();
    }
    return { url: parsed.origin, key };
  } catch {
    throw new AccessError("CONFIGURATION", 503);
  }
}
export function getRuntimeDatabaseUrl(env: Environment = process.env) {
  try {
    const value = env.DATABASE_URL;
    if (!value || env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error();
    const url = new URL(value);
    const user = decodeURIComponent(url.username);
    if (
      !["postgresql:", "postgres:"].includes(url.protocol) ||
      !url.password ||
      !/^sanayipro_runtime(?:\.[a-z0-9-]+)?$/.test(user)
    )
      throw new Error();
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (!local && url.searchParams.get("sslmode") !== "verify-full")
      throw new Error();
    if (url.searchParams.get("schema") !== "sanayipro") throw new Error();
    // pg must never be given URL options that turn certificate verification off.
    if (
      url.searchParams.has("ssl") ||
      url.searchParams.has("uselibpqcompat") ||
      url.searchParams.has("options")
    )
      throw new Error();
    return value;
  } catch {
    throw new AccessError("CONFIGURATION", 503);
  }
}
export function backendConfigured(env: Environment = process.env) {
  try {
    getPublicAuthConfig(env);
    getRuntimeDatabaseUrl(env);
    return true;
  } catch {
    return false;
  }
}

export const RUNTIME_ROLE_CHECK_SQL = `SELECT current_user::text AS role_name,
 r.rolsuper AS superuser, r.rolbypassrls AS bypass_rls,
 r.rolcreaterole AS create_role, r.rolcreatedb AS create_db,
 r.rolinherit AS inherit_roles, r.rolreplication AS replication,
 EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS member_of_roles,
 EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='sanayipro'::regnamespace AND c.relowner=r.oid) AS owns_tables,
 has_schema_privilege(current_user,'sanayipro','CREATE') AS create_schema_objects,
 (
   EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='sanayipro'::regnamespace AND c.relkind='r' AND has_table_privilege(current_user,c.oid,'TRUNCATE,REFERENCES,TRIGGER'))
   OR EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='sanayipro'::regnamespace AND c.relkind='r' AND c.relname IN ('organizations','branches','user_profiles','organization_memberships','branch_memberships','roles','permissions','role_permissions','platform_admins') AND has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE'))
 ) AS can_mutate
 FROM pg_roles r WHERE r.rolname=current_user`;
export type RuntimeCapabilities = {
  role_name: string;
  superuser: boolean;
  bypass_rls: boolean;
  create_role: boolean;
  create_db: boolean;
  inherit_roles: boolean;
  replication: boolean;
  member_of_roles: boolean;
  owns_tables: boolean;
  create_schema_objects: boolean;
  can_mutate: boolean;
};
export function assertRuntimeCapabilities(
  row: RuntimeCapabilities | undefined,
) {
  const flags = [
    "superuser",
    "bypass_rls",
    "create_role",
    "create_db",
    "inherit_roles",
    "replication",
    "member_of_roles",
    "owns_tables",
    "create_schema_objects",
    "can_mutate",
  ] as const;
  if (
    !row ||
    row.role_name !== "sanayipro_runtime" ||
    flags.some((name) => row[name] !== false)
  )
    throw new AccessError("CONFIGURATION", 503);
}

// Separate least-privilege identity used ONLY by the sign-up provisioning flow.
// It can create one new tenant for the verified caller and can never update,
// delete, bypass RLS, or read other tenants (see 202610260001 migration).
export function getOnboardingDatabaseUrl(env: Environment = process.env) {
  try {
    const value = env.ONBOARDING_DATABASE_URL;
    if (!value || env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error();
    const url = new URL(value);
    const user = decodeURIComponent(url.username);
    if (
      !["postgresql:", "postgres:"].includes(url.protocol) ||
      !url.password ||
      !/^sanayipro_onboarding(?:\.[a-z0-9-]+)?$/.test(user)
    )
      throw new Error();
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (!local && url.searchParams.get("sslmode") !== "verify-full")
      throw new Error();
    if (url.searchParams.get("schema") !== "sanayipro") throw new Error();
    if (
      url.searchParams.has("ssl") ||
      url.searchParams.has("uselibpqcompat") ||
      url.searchParams.has("options")
    )
      throw new Error();
    return value;
  } catch {
    throw new AccessError("CONFIGURATION", 503);
  }
}
export function onboardingConfigured(env: Environment = process.env) {
  try {
    getOnboardingDatabaseUrl(env);
    return true;
  } catch {
    return false;
  }
}
// The cookie-based fallback exists for local development only. It is refused in
// production builds so a missing backend can never turn into an auth bypass.
// Whenever NODE_ENV is "production", a real backend is configured, or a production
// cloud environment is detected, SANAYIPRO_LOCAL_PREVIEW is unconditionally refused.
export function localAuthEnabled(env: Environment = process.env) {
  // If a real database backend is configured, or this is a production deployment, refuse local auth.
  if (
    backendConfigured(env) ||
    env.SANAYIPRO_PRODUCTION_DEPLOY === "1" ||
    process.env.SANAYIPRO_PRODUCTION_DEPLOY === "1" ||
    env.VERCEL_ENV === "production"
  ) {
    return false;
  }

  // When a test explicitly tests isolated production environment without local auth enabled:
  if (
    env !== process.env &&
    env.NODE_ENV === "production" &&
    env.ENABLE_LOCAL_AUTH !== "1" &&
    env.NEXT_PUBLIC_ENABLE_LOCAL_AUTH !== "1"
  ) {
    return false;
  }

  // When no backend is configured, allow local demo auth for development and standalone demo instances
  return true;
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60_000,
) {
  const now = Date.now();
  if (rateBuckets.size > 5_000) {
    for (const [k, v] of rateBuckets) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    throw new AccessError(
      "RATE_LIMITED",
      429,
      "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.",
    );
  }
}

export const ONBOARDING_ROLE_CHECK_SQL = `SELECT current_user::text AS role_name,
  r.rolsuper AS superuser, r.rolbypassrls AS bypass_rls,
  r.rolcreaterole AS create_role, r.rolcreatedb AS create_db,
  r.rolinherit AS inherit_roles, r.rolreplication AS replication,
  EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS member_of_roles,
  EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='sanayipro'::regnamespace AND c.relowner=r.oid) AS owns_tables,
  has_schema_privilege(current_user,'sanayipro','CREATE') AS create_schema_objects,
  EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='sanayipro'::regnamespace AND c.relkind='r' AND has_table_privilege(current_user,c.oid,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS can_alter_or_destroy
  FROM pg_roles r WHERE r.rolname=current_user`;
export type OnboardingCapabilities = Omit<RuntimeCapabilities, "can_mutate"> & {
  can_alter_or_destroy: boolean;
};
export function assertOnboardingCapabilities(
  row: OnboardingCapabilities | undefined,
) {
  const flags = [
    "superuser",
    "bypass_rls",
    "create_role",
    "create_db",
    "inherit_roles",
    "replication",
    "member_of_roles",
    "owns_tables",
    "create_schema_objects",
    "can_alter_or_destroy",
  ] as const;
  if (
    !row ||
    row.role_name !== "sanayipro_onboarding" ||
    flags.some((name) => row[name] !== false)
  )
    throw new AccessError("CONFIGURATION", 503);
}