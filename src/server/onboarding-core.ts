// Pure provisioning transaction (no Next/server-only imports) so the very same SQL is
// exercised by the embedded-PostgreSQL tests and by the production connection.
import { randomUUID } from "node:crypto";
import {
  AccessError,
  assertOnboardingCapabilities,
  isUuid,
  ONBOARDING_ROLE_CHECK_SQL,
  permissionCodes,
  type OnboardingCapabilities,
} from "./security";

export type SqlClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
};
export type OnboardingInput = Readonly<{
  userId: string;
  displayName: string;
  organizationName: string;
  branchName: string;
}>;
export type OnboardingResult = Readonly<{
  organizationId: string;
  branchId: string;
  created: boolean;
}>;

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

export function normalizeOnboardingInput(
  input: Partial<Record<keyof OnboardingInput, unknown>>,
): OnboardingInput | null {
  const userId = input.userId;
  const displayName = clean(input.displayName, 120);
  const organizationName = clean(input.organizationName, 120);
  const branchName = clean(input.branchName, 120);
  if (!isUuid(userId) || !displayName || !organizationName || !branchName)
    return null;
  return { userId, displayName, organizationName, branchName };
}

// One transaction: any failure rolls EVERYTHING back (no half-created tenant).
// The caller must already use the sanayipro_onboarding login. userId must come from a
// server-verified Supabase response, never from a form field.
export async function provisionOwner(
  client: SqlClient,
  input: OnboardingInput,
  ids: { organizationId: string; branchId: string; roleId: string } = {
    organizationId: randomUUID(),
    branchId: randomUUID(),
    roleId: randomUUID(),
  },
): Promise<OnboardingResult> {
  if (!normalizeOnboardingInput(input)) throw new AccessError("FORBIDDEN", 403);
  await client.query("BEGIN");
  try {
    const capabilities = await client.query(ONBOARDING_ROLE_CHECK_SQL);
    assertOnboardingCapabilities(
      capabilities.rows[0] as OnboardingCapabilities | undefined,
    );
    await client.query(
      "SELECT set_config('request.jwt.claims',$1,true), set_config('app.organization_id','',true), set_config('app.branch_id','',true), set_config('app.onboarding_organization_id',$2,true)",
      [
        JSON.stringify({ sub: input.userId, role: "authenticated" }),
        ids.organizationId,
      ],
    );
    // Serialises concurrent onboarding for one user (double submit, retry on login).
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `sanayipro:onboarding:${input.userId}`,
    ]);
    const existing = await client.query(
      "SELECT 1 FROM sanayipro.organization_memberships WHERE user_id = auth.uid() LIMIT 1",
    );
    if (existing.rows.length) {
      await client.query("ROLLBACK");
      return { organizationId: "", branchId: "", created: false };
    }
    await client.query(
      "INSERT INTO sanayipro.user_profiles(id,display_name) VALUES ($1,$2)",
      [input.userId, input.displayName],
    );
    await client.query(
      "INSERT INTO sanayipro.organizations(id,name) VALUES ($1,$2)",
      [ids.organizationId, input.organizationName],
    );
    await client.query(
      "INSERT INTO sanayipro.branches(id,organization_id,name) VALUES ($1,$2,$3)",
      [ids.branchId, ids.organizationId, input.branchName],
    );
    await client.query(
      "INSERT INTO sanayipro.roles(id,organization_id,code,name) VALUES ($1,$2,'owner','İşletme Sahibi')",
      [ids.roleId, ids.organizationId],
    );
    await client.query(
      "INSERT INTO sanayipro.role_permissions(organization_id,role_id,permission_code) SELECT $1,$2,code FROM unnest($3::text[]) AS code",
      [ids.organizationId, ids.roleId, [...permissionCodes]],
    );
    await client.query(
      "INSERT INTO sanayipro.organization_memberships(organization_id,user_id,role_id) VALUES ($1,$2,$3)",
      [ids.organizationId, input.userId, ids.roleId],
    );
    await client.query(
      "INSERT INTO sanayipro.branch_memberships(branch_id,organization_id,user_id,role_id) VALUES ($1,$2,$3,$4)",
      [ids.branchId, ids.organizationId, input.userId, ids.roleId],
    );
    await client.query("COMMIT");
    return {
      organizationId: ids.organizationId,
      branchId: ids.branchId,
      created: true,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error instanceof AccessError) throw error;
    throw new AccessError("UNAVAILABLE", 503);
  }
}
