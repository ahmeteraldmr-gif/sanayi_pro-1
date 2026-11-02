"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Package,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Plus,
  RefreshCw,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { Brand } from "@/components/marketing/brand";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/auth/actions";
import { useSuperAdmin } from "@/lib/super-admin-provider";
import {
  NewBusinessModal,
  ExtendSubscriptionModal,
  RecordPaymentModal,
} from "./super-admin-modals";
import "./super-admin.css";

interface SuperAdminShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: "/super-admin", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/super-admin/businesses", label: "İşletmeler", icon: Building2 },
  { href: "/super-admin/packages", label: "Paketler", icon: Package },
  { href: "/super-admin/payments", label: "Ödemeler", icon: CreditCard },
  { href: "/super-admin/alerts", label: "Uyarılar", icon: Bell },
  { href: "/super-admin/settings", label: "Sistem Ayarları", icon: Settings },
] as const;

export function SuperAdminShell({ children }: SuperAdminShellProps) {
  const pathname = usePathname();
  const { alerts } = useSuperAdmin();

  // Quick Action Modals
  const [newBizOpen, setNewBizOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    const onPopState = () => setMobileNavOpen(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
    };
  }, [mobileNavOpen]);

  const activeAlertsCount = alerts.filter(
    (a) => a.severity === "danger" || a.severity === "warning",
  ).length;

  return (
    <div className="sa-shell">
      {mobileNavOpen && (
        <div
          className="sa-mobile-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* SÜPER ADMIN SIDEBAR */}
      <aside
        className={`sa-sidebar ${mobileNavOpen ? "is-mobile-open" : ""}`}
        aria-label="Süper Admin Menüsü"
      >
        <div className="sa-sidebar-header">
          <div className="flex items-center justify-between gap-2">
            <Link href="/super-admin" className="flex items-center" onClick={() => setMobileNavOpen(false)}>
              <Brand />
            </Link>
            <button
              type="button"
              className="sa-mobile-close-btn"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Menüyü kapat"
            >
              <X size={20} />
            </button>
          </div>
          <div className="sa-brand-badge">
            <span className="sa-brand-badge-dot" aria-hidden="true" />
            <span>SÜPER ADMIN PANELİ</span>
          </div>
        </div>

        <nav className="sa-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/super-admin"
                ? pathname === "/super-admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`sa-nav-item ${isActive ? "is-active" : ""}`}
              >
                <div className="sa-nav-left">
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
                {item.href === "/super-admin/alerts" && activeAlertsCount > 0 && (
                  <span className="sa-nav-badge">{activeAlertsCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sa-sidebar-footer">
          <div className="sa-admin-profile">
            <div className="sa-admin-avatar">SA</div>
            <div className="sa-admin-info">
              <strong>Platform Sahibi</strong>
              <small>Süper Admin</small>
            </div>
          </div>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              title="Çıkış Yap"
              aria-label="Çıkış Yap"
            >
              <LogOut size={16} />
            </Button>
          </form>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="sa-main">
        <header className="sa-topbar">
          <div className="sa-topbar-left">
            <div className="sa-topbar-title-row">
              <button
                type="button"
                className="sa-mobile-menu-btn"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Süper Admin menüsünü aç"
              >
                <Menu size={20} />
              </button>
              <h1>SanayiPro Platform Yönetim Masası</h1>
            </div>
            <p>Oto servis müşterilerinizi, abonelik paketlerini ve tahsilatları tek ekranda yönetin.</p>
          </div>

          <div className="sa-topbar-actions">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewBizOpen(true)}
              className="border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold"
            >
              <Plus size={15} className="mr-1 text-purple-600" /> Yeni İşletme
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setExtendOpen(true)}
              className="border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold"
            >
              <RefreshCw size={14} className="mr-1 text-emerald-600" /> Paket Uzat
            </Button>

            <Button
              size="sm"
              onClick={() => setPaymentOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
            >
              <CreditCard size={15} className="mr-1" /> Ödeme Kaydet
            </Button>

            <Link
              href="/app"
              className="text-xs font-semibold text-slate-500 hover:text-purple-600 flex items-center gap-1 border-l border-slate-200 pl-3 ml-2"
              title="İşletme / Oto Servis Paneline Geçiş Yap"
            >
              İşletme Paneli <ExternalLink size={12} />
            </Link>
          </div>
        </header>

        <main className="sa-content">{children}</main>
      </div>

      {/* GLOBAL MODALS */}
      <NewBusinessModal open={newBizOpen} onOpenChange={setNewBizOpen} />
      <ExtendSubscriptionModal open={extendOpen} onOpenChange={setExtendOpen} />
      <RecordPaymentModal open={paymentOpen} onOpenChange={setPaymentOpen} />
    </div>
  );
}
