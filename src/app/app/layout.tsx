import "./modules.css";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApplicationShell } from "@/components/app-shell/application-shell";
import { DemoProvider } from "@/components/app-shell/demo-provider";
import "./application.css";
import "./records.css";
import "./calendar.css";
import "./fault-finder.css";
import { getVerifiedUser } from "@/server/auth";
import { readLocalSession } from "@/server/local-auth";
import {
  loadTenantWorkspaceSnapshot,
  type ServerWorkspaceSnapshot,
} from "@/server/operations-dal";
import { getTenantContext } from "@/server/tenant";
import { backendConfigured } from "@/server/security";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SanayiPro | Servis Yönetimi",
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let activeTenantInfo: {
    organizationId?: string;
    branchId?: string;
    organizationName?: string;
    branchName?: string;
    displayName?: string;
    role?: string;
    branchSlug?: string;
    isDemo?: boolean;
  } | null = null;
  let initialServerData: ServerWorkspaceSnapshot | null = null;
  const serverBackendReady = backendConfigured();

  // 1. Check for active local demo / usta session first
  const localSession = await readLocalSession();
  if (localSession) {
    activeTenantInfo = localSession;
  } else if (serverBackendReady) {
    // 2. Fall back to verified Supabase tenant session
    try {
      const tenant = await getTenantContext();
      const meta = (await getVerifiedUser()).user_metadata as
        | Record<string, unknown>
        | undefined;
      activeTenantInfo = {
        organizationId: tenant.organizationId,
        branchId: tenant.branchId,
        organizationName: tenant.organizationName,
        branchName: tenant.branchName,
        displayName:
          typeof meta?.display_name === "string" ? meta.display_name : undefined,
        role: tenant.roleName || "İşletme Sahibi",
        branchSlug: "motor-mekanik",
        isDemo: false,
      };
      initialServerData = await loadTenantWorkspaceSnapshot();
    } catch {
      redirect("/login?redirect=/sanayipro/app/");
    }
  } else {
    redirect("/login?redirect=/sanayipro/app/");
  }

  return (
    <DemoProvider
      activeTenantInfo={activeTenantInfo}
      initialServerData={initialServerData}
      serverBackendReady={serverBackendReady && !activeTenantInfo?.isDemo}
    >
      <ApplicationShell activeTenantInfo={activeTenantInfo}>
        {children}
      </ApplicationShell>
    </DemoProvider>
  );
}
