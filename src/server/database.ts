import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import {
  AccessError,
  assertRuntimeCapabilities,
  getRuntimeDatabaseUrl,
  isUuid,
  RUNTIME_ROLE_CHECK_SQL,
  type RuntimeCapabilities,
  type TenantSelection,
} from "./security";

const databaseGlobal = globalThis as unknown as {
  sanayiproDatabase?: PrismaClient;
};
function getDatabase() {
  if (!databaseGlobal.sanayiproDatabase) {
    const adapter = new PrismaPg(
      {
        connectionString: getRuntimeDatabaseUrl(),
        max: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000,
      },
      { schema: "sanayipro" },
    );
    databaseGlobal.sanayiproDatabase = new PrismaClient({
      adapter,
      errorFormat: "minimal",
    });
  }
  return databaseGlobal.sanayiproDatabase;
}
export type TenantTransaction = Prisma.TransactionClient;
export async function setTransactionTenant(
  tx: TenantTransaction,
  selection: TenantSelection | null,
) {
  await tx.$queryRaw`SELECT set_config('app.organization_id',${selection?.organizationId ?? ""},true), set_config('app.branch_id',${selection?.branchId ?? ""},true)`;
}
// Internal trusted-server entry point. userId MUST come from Supabase getUser(),
// never from a form, cookie, header or a client-supplied request body.
export async function withVerifiedIdentity<T>(
  userId: string,
  work: (tx: TenantTransaction) => Promise<T>,
) {
  if (!isUuid(userId)) throw new AccessError("UNAUTHENTICATED", 401);
  return getDatabase().$transaction(
    async (tx) => {
      const capabilities = await tx.$queryRaw<RuntimeCapabilities[]>(
        Prisma.raw(RUNTIME_ROLE_CHECK_SQL),
      );
      assertRuntimeCapabilities(capabilities[0]);
      await tx.$queryRaw`SELECT set_config('request.jwt.claims',${JSON.stringify({ sub: userId, role: "authenticated" })},true), set_config('app.organization_id','',true), set_config('app.branch_id','',true)`;
      return work(tx);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 5000,
      timeout: 10000,
    },
  );
}
