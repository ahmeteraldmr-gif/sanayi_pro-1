"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useCallback, useRef, memo, type ReactNode } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CarFront,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings2,
  ShieldCheck,
  Users,
  UsersRound,
  Wallet,
  ChartNoAxesCombined,
  Search,
  Loader2,
} from "lucide-react";
import { Brand } from "@/components/marketing/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useOperations } from "@/components/modules/operations-store";
import { GlobalSearch } from "@/components/search/global-search";
import {
  branches,
  CURRENT_USER,
  deliveryLabel,
  isActive,
  isOverdue,
  money,
  pendingApprovalAmount,
} from "@/lib/demo-data";
import { useDemo, useNotice } from "./demo-provider";
import { QuickActions } from "./quick-actions";
import { useLocalReady, useLocalRepository } from "@/lib/local-repository";
import { signOutAction } from "@/app/auth/actions";
import {
  calculateRemainingDays,
  INITIAL_BUSINESSES,
  type PlatformBusiness,
} from "@/lib/super-admin-data";
import { TrainingProvider } from "@/components/training/training-context";
import { InteractiveGuide } from "@/components/training/interactive-guide";
import "@/components/training/interactive-guide.css";
import { CRAFTSMAN_BRANCHES } from "@/lib/branch-profiles";

const EMPTY_READ_ALERTS: readonly string[] = [];

type SmartAlert = {
  id: string;
  category: string;
  tone: "danger" | "warning" | "info" | "neutral";
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
};

interface ApplicationShellProps {
  children: ReactNode;
  activeTenantInfo?: {
    organizationName?: string;
    branchName?: string;
    displayName?: string;
    role?: string;
  } | null;
}

const navigation = [
  {
    group: "ANA MENÜ",
    items: [
      { label: "Genel Bakış", icon: LayoutDashboard, href: "/app", tourKey: "nav-overview" },
      { label: "İş Emirleri", icon: ClipboardList, href: "/app/work-orders", tourKey: "nav-work-orders" },
      { label: "Araç Kabul", icon: CarFront, href: "/app/intake", tourKey: "nav-intake" },
      { label: "Müşteri & Araçlar", icon: Users, href: "/app/customers", tourKey: "nav-customers" },
      { label: "Takvim", icon: CalendarDays, href: "/app/calendar", tourKey: "nav-calendar" },
      { label: "Ekip", icon: UsersRound, href: "/app/team", tourKey: "nav-team" },
      { label: "Stok", icon: Package, href: "/app/stock", tourKey: "nav-stock" },
      { label: "Finans", icon: Wallet, href: "/app/finance", tourKey: "nav-finance" },
      { label: "Raporlar", icon: ChartNoAxesCombined, href: "/app/reports", tourKey: "nav-reports" },
      { label: "Arıza Bul", icon: Search, href: "/app/fault-finder", tourKey: "nav-fault-finder" },
      { label: "Eğitim Merkezi", icon: GraduationCap, href: "/app/education", tourKey: "nav-education" },
    ],
  },
] as const;

const PREFETCH_ROUTES = [
  "/app",
  "/app/work-orders",
  "/app/intake",
  "/app/customers",
  "/app/calendar",
  "/app/team",
  "/app/stock",
  "/app/finance",
  "/app/reports",
  "/app/fault-finder",
  "/app/education",
  "/app/settings",
  "/app/help",
] as const;

function LiveNotice() {
  const notice = useNotice();
  return (
    <div className="app-live-notice" role="status" aria-live="polite">
      {notice}
    </div>
  );
}

