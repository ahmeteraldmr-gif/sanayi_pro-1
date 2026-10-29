import "server-only";
import {
  AccessError,
  isUuid,
  type PermissionCode,
  type TenantContext,
  type TenantSelection,
} from "./security";
import {
  setTransactionTenant,
  withVerifiedIdentity,
  type TenantTransaction,
} from "./database";

async function resolveTenant(
  tx: TenantTransaction,
  userId: string,
  selection: TenantSelection,
  required: PermissionCode,
): Promise<TenantContext> {
  if (!isUuid(selection.organizationId) || !isUuid(selection.branchId))
    throw new AccessError("FORBIDDEN", 403);
  await setTransactionTenant(tx, selection);
  const permissions = await tx.$queryRaw<
    { code: string }[]
  >`SELECT code FROM sanayipro.permissions WHERE sanayipro.has_permission(code)`;
  const granted = permissions.map((item) => item.code);
  if (!granted.includes("app.access") || !granted.includes(required))
    throw new AccessError("FORBIDDEN", 403);
  const branch = await tx.branch.findFirst({
    where: {
      id: selection.branchId,
      organizationId: selection.organizationId,
      active: true,
    },
    include: { organization: true },
  });
  if (!branch) throw new AccessError("FORBIDDEN", 403);
  return Object.freeze({
    ...selection,
    userId,
    organizationName: branch.organization.name,
    branchName: branch.name,
    permissions: Object.freeze(granted),
  });
}
// Private server boundary shared by proxy/DAL; identity is already verified.
export function authorizeVerifiedIdentity<T>(
  userId: string,
  selection: TenantSelection,
  required: PermissionCode,
  work: (tx: TenantTransaction, tenant: TenantContext) => Promise<T>,
) {
  return withVerifiedIdentity(userId, async (tx) =>
    work(tx, await resolveTenant(tx, userId, selection, required)),
  );
}
export async function tenantChoicesForVerifiedIdentity(userId: string) {
  return withVerifiedIdentity(userId, async (tx) => {
    const candidates = await tx.branch.findMany({
      where: { active: true },
      include: { organization: true },
      orderBy: [{ organizationId: "asc" }, { name: "asc" }],
      take: 100,
    });
    const choices: TenantContext[] = [];
    for (const branch of candidates) {
      try {
        choices.push(
          await resolveTenant(
            tx,
            userId,
            { organizationId: branch.organizationId, branchId: branch.id },
            "app.access",
          ),
        );
      } catch (error) {
        if (!(error instanceof AccessError && error.code === "FORBIDDEN"))
          throw error;
      }
    }
    return choices;
  });
}
