import type { Metadata } from "next";
import { type ReactNode } from "react";
import { SuperAdminProvider } from "@/lib/super-admin-provider";
import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SanayiPro Süper Admin | Platform & Müşteri Yönetimi",
  description: "SanayiPro oto servis SaaS platformu süper admin yönetim merkezi.",
  robots: { index: false, follow: false },
};

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <SuperAdminProvider>
      <SuperAdminShell>{children}</SuperAdminShell>
    </SuperAdminProvider>
  );
}
