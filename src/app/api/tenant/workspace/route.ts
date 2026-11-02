import { NextResponse } from "next/server";
import {
  loadTenantWorkspaceSnapshot,
  serverCreateAppointment,
  serverCreateCustomerAndVehicle,
  serverCreateInventoryItem,
  serverCreateWorkOrder,
  serverMoveAppointment,
  serverRecordPayment,
  serverUpdateWorkOrderStatus,
  serverUseInventoryPart,
} from "@/server/operations-dal";
import { AccessError, backendConfigured, checkRateLimit } from "@/server/security";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

export async function GET() {
  if (!backendConfigured()) {
    return NextResponse.json(
      { error: "CONFIGURATION" },
      { status: 503, headers },
    );
  }
  try {
    const workspace = await loadTenantWorkspaceSnapshot();
    return NextResponse.json({ workspace }, { headers });
  } catch (error) {
    const code = error instanceof AccessError ? error.code : "UNAVAILABLE";
    const status = error instanceof AccessError ? error.status : 503;
    return NextResponse.json({ error: code }, { status, headers });
  }
}

export async function POST(request: Request) {
  if (!backendConfigured()) {
    return NextResponse.json(
      { error: "CONFIGURATION" },
      { status: 503, headers },
    );
  }
  try {
    const body = (await request.json()) as {
      operation?: string;
      payload?: Record<string, unknown>;
    };
    const op = String(body.operation || "");
    const payload = body.payload || {};
    checkRateLimit(`api:workspace:${op}`, 45, 60_000);

    switch (op) {
      case "createCustomerAndVehicle":
        return NextResponse.json(
          {
            data: await serverCreateCustomerAndVehicle(
              payload as Parameters<typeof serverCreateCustomerAndVehicle>[0],
            ),
          },
          { headers },
        );
      case "createWorkOrder":
        return NextResponse.json(
          {
            data: await serverCreateWorkOrder(
              payload as Parameters<typeof serverCreateWorkOrder>[0],
            ),
          },
          { headers },
        );
      case "updateWorkOrderStatus":
        return NextResponse.json(
          {
            data: await serverUpdateWorkOrderStatus(
              payload as Parameters<typeof serverUpdateWorkOrderStatus>[0],
            ),
          },
          { headers },
        );
      case "createAppointment":
        return NextResponse.json(
          {
            data: await serverCreateAppointment(
              payload as Parameters<typeof serverCreateAppointment>[0],
            ),
          },
          { headers },
        );
      case "moveAppointment":
        return NextResponse.json(
          {
            data: await serverMoveAppointment(
              payload as Parameters<typeof serverMoveAppointment>[0],
            ),
          },
          { headers },
        );
      case "createInventoryItem":
        return NextResponse.json(
          {
            data: await serverCreateInventoryItem(
              payload as Parameters<typeof serverCreateInventoryItem>[0],
            ),
          },
          { headers },
        );
      case "useInventoryPart":
        return NextResponse.json(
          {
            data: await serverUseInventoryPart(
              payload as Parameters<typeof serverUseInventoryPart>[0],
            ),
          },
          { headers },
        );
      case "recordPayment":
        return NextResponse.json(
          {
            data: await serverRecordPayment(
              payload as Parameters<typeof serverRecordPayment>[0],
            ),
          },
          { headers },
        );
      default:
        return NextResponse.json(
          { error: "VALIDATION", message: "Bilinmeyen operasyon." },
          { status: 400, headers },
        );
    }
  } catch (error) {
    const code = error instanceof AccessError ? error.code : "UNAVAILABLE";
    const status = error instanceof AccessError ? error.status : 503;
    const message =
      error instanceof AccessError ? error.message : "Sunucu hatası oluştu.";
    return NextResponse.json({ error: code, message }, { status, headers });
  }
}
