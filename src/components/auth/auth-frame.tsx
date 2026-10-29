import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/marketing/brand";
import "./auth.css";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Link href="/" aria-label="SanayiPro ana sayfa">
          <Brand />
        </Link>
      </div>
      <section className="auth-card">{children}</section>
      <p className="auth-footer">SanayiPro · Servisin günlük çalışma alanı.</p>
    </main>
  );
}
