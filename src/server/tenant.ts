import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getVerifiedUser } from "./auth";
import {
  authorizeVerifiedIdentity,
  tenantChoicesForVerifiedIdentity,
} from "./authorization";
import {
  AccessError,
  parseTenantSelection,
  TENANT_COOKIE,
  type PermissionCode,
  type TenantContext,
} from "./security";
import type { TenantTransaction } from "./database";

export const getTenantChoices = cache(async () =>
  tenantChoicesForVerifiedIdentity((await getVerifiedUser()).id),
);
export async function withTenantAuthorization<T>(
  required: PermissionCode,
  work: (tx: TenantTransaction, tenant: TenantContext) => Promise<T>,
) {
  const user = await getVerifiedUser();
  const selection = parseTenantSelection(
    (await cookies()).get(TENANT_COOKIE)?.value,
  );
  if (!selection) throw new AccessError("TENANT_REQUIRED", 409);
  // Re-check memberships and permissions inside the SAME transaction as reads.
  return authorizeVerifiedIdentity(user.id, selection, required, work);
}
export const getTenantContext = cache(async () =>
  withTenantAuthorization("app.access", async (tx, tenant) => {
    void tx;
    return tenant;
  }),
);
