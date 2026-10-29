import { NextResponse } from "next/server";
import { withTenantAuthorization } from "@/server/tenant";
import { AccessError } from "@/server/security";
export const dynamic = "force-dynamic";
export async function GET() {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
  };
  try {
    const result = await withTenantAuthorization(
      "tenant.read",
      async (tx, tenant) => ({
        tenant,
        branch: await tx.branch.findFirst({
          where: { id: tenant.branchId, organizationId: tenant.organizationId },
          select: { id: true, name: true, organizationId: true },
        }),
      }),
    );
    return NextResponse.json(result, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AccessError ? error.code : "UNAVAILABLE" },
      { status: error instanceof AccessError ? error.status : 503, headers },
    );
  }
}