const SidebarNavigation = memo(function SidebarNavigation({
  activePath,
  onSelectPath,
  onNavigate,
}: {
  activePath: string;
  onSelectPath: (href: string) => void;
  onNavigate?: () => void;
}) {
  const { orders, branchId, currentUser } = useDemo();
  const count = useMemo(
    () =>
      orders.filter(
        (order) => order.branchId === branchId && isActive(order.status),
      ).length,
    [orders, branchId],
  );

  const isTechnician = currentUser.isTechnician;

  return (
    <>
      <nav aria-label="Uygulama ana menüsü" className="app-nav" data-tour="sidebar-nav">
        {navigation.map((group) => {
          const visibleItems = isTechnician
            ? group.items.filter(
                (item) =>
                  item.href !== "/app/finance" &&
                  item.href !== "/app/reports" &&
                  item.href !== "/app/stock",
              )
            : group.items;

          return (
            <div className="app-nav-group" key={group.group}>
              <p>{group.group}</p>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/app"
                    ? activePath === "/app"
                    : item.href === "/app/customers"
                      ? activePath.startsWith("/app/customers") ||
                        activePath.startsWith("/app/vehicles")
                      : item.href === "/app/stock"
                        ? activePath.startsWith("/app/stock") ||
                          activePath.startsWith("/app/suppliers")
                        : item.href === "/app/team"
                          ? activePath.startsWith("/app/team") ||
                            activePath.startsWith("/app/my-jobs")
                          : activePath.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    data-tour={item.tourKey}
                    onClick={() => {
                      onSelectPath(item.href);
                      onNavigate?.();
                    }}
                    className={`app-nav-link ${active ? "is-active" : ""}`}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.label === "İş Emirleri" && (
                      <span className="app-nav-count">{count}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="app-sidebar-bottom">
        {!isTechnician && (
          <Link
            href="/app/settings"
            prefetch={true}
            className={`app-nav-link ${activePath.startsWith("/app/settings") ? "is-active" : ""}`}
            onClick={() => {
              onSelectPath("/app/settings");
              onNavigate?.();
            }}
          >
            <Settings2 size={18} />
            <span>Ayarlar</span>
          </Link>
        )}
        <Link
          href="/app/help"
          prefetch={true}
          className={`app-nav-link ${activePath.startsWith("/app/help") ? "is-active" : ""}`}
          onClick={() => {
            onSelectPath("/app/help");
            onNavigate?.();
          }}
        >
          <CircleHelp size={18} />
          <span>Yardım</span>
        </Link>
        <Link className="app-back-to-site" href="/">
          SanayiPro <ArrowUpRight size={14} />
        </Link>
      </div>
    </>
  );
});

function hasUnsavedFormData(): boolean {
  if (typeof document === "undefined") return false;
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'form input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="search"]), form textarea'
  );
  for (const input of inputs) {
    if (input.closest('[data-tour="global-search"], .app-craft-switcher-modal, .search-container')) {
      continue;
    }
    if (input.value && input.value.trim().length > 0 && input.value !== input.defaultValue) {
      return true;
    }
  }
  return false;
}

export function ApplicationShell({
  children,
  activeTenantInfo,
}: ApplicationShellProps) {
  const ready = useLocalReady();
  const router = useRouter();
  const { data: operations } = useOperations();
  const pathname = usePathname();
  const [optimisticNav, setOptimisticNav] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [navPending, setNavPending] = useState(false);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [alertFilter, setAlertFilter] = useState<"all" | "unread">("all");
  const [readAlertIds, setReadAlertIds] = useLocalRepository<readonly string[]>(
    "read-alerts",
    EMPTY_READ_ALERTS,
  );
  const [businesses] = useLocalRepository<PlatformBusiness[]>(
    "super-admin:businesses",
    INITIAL_BUSINESSES,
  );
  const currentBiz = businesses[0];
  const remainingDays = currentBiz ? calculateRemainingDays(currentBiz.endDate) : 30;
  const isSuspended = currentBiz?.isSuspended ?? false;
  const isExpired = remainingDays <= 0 || isSuspended;
  const {
    branchId,
    setBranchId,
    orders,
    remember,
    demoAppointments,
    vehicles,
    customers,
    vehicleFor,
    customerFor,
    activeBranchProfile,
    switchBranch,
  } = useDemo();

  const [craftModalOpen, setCraftModalOpen] = useState(false);
  const [craftSearch, setCraftSearch] = useState("");
  const [switchingBranchId, setSwitchingBranchId] = useState<string | null>(null);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOptimisticNav(null);
    setNavPending(false);
    setMenuOpen(false);
    setNotifOpen(false);
    setUserMenuOpen(false);
  }

  useEffect(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, [pathname]);

  const effectivePath =
    optimisticNav && optimisticNav.from === pathname
      ? optimisticNav.to
      : pathname;

  const selectPath = useCallback(
    (to: string) => {
      if (pathname === to) {
        return;
      }

      // Next.js Link provides pure client-side SPA navigation.
      // We set optimistic highlight and progress bar for instant visual feedback.
      setNavPending(true);
      setOptimisticNav({ from: pathname, to });

      // Clear any prior pending timers
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

      // Self-healing safety net (2500ms):
      // If the route transition is delayed or cancelled, automatically reset optimisticNav and navPending.
      // This unlocks the sidebar and releases all navigation targets without doing a destructive full reload!
      resetTimerRef.current = setTimeout(() => {
        setNavPending(false);
        setOptimisticNav(null);
      }, 2500);

      // Non-destructive fallback retry (4000ms):
      // Only as a last resort, if 4s elapse without route switch:
      // If unsaved form data exists: NEVER RELOAD, protect user input.
      // If no unsaved form data: Retry client-side SPA navigation via router.push.
      watchdogTimerRef.current = setTimeout(() => {
        if (window.location.pathname !== to) {
          if (hasUnsavedFormData()) {
            console.info(`[SanayiPro] Unsaved form data detected. Suppressing fallback to protect user data.`);
          } else {
            console.warn(`[SanayiPro] Navigation to ${to} delayed. Retrying client-side router transition.`);
            router.push(to);
          }
        }
      }, 4000);
    },
    [pathname, router],
  );

  useEffect(() => {
    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    remember(pathname);

    // Failsafe 1: Ensure body pointer-events and overflow are clean on navigation
    if (typeof document !== "undefined") {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
      if (document.body.style.overflow === "hidden") {
        document.body.style.overflow = "";
      }
    }
  }, [pathname, remember]);

  // Failsafe 2: Event-driven cleanup for stuck pointer-events, overflow or scroll locks
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    let scheduled = false;
    const cleanupStuckStyles = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const hasActiveOverlay = document.querySelector(
          '.tour-welcome-modal, [role="dialog"][data-state="open"], .ux-drawer-backdrop.is-open',
        );
        if (!hasActiveOverlay) {
          if (document.body.style.pointerEvents === "none") {
            document.body.style.pointerEvents = "";
          }
          if (document.body.style.overflow === "hidden") {
            document.body.style.overflow = "";
          }
          if (document.body.hasAttribute("data-scroll-locked")) {
            document.body.removeAttribute("data-scroll-locked");
          }
        }
      });
    };

    cleanupStuckStyles();
    window.addEventListener("pointerdown", cleanupStuckStyles, { capture: true, passive: true });
    window.addEventListener("keydown", cleanupStuckStyles, { capture: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", cleanupStuckStyles, { capture: true });
      window.removeEventListener("keydown", cleanupStuckStyles, { capture: true });
    };
  }, [pathname, menuOpen, notifOpen, userMenuOpen, craftModalOpen]);

  // Tab Visibility route prefetch warmup (passive, no periodic polling)
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    let lastActive = Date.now();

    const warmUpRoutesOnReturn = () => {
      const now = Date.now();
      const elapsed = now - lastActive;
      lastActive = now;

      // Only refresh prefetch if tab was away or idle for more than 60 seconds
      if (elapsed > 60000 || document.visibilityState === "visible") {
        try {
          router.prefetch("/app");
          router.prefetch("/app/work-orders");
          router.prefetch("/app/customers");
        } catch {}
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        warmUpRoutesOnReturn();
      }
    };

    const handlePopState = () => {
      setMenuOpen(false);
      setNotifOpen(false);
      setUserMenuOpen(false);
      setCraftModalOpen(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", warmUpRoutesOnReturn);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", warmUpRoutesOnReturn);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  // Warm up core application routes during idle time so first clicks are fast
  useEffect(() => {
    let cancelled = false;
    let index = 0;
    const step = () => {
      if (cancelled || index >= PREFETCH_ROUTES.length) return;
      const target = PREFETCH_ROUTES[index++];
      try {
        router.prefetch(target);
      } catch {
        // ignore prefetch errors
      }
      if (index < PREFETCH_ROUTES.length) {
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(step, { timeout: 400 });
        } else {
          setTimeout(step, 80);
        }
      }
    };
    const timer = setTimeout(step, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  const businessName =
    activeBranchProfile?.businessName ||
    activeTenantInfo?.organizationName ||
    operations.settings.business;
  const userName =
    activeTenantInfo?.displayName && activeTenantInfo.displayName !== "Ahmet Yılmaz"
      ? activeTenantInfo.displayName
      : activeBranchProfile?.craftsmanTitle || CURRENT_USER.name;
  const userRole =
    activeTenantInfo?.role === "Atölye Ustası"
      ? `${activeBranchProfile?.name || "Atölye"} Ustası`
      : activeTenantInfo?.role || `${activeBranchProfile?.name || "Servis"} Sahibi`;
  const userInitials =
    userName
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AH";

  const smartAlerts = useMemo<SmartAlert[]>(() => {
    const list: SmartAlert[] = [];
    const branchOrders = orders.filter((order) => order.branchId === branchId);

    // Single consolidated traversal over branch orders
    for (const order of branchOrders) {
      // 1. Geciken teslim
      if (isOverdue(order)) {
        const vehicle = vehicleFor(order);
        list.push({
          id: `overdue-${order.id}`,
          category: "Geciken Teslim",
          tone: "danger",
          title: `${vehicle.plate} · Teslim hedefi aşıldı`,
          subtitle: `#${order.id} · Hedef: ${deliveryLabel(order.dueAt)}`,
          href: `/app/work-orders/${order.id}`,
          ctaLabel: "İş Emrine Git →",
        });
      }

      // 2. Müşteri onayı bekleyen teklif
      const pendingAmt = pendingApprovalAmount(order);
      if (
        order.approval === "PENDING" &&
        (order.status === "AWAITING_APPROVAL" || pendingAmt > 0)
      ) {
        const vehicle = vehicleFor(order);
        const customer = customerFor(order);
        list.push({
          id: `approval-${order.id}`,
          category: "Müşteri Onayı Bekleyen Teklif",
          tone: "warning",
          title: `${vehicle.plate} · ${money(pendingAmt || order.total)} onay bekliyor`,
          subtitle: `${customer.name} · #${order.id}`,
          href: `/app/work-orders/${order.id}?tab=approval`,
          ctaLabel: "Teklifi Aç →",
        });
      }

      // 3. Parça bekleyen iş emri
      const activeRequests = (order.partRequests ?? []).filter(
        (req) => req.status === "REQUESTED" || req.status === "PREPARING",
      );
      if (order.status === "WAITING_PARTS" || activeRequests.length > 0) {
        const vehicle = vehicleFor(order);
        const partLabel =
          activeRequests[0]?.partName ||
          order.parts.find((p) => p.state === "RESERVED")?.name ||
          "Stok / tedarik parçası";
        list.push({
          id: `waiting-parts-${order.id}`,
          category: "Parça Bekleyen İş Emri",
          tone: "warning",
          title: `${vehicle.plate} · ${partLabel}`,
          subtitle: `#${order.id} · ${activeRequests.length ? `${activeRequests.length} aktif parça talebi` : "Parça tedariki bekleniyor"}`,
          href: `/app/work-orders/${order.id}?tab=parts`,
          ctaLabel: "Parçaları Gör →",
        });
      }

      // 5. Açık bakiye
      const balance = Math.max(0, order.total - order.paid);
      if (balance > 0 && order.status !== "CANCELLED") {
        const vehicle = vehicleFor(order);
        const customer = customerFor(order);
        list.push({
          id: `balance-${order.id}`,
          category: "Açık Bakiye",
          tone: "info",
          title: `${vehicle.plate} · ${money(balance)} açık bakiye`,
          subtitle: `${customer.name} · #${order.id}`,
          href: `/app/work-orders/${order.id}?tab=payments`,
          ctaLabel: "Tahsilata Git →",
        });
      }

      // 6. Uzun süredir bekleyen araç
      if (
        isActive(order.status) &&
        (order.stageDuration.includes("saat") ||
          order.status === "WAITING_PARTS" ||
          order.status === "AWAITING_APPROVAL")
      ) {
        const vehicle = vehicleFor(order);
        list.push({
          id: `waiting-vehicle-${order.id}`,
          category: "Uzun Süredir Bekleyen Araç",
          tone: "neutral",
          title: `${vehicle.plate} · ${order.stageDuration} aynı aşamada`,
          subtitle: `#${order.id} · ${order.complaint}`,
          href: `/app/work-orders/${order.id}`,
          ctaLabel: "Kaydı Aç →",
        });
      }
    }

    // 4. Kritik stok
    for (const part of operations.parts) {
      if (
        part.branchId === branchId &&
        part.physical - part.reserved < part.minimum
      ) {
        list.push({
          id: `stock-${part.id}`,
          category: "Kritik Stok",
          tone: "danger",
          title: `${part.name} kritik seviyede`,
          subtitle: `Kullanılabilir ${part.physical - part.reserved} adet · Minimum ${part.minimum} adet`,
          href: `/app/stock/${part.id}`,
          ctaLabel: "Parçayı İncele →",
        });
      }
    }

    // 7. Yaklaşan randevu
    for (const appt of demoAppointments) {
      if (appt.branchId === branchId && appt.status !== "CANCELLED") {
        const apptVehicle = vehicles.find((v) => v.id === appt.vehicleId);
        const apptCustomer = customers.find(
          (c) => c.id === apptVehicle?.customerId,
        );
        list.push({
          id: `appt-${appt.id}`,
          category: "Yaklaşan Randevu",
          tone: "info",
          title: `${apptVehicle?.plate ?? "Araç"} · ${appt.at} randevusu`,
          subtitle: `${apptCustomer?.name ?? "Müşteri"} · ${appt.note}`,
          href: "/app/calendar",
          ctaLabel: "Takvimi Aç →",
        });
      }
    }

    return list;
  }, [
    orders,
    branchId,
    operations.parts,
    demoAppointments,
    vehicles,
    customers,
    vehicleFor,
    customerFor,
  ]);

  const readSet = useMemo(() => new Set(readAlertIds), [readAlertIds]);
  const unreadAlertsCount = useMemo(
    () => smartAlerts.filter((item) => !readSet.has(item.id)).length,
    [smartAlerts, readSet],
  );
  const visibleAlerts = useMemo(
    () =>
      alertFilter === "unread"
        ? smartAlerts.filter((item) => !readSet.has(item.id))
        : smartAlerts,
    [smartAlerts, alertFilter, readSet],
  );

  function toggleAlertRead(id: string) {
    setReadAlertIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function markAllAlertsRead() {
    setReadAlertIds(smartAlerts.map((item) => item.id));
  }

  return (
    <TrainingProvider>
      <div
        data-local-ready={ready}
        className={`workspace ${/^\/app\/work-orders\/[^/]+/.test(pathname) ? "is-order-detail" : ""}`}
      >
      {navPending && (
        <div className="app-loading-bar" role="progressbar" aria-label="Sayfa yükleniyor" />
      )}
      <a className="skip-link" href="#app-content">
        İçeriğe geç
      </a>
      <aside className="app-sidebar">
        <Link
          href="/app"
          prefetch={true}
          onClick={() => selectPath("/app")}
          aria-label="SanayiPro genel bakış"
        >
          <Brand />
        </Link>
        <div className="app-business">
          <span>{businessName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{businessName}</strong>
            <small>Servis yönetimi</small>
          </div>
          <ShieldCheck size={17} aria-hidden="true" />
        </div>
        <SidebarNavigation
          activePath={effectivePath}
          onSelectPath={selectPath}
        />
        <div className="app-sidebar-user">
          <span className="app-avatar">{userInitials}</span>
          <div>
            <strong>{userName}</strong>
            <small>{userRole}</small>
          </div>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar">
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="app-mobile-trigger"
                aria-label="Uygulama menüsünü aç"
              >
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent className="app-mobile-menu">
              <DialogTitle>
                <Brand />
              </DialogTitle>
              <DialogDescription className="sr-only">
                Uygulama modülleri ve sayfaları
              </DialogDescription>
              <SidebarNavigation
                activePath={effectivePath}
                onSelectPath={selectPath}
                onNavigate={() => setMenuOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <div data-tour="global-search" className="flex-1 max-w-md">
            <GlobalSearch />
          </div>
          <div className="app-topbar-actions">
            <div>
              <QuickActions />
            </div>
            {/* 23 Usta Branşı Hızlı Değiştirici */}
            <div data-tour="craft-branch-switcher">
              <Dialog open={craftModalOpen} onOpenChange={setCraftModalOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="app-craft-switcher-pill"
                    title="Usta Branşını Değiştir (23 Branş)"
                    aria-label="Usta Branşını Değiştir"
                  >
                    <span className="app-craft-switcher-dot" />
                    <span className="app-craft-switcher-name">{activeBranchProfile.name}</span>
                    <ChevronDown size={13} aria-hidden="true" />
                  </button>
                </DialogTrigger>
                <DialogContent className="app-demo-dialog app-craft-switcher-modal">
                  <div className="app-craft-modal-head">
                    <DialogTitle className="app-dialog-title">
                      SanayiPro Usta Branşı Seçin (23 Branş)
                    </DialogTitle>
                    <DialogDescription className="app-dialog-description">
                      Panelin iş emirleri, hızlı şablonları ve stokları seçtiğiniz uzmanlık alanına göre dinamik olarak uyarlanır.
                    </DialogDescription>
                  </div>

                  <div className="app-craft-modal-search">
                    <Search size={15} className="app-craft-search-icon" aria-hidden="true" />
                    <input
                      type="search"
                      value={craftSearch}
                      onChange={(e) => setCraftSearch(e.target.value)}
                      placeholder="Branş ara (örn: Motor, Şanzıman, Lastik, Boya, Elektrik...)"
                      className="app-craft-search-input"
                    />
                  </div>

                  <div className="app-craft-modal-grid">
                    {CRAFTSMAN_BRANCHES.filter((b) => {
                      const q = craftSearch.trim().toLowerCase();
                      return (
                        !q ||
                        b.name.toLowerCase().includes(q) ||
                        b.craftsmanTitle.toLowerCase().includes(q) ||
                        b.category.toLowerCase().includes(q) ||
                        b.businessName.toLowerCase().includes(q)
                      );
                    }).map((b) => {
                      const isCurrent = activeBranchProfile.id === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          disabled={switchingBranchId !== null}
                          className={`app-craft-modal-card ${isCurrent ? "is-active" : ""}`}
                          onClick={async () => {
                            setSwitchingBranchId(b.id);
                            await switchBranch(b.id);
                          }}
                        >
                          <div className="app-craft-card-top">
                            <span className="app-craft-card-badge">{b.category}</span>
                            {isCurrent && <span className="app-craft-card-active-mark">Aktif Branş</span>}
                          </div>
                          <strong className="app-craft-card-name">{b.name}</strong>
                          <span className="app-craft-card-title">{b.craftsmanTitle}</span>
                          <span className="app-craft-card-biz">{b.businessName}</span>
                          {switchingBranchId === b.id && (
                            <div className="app-craft-card-loading">
                              <Loader2 size={13} className="animate-spin" />
                              <span>Yükleniyor…</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <label className="app-branch-selector" data-tour="branch-selector">
              <span className="sr-only">Çalışılan şube</span>
              <select
                value={branchId}
                onChange={(event) =>
                  setBranchId(
                    event.target.value === "iskenderun"
                      ? "iskenderun"
                      : "dortyol",
                  )
                }
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {operations.settings[branch.id] || branch.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </label>
            <div>
              <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
                <DialogTrigger asChild>
                  <button
                    className="app-icon-button app-notification-trigger"
                    data-tour="notifications"
                    data-tour-id="notifications"
                    aria-label="Bildirimleri aç"
                  >
                    <Bell size={20} />
                    {unreadAlertsCount > 0 &&
                      operations.settings.notifications !== "Kapalı" && (
                        <span className="app-notification-badge">
                          {unreadAlertsCount}
                        </span>
                      )}
                  </button>
                </DialogTrigger>
                <DialogContent className="app-demo-dialog app-smart-alerts-dialog">
                <div className="app-smart-alerts-header">
                  <div>
                    <DialogTitle className="app-dialog-title">
                      Akıllı Uyarılar
                    </DialogTitle>
                    <DialogDescription className="app-dialog-description">
                      {unreadAlertsCount > 0
                        ? `${unreadAlertsCount} okunmamış operasyon uyarısı`
                        : "Tüm operasyon uyarıları incelendi"}
                    </DialogDescription>
                  </div>
                  {unreadAlertsCount > 0 && (
                    <button
                      type="button"
                      className="app-smart-mark-all"
                      onClick={markAllAlertsRead}
                    >
                      Tümünü Okundu İşaretle
                    </button>
                  )}
                </div>
                <div className="app-smart-alerts-toolbar">
                  <button
                    type="button"
                    className={`app-smart-filter-chip ${alertFilter === "all" ? "is-active" : ""}`}
                    onClick={() => setAlertFilter("all")}
                  >
                    Tümü ({smartAlerts.length})
                  </button>
                  <button
                    type="button"
                    className={`app-smart-filter-chip ${alertFilter === "unread" ? "is-active" : ""}`}
                    onClick={() => setAlertFilter("unread")}
                  >
                    Okunmadı ({unreadAlertsCount})
                  </button>
                </div>
                <div className="app-notification-list app-smart-alerts-list">
                  {operations.settings.notifications === "Kapalı" ? (
                    <p>Uygulama içi hatırlatmalar kapalı.</p>
                  ) : visibleAlerts.length === 0 ? (
                    <p className="app-smart-empty">
                      Bu filtrede gösterilecek uyarı yok.
                    </p>
                  ) : (
                    visibleAlerts.map((alert) => {
                      const isRead = readSet.has(alert.id);
                      return (
                        <div
                          key={alert.id}
                          className={`app-smart-alert-item tone-${alert.tone} ${isRead ? "is-read" : "is-unread"}`}
                        >
                          <div className="app-smart-alert-top">
                            <span className="app-smart-alert-cat">
                              {alert.category}
                            </span>
                            <button
                              type="button"
                              className="app-smart-read-toggle"
                              onClick={() => toggleAlertRead(alert.id)}
                            >
                              {isRead ? "Okundu" : "Okunmadı"}
                            </button>
                          </div>
                          <strong>{alert.title}</strong>
                          <span>{alert.subtitle}</span>
                          <div className="app-smart-alert-bottom">
                            <DialogClose asChild>
                              <Link
                                href={alert.href}
                                onClick={() => {
                                  if (!isRead) {
                                    setReadAlertIds((current) => [
                                      ...current,
                                      alert.id,
                                    ]);
                                  }
                                }}
                              >
                                {alert.ctaLabel}
                              </Link>
                            </DialogClose>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <DialogClose asChild>
                  <Button>Kapat</Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
            </div>
            <div data-tour="user-menu">
              <Dialog open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <DialogTrigger asChild>
                  <button
                    className="app-user-menu"
                    aria-label={`${userName} kullanıcı menüsünü aç`}
                  >
                    <span className="app-avatar">{userInitials}</span>
                    <span>
                      <strong>{userName}</strong>
                      <small>{userRole}</small>
                    </span>
                    <ChevronDown size={14} />
                  </button>
                </DialogTrigger>
                <DialogContent className="app-demo-dialog">
                  <DialogTitle className="app-dialog-title">
                    {userName} · {userRole}
                  </DialogTitle>
                  <DialogDescription className="app-dialog-description">
                    {businessName} çalışma alanındasınız. Hesap ve işletme
                    tercihlerinizi yönetebilirsiniz.
                  </DialogDescription>

                  {/* Abonelik & Paket Bilgisi */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", margin: "10px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 13, color: "#6b21a8" }}>{currentBiz?.packageName || "Pro Paket"}</strong>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: remainingDays <= 7 ? "#fef3c7" : "#dcfce7", color: remainingDays <= 7 ? "#b45309" : "#15803d" }}>
                        {isSuspended ? "Askıda" : remainingDays <= 0 ? "Süresi Doldu" : `${remainingDays} gün kaldı`}
                      </span>
                    </div>
                    <small style={{ fontSize: 11, color: "#64748b", display: "block", marginTop: 2 }}>
                      {currentBiz?.endDate || "01 Kasım 2026"} tarihinde sona eriyor
                    </small>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <DialogClose asChild>
                      <Button asChild variant="outline" className="w-full justify-start gap-2">
                        <Link href="/app/education">
                          <GraduationCap size={16} className="text-purple-600" /> Eğitim Merkezi (Rehber)
                        </Link>
                      </Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button asChild className="w-full justify-start gap-2">
                        <Link href="/app/settings">Abonelik & Ayarları Aç</Link>
                      </Button>
                    </DialogClose>
                  </div>
                  <form action={signOutAction} className="w-full mt-2">
                    <Button type="submit" variant="ghost" className="w-full">
                      <LogOut aria-hidden="true" /> Çıkış Yap
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Paket Bitiş Uyarı Şeridi (<= 7 Gün) */}
        {remainingDays <= 7 && !isExpired && (
          <div
            style={{
              background: "#fffbeb",
              borderBottom: "1px solid #fde68a",
              padding: "8px 24px",
              fontSize: "12.5px",
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            role="alert"
          >
            <span>
              SanayiPro paketinizin bitmesine <strong>{remainingDays} gün</strong> kaldı ({currentBiz?.endDate}).
            </span>
            <Link
              href="/app/settings"
              style={{ fontWeight: 700, textDecoration: "underline", color: "#78350f" }}
            >
              Abonelik Detayı →
            </Link>
          </div>
        )}

        <main id="app-content" className="app-content">
          {children}
        </main>
        <LiveNotice />

        {/* Paket Süresi Dolduğunda Erişim Kısıtlama Ekranı (Veriler Silinmez) */}
        {isExpired && (
          <div className="sa-expired-lock-screen" role="alertdialog" aria-modal="true">
            <div className="sa-expired-lock-card">
              <div className="sa-expired-lock-icon">
                <ShieldCheck size={32} />
              </div>
              <h2>Paket Süreniz Sona Erdi</h2>
              <p>
                <strong>{currentBiz?.name || "İşletmenizin"}</strong> SanayiPro paket kullanım süresi tamamlanmıştır.
                <br /><br />
                <strong>Kayıtlarınız ve verileriniz güvendedir (silinmez).</strong>
                <br />
                Tekrar erişim sağlamak için lütfen platform desteği veya yöneticiniz ile iletişime geçin.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Button asChild size="lg" style={{ background: "#7c3aed", color: "#fff", fontWeight: 700 }}>
                  <a href="https://wa.me/905324112233" target="_blank" rel="noopener noreferrer">
                    Destek ile İletişime Geç (WhatsApp)
                  </a>
                </Button>
                <form action={signOutAction}>
                  <Button type="submit" variant="ghost" style={{ width: "100%", color: "#64748b" }}>
                    Çıkış Yap
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
      <nav className="app-bottom-nav" aria-label="Mobil uygulama menüsü">
        <Link
          href="/app"
          prefetch={true}
          onClick={() => selectPath("/app")}
        >
          <LayoutDashboard size={20} />
          Bugün
        </Link>
        <Link
          href="/app/work-orders"
          prefetch={true}
          onClick={() => selectPath("/app/work-orders")}
        >
          <ClipboardList size={20} />
          İşler
        </Link>
        <QuickActions mobile />
        <Link
          href="/app/calendar"
          prefetch={true}
          onClick={() => selectPath("/app/calendar")}
        >
          <CalendarDays size={20} />
          <span>Takvim</span>
        </Link>
        <button onClick={() => setMenuOpen(true)}>
          <Menu size={20} />
          Menü
        </button>
      </nav>
      <InteractiveGuide />
    </div>
  </TrainingProvider>
  );
}
