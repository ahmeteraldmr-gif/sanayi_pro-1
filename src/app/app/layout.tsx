import "./modules.css";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApplicationShell } from "@/components/app-shell/application-shell";
import { DemoProvider } from "@/components/app-shell/demo-provider";
import "./application.css";
import "./records.css";
import { getVerifiedUser } from "@/server/auth";
import { readLocalSession } from "@/server/local-auth";
import { getTenantContext } from "@/server/tenant";
import { AccessError, backendConfigured } from "@/server/security";

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
    organizationName?: string;
    branchName?: string;
    displayName?: string;
    role?: string;
  } | null = null;

  if (backendConfigured()) {
    try {
      const tenant = await getTenantContext();
      const meta = (await getVerifiedUser()).user_metadata as
        | Record<string, unknown>
        | undefined;
      activeTenantInfo = {
        organizationName: tenant.organizationName,
        branchName: tenant.branchName,
        displayName:
          typeof meta?.display_name === "string" ? meta.display_name : undefined,
        role: "İşletme Sahibi",
      };
    } catch (error) {
      if (
        error instanceof AccessError &&
        (error.code === "TENANT_REQUIRED" || error.code === "FORBIDDEN")
      )
        redirect("/auth/tenant");
      redirect(
        error instanceof AccessError && error.code === "UNAUTHENTICATED"
          ? "/login"
          : "/login?setup=required",
      );
    }
  } else {
    // Development-only cookie fallback (null in production builds).
    activeTenantInfo = await readLocalSession();
    if (!activeTenantInfo) redirect("/login");
  }

  return (
    <DemoProvider activeTenantInfo={activeTenantInfo}>
      <ApplicationShell activeTenantInfo={activeTenantInfo}>
        {children}
      </ApplicationShell>
    </DemoProvider>
  );
}
