"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Sparkles,
  BookOpen,
  GraduationCap,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useTraining } from "./training-context";
import { getStepType, isRouteMatching } from "@/lib/training-data";
import { Button } from "@/components/ui/button";

type GuideStatus =
  | "IDLE"
  | "SEARCHING"
  | "READY"
  | "VERIFYING"
  | "NAVIGATING"
  | "TARGET_NOT_FOUND";

export function InteractiveGuide() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    activeTrack,
    activeStep,
    activeStepIndex,
    isTrainingActive,
    feedbackMessage,
    welcomeOpen,
    dismissWelcome,
    nextStep,
    prevStep,
    skipStep,
    closeTraining,
    startTrack,
  } = useTraining();

  const stepType = activeStep ? getStepType(activeStep) : "info";
  const isActionStep = stepType === "action";

  const [status, setStatus] = useState<GuideStatus>("IDLE");
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTopPosition, setIsTopPosition] = useState(false);
  const [formErrorNotice, setFormErrorNotice] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const activeElementRef = useRef<Element | null>(null);
  const lastTargetRectRef = useRef<DOMRect | null>(null);
  const lastActionTimeRef = useRef<number>(0);
  const waitingForRouteRef = useRef<string | null>(null);

  // Failsafe: Guarantee body pointer-events and scroll are never stuck
  useEffect(() => {
    if (!welcomeOpen && !isTrainingActive && typeof document !== "undefined") {
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
  }, [welcomeOpen, isTrainingActive]);

  // Keyboard shortcut: Escape closes welcome modal cleanly
  useEffect(() => {
    if (!welcomeOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismissWelcome();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [welcomeOpen, dismissWelcome]);

  // Helper to query element by selector or data-tour / data-tour-id
  const resolveTargetElement = useCallback((selector: string): Element | null => {
    if (!selector) return null;
    try {
      // 1. Direct query
      const direct = document.querySelector(selector);
      if (direct) return direct;

      // 1b. Fallback aliases for known key targets
      if (selector.includes("quick-actions")) {
        const qa = document.querySelector('[data-tour="quick-actions"], .app-quick-actions-trigger, button:has(.lucide-plus)');
        if (qa) return qa;
      }
      if (selector.includes("global-search")) {
        const gs = document.querySelector('[data-tour="global-search"], .app-global-search-input, input[placeholder*="Plaka"]');
        if (gs) return gs;
      }
      if (selector.includes("branch-selector")) {
        const bs = document.querySelector('[data-tour="branch-selector"], .app-branch-selector, [data-tour="craft-branch-switcher"]');
        if (bs) return bs;
      }
      if (selector.includes("notifications")) {
        const notif = document.querySelector('[data-tour="notifications"], .app-notification-trigger');
        if (notif) return notif;
      }
      if (selector.includes("sidebar-nav")) {
        const nav = document.querySelector('[data-tour="sidebar-nav"], .app-nav');
        if (nav) return nav;
      }

      // 2. Also check data-tour-id if selector has data-tour
      const tourMatch = selector.match(/data-tour="([^"]+)"/);
      if (tourMatch && tourMatch[1]) {
        const idSelector = `[data-tour-id="${tourMatch[1]}"]`;
        const alt = document.querySelector(idSelector);
        if (alt) return alt;
      }
    } catch {}
    return null;
  }, []);

  // Check if current route is mismatched with expected route
  // If target element is already present in DOM (e.g. sidebar or topbar), it is NOT a mismatch!
  const isTargetSidebarNav =
    (activeStep?.targetSelector.includes("nav-") ||
      activeStep?.targetSelector.includes("sidebar-nav")) ??
    false;
  const isTargetGlobal =
    (activeStep?.targetSelector.includes("global-search") ||
      activeStep?.targetSelector.includes("quick-actions") ||
      activeStep?.targetSelector.includes("branch-selector") ||
      activeStep?.targetSelector.includes("notifications")) ??
    false;

  const targetElInDom = resolveTargetElement(activeStep?.targetSelector ?? "");
  const routeMismatch = Boolean(
    isTrainingActive &&
      activeStep &&
      activeStep.expectedRoute &&
      !isTargetSidebarNav &&
      !isTargetGlobal &&
      !targetElInDom &&
      !isRouteMatching(activeStep.expectedRoute, pathname),
  );

  // 1. Target Element Finder & Observer
  useEffect(() => {
    let unmounted = false;

    if (!isTrainingActive || !activeStep) {
      const raf = requestAnimationFrame(() => {
        if (!unmounted) {
          setStatus("IDLE");
          setTargetRect(null);
        }
      });
      lastTargetRectRef.current = null;
      if (activeElementRef.current) {
        activeElementRef.current.removeAttribute("data-tour-active-target");
        activeElementRef.current = null;
      }
      return () => {
        unmounted = true;
        cancelAnimationFrame(raf);
      };
    }

    if (routeMismatch) {
      const raf = requestAnimationFrame(() => {
        if (!unmounted) {
          setStatus("TARGET_NOT_FOUND");
          setTargetRect(null);
        }
      });
      return () => {
        unmounted = true;
        cancelAnimationFrame(raf);
      };
    }

    // Do not schedule delayed startRaf that overwrites measureAndHighlight!
    const measureAndHighlight = (el: Element) => {
      if (unmounted) return;
      const rect = el.getBoundingClientRect();

      // Guard: Avoid redundant layout thrashing and state cycles if already measured
      if (
        activeElementRef.current === el &&
        lastTargetRectRef.current &&
        Math.abs(rect.top - lastTargetRectRef.current.top) < 1.5 &&
        Math.abs(rect.left - lastTargetRectRef.current.left) < 1.5 &&
        Math.abs(rect.width - lastTargetRectRef.current.width) < 1.5 &&
        Math.abs(rect.height - lastTargetRectRef.current.height) < 1.5
      ) {
        return;
      }

      lastTargetRectRef.current = rect;
      setTargetRect(rect);
      setStatus("READY");

      // Check if target is in bottom-right quadrant (desktop) or lower half (mobile) to adjust guide card position
      const isMobile = window.innerWidth <= 640;
      const isNearBottomRight = isMobile
        ? rect.bottom > (window.innerHeight || 800) - 260
        : rect.bottom > (window.innerHeight || 800) - 340 &&
          rect.right > (window.innerWidth || 1200) - 420;
      setIsTopPosition(isNearBottomRight);

      // Highlight attribute
      if (activeElementRef.current && activeElementRef.current !== el) {
        activeElementRef.current.removeAttribute("data-tour-active-target");
      }
      activeElementRef.current = el;
      if (!el.hasAttribute("data-tour-active-target")) {
        el.setAttribute("data-tour-active-target", "true");
      }

      // Scroll into view comfortably only if target is outside visible viewport
      if (isMobile) {
        const targetTop = rect.top + window.scrollY;
        if (rect.top < 60 || rect.bottom > (window.innerHeight || 800) - 100) {
          window.scrollTo({
            top: Math.max(0, targetTop - 110),
            behavior: "smooth",
          });
        }
      } else {
        const inViewport =
          rect.top >= 70 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - 70 &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth);

        if (!inViewport) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    };

    // Immediate check
    const initialEl = resolveTargetElement(activeStep.targetSelector);
    if (initialEl) {
      measureAndHighlight(initialEl);
    } else {
      setStatus("SEARCHING");
    }

    // MutationObserver: ONLY observe child additions/removals, NEVER attributes!
    const observer = new MutationObserver(() => {
      if (unmounted) return;
      const el = resolveTargetElement(activeStep.targetSelector);
      if (el && el !== activeElementRef.current) {
        measureAndHighlight(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Fallback interval check: only search if target element is not yet found or detached
    const intervalTimer = setInterval(() => {
      if (unmounted) return;
      if (activeElementRef.current && document.body.contains(activeElementRef.current)) {
        return;
      }
      const el = resolveTargetElement(activeStep.targetSelector);
      if (el) {
        measureAndHighlight(el);
      }
    }, 250);

    // Timeout (2 seconds): if still not found, transition to TARGET_NOT_FOUND
    const timeoutTimer = setTimeout(() => {
      if (unmounted) return;
      const el = resolveTargetElement(activeStep.targetSelector);
      if (el) {
        measureAndHighlight(el);
      } else {
        setStatus("TARGET_NOT_FOUND");
        setTargetRect(null);
      }
    }, 2000);

    return () => {
      unmounted = true;
      observer.disconnect();
      clearInterval(intervalTimer);
      clearTimeout(timeoutTimer);
      lastTargetRectRef.current = null;
      if (activeElementRef.current) {
        activeElementRef.current.removeAttribute("data-tour-active-target");
        activeElementRef.current = null;
      }
    };
  }, [
    isTrainingActive,
    activeStep,
    routeMismatch,
    retryKey,
    resolveTargetElement,
  ]);

  // 2. Window Resize and Scroll tracker
  useEffect(() => {
    if (!isTrainingActive || status !== "READY" || !activeElementRef.current)
      return;

    const handleUpdateRect = () => {
      lastTargetRectRef.current = null;
      if (activeElementRef.current) {
        const rect = activeElementRef.current.getBoundingClientRect();
        setTargetRect(rect);
        const isNearBottomRight =
          rect.bottom > (window.innerHeight || 800) - 340 &&
          rect.right > (window.innerWidth || 1200) - 420;
        setIsTopPosition(isNearBottomRight);
      }
    };

    window.addEventListener("resize", handleUpdateRect, { passive: true });
    window.addEventListener("scroll", handleUpdateRect, { passive: true });
    return () => {
      window.removeEventListener("resize", handleUpdateRect);
      window.removeEventListener("scroll", handleUpdateRect);
    };
  }, [isTrainingActive, status]);

  // 3. Mobile Body Class Management
  useEffect(() => {
    if (isTrainingActive && window.innerWidth <= 640) {
      document.body.classList.add("tour-mobile-open");
    } else {
      document.body.classList.remove("tour-mobile-open");
    }
    return () => {
      document.body.classList.remove("tour-mobile-open");
    };
  }, [isTrainingActive]);

  // 4. Auto-advance if user is already at the destination of a navigation step
  useEffect(() => {
    if (
      isTrainingActive &&
      activeStep &&
      activeStep.actionType === "navigate" &&
      activeStep.expectedRoute &&
      isRouteMatching(activeStep.expectedRoute, pathname) &&
      activeStep.targetSelector.includes("nav-")
    ) {
      // User is already on the target page, skip redundant menu click
      const timer = setTimeout(() => {
        nextStep();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isTrainingActive, activeStep, pathname, nextStep]);

  // 5. Route Watcher for Pending Navigation Steps
  useEffect(() => {
    if (!waitingForRouteRef.current) return;
    const dest = waitingForRouteRef.current;

    if (isRouteMatching(dest, pathname)) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[SanayiPro Training] Reached destination route: ${pathname} matching ${dest}`);
      }
      waitingForRouteRef.current = null;
      setStatus("SEARCHING");

      // Verify that destination page has rendered before advancing
      const raf = requestAnimationFrame(() => {
        setTimeout(() => {
          nextStep();
        }, 80);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [pathname, nextStep]);

  // 5b. Failsafe timeout for pending navigation (reset to READY if URL does not change)
  useEffect(() => {
    if (!waitingForRouteRef.current || status !== "NAVIGATING") return;
    const timer = setTimeout(() => {
      if (waitingForRouteRef.current && !isRouteMatching(waitingForRouteRef.current, pathname)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[SanayiPro Training] Navigation did not occur within timeout. Resetting to READY.");
        }
        waitingForRouteRef.current = null;
        setStatus("READY");
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [status, pathname]);

  // 6. Global Document Click Capture Listener (Advances on clicking highlighted target)
  useEffect(() => {
    if (!isTrainingActive || !activeStep || status !== "READY") return;

    const handleDocumentClick = (e: MouseEvent) => {
      const clickTarget = e.target as Element | null;
      if (!clickTarget) return;

      // Ignore clicks originating inside the guide card or welcome modal
      if (clickTarget.closest(".tour-guide-card") || clickTarget.closest(".tour-welcome-modal")) return;

      const currentEl = resolveTargetElement(activeStep.targetSelector);
      if (!currentEl) return;

      // Check if user clicked on or inside the highlighted target element
      const isTargetClicked =
        currentEl === clickTarget || currentEl.contains(clickTarget);

      if (!isTargetClicked) return;

      // Prevent duplicate double clicks within 600ms
      const now = Date.now();
      if (now - lastActionTimeRef.current < 600) return;
      lastActionTimeRef.current = now;

      // Action type: NAVIGATE (or step with targetRoute)
      const isNavAction = activeStep.actionType === "navigate" || Boolean(activeStep.targetRoute);
      if (isNavAction) {
        const dest = activeStep.targetRoute || activeStep.expectedRoute;
        if (!isRouteMatching(dest, pathname)) {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `[SanayiPro Training] Navigation action: waiting for route '${dest}' from '${pathname}'`,
            );
          }
          waitingForRouteRef.current = dest;
          setStatus("NAVIGATING");
          return;
        }
        // If route is already active, advance after tick
        setTimeout(() => {
          nextStep();
        }, 200);
        return;
      }

      // Action type: FORM SUBMISSION / VERIFICATION
      const isFormSave =
        activeStep.targetSelector.includes("save") ||
        activeStep.targetSelector.includes("complete") ||
        activeStep.targetSelector.includes("submit");

      if (isFormSave) {
        setStatus("VERIFYING");
        setTimeout(() => {
          // Check for visible form validation errors
          const errorEl = document.querySelector(
            ".records-error:not(:empty), [role='alert']:not(:empty)",
          );
          if (errorEl && errorEl.textContent?.trim()) {
            setFormErrorNotice("Lütfen zorunlu alanları doldurup tekrar deneyin.");
            setTimeout(() => setFormErrorNotice(null), 3500);
            setStatus("READY");
            return;
          }
          // Form succeeded
          nextStep();
        }, 350);
        return;
      }

      // Standard Action / Button click
      setTimeout(() => {
        nextStep();
      }, 250);
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, {
        capture: true,
      });
    };
  }, [
    isTrainingActive,
    activeStep,
    status,
    isActionStep,
    pathname,
    nextStep,
    resolveTargetElement,
  ]);

  return (
    <>
      {/* 1. Başarı / Tebrik Bildirimi */}
      {feedbackMessage && (
        <div className="tour-feedback-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* 2. İnteraktif Spotlight Kutusu & Karartma (Hedef elemanı çevreler) */}
      {isTrainingActive && targetRect && status === "READY" && (
        <>
          {/* Ekran Karartma & Hedef Eleman Penceresi (SVG Mask Cutout) */}
          <svg className="tour-backdrop-svg" aria-hidden="true">
            <defs>
              <mask id="tour-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={Math.max(0, targetRect.left - 6)}
                  y={Math.max(0, targetRect.top - 6)}
                  width={targetRect.width + 12}
                  height={targetRect.height + 12}
                  rx="12"
                  ry="12"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(15, 23, 42, 0.55)"
              mask="url(#tour-spotlight-mask)"
            />
          </svg>

          {/* 3px Neon Parlayan Hareketli Çerçeve */}
          <div
            className={`tour-target-spotlight ${!isActionStep ? "info-mode" : ""}`}
            style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
            aria-hidden="true"
          >
            <span className="tour-spotlight-pulse" />
            <div
              className={`tour-spotlight-arrow-badge ${targetRect.top < 65 ? "badge-bottom" : "badge-top"}`}
            >
              <span>{targetRect.top < 65 ? "👆" : "👇"}</span>
              <span>{isActionStep ? "BURAYA TIKLAYIN" : "İNCELEYİN"}</span>
            </div>
          </div>
        </>
      )}

      {/* 3. Yanlış Sayfa Akıllı Yönlendirme Kartı */}
      {isTrainingActive && routeMismatch && activeStep && (
        <div className="tour-route-redirect-card">
          <Compass size={22} className="text-blue-600 shrink-0" />
          <div className="tour-route-redirect-info">
            <strong>Eğitime Devam Edelim</strong>
            <p>
              Bu adımı tamamlamak için <strong>{activeStep.expectedRoute}</strong> sayfasına dönelim.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (isRouteMatching(activeStep.expectedRoute, pathname)) {
                nextStep();
              } else {
                router.push(activeStep.expectedRoute);
              }
            }}
            className="tour-redirect-btn"
          >
            {isRouteMatching(activeStep.expectedRoute, pathname) ? "Adıma Başla" : "Oraya Git"} <ArrowRight size={14} />
          </Button>
          <button
            type="button"
            className="tour-close-mini"
            onClick={closeTraining}
            aria-label="Eğitimi Kapat"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 4. İnteraktif Rehber Kartı (Docked / Floating Card) */}
      {isTrainingActive && activeTrack && activeStep && !routeMismatch && (
        <aside
          className={`tour-guide-card ${isTopPosition ? "top-position" : ""}`}
          aria-label="İnteraktif Eğitim Rehberi"
        >
          {/* Üst Başlık & İlerleme */}
          <div className="tour-guide-header">
            <div className="tour-guide-meta">
              <span className="tour-track-pill">
                <GraduationCap size={13} /> {activeTrack.title}
              </span>
              <span className="tour-step-counter">
                Adım {activeStepIndex + 1}/{activeTrack.steps.length}
              </span>
              <span className={`tour-step-type-pill ${isActionStep ? "action" : "info"}`}>
                {isActionStep ? "İşlem" : "Bilgi"}
              </span>
            </div>
            <button
              type="button"
              onClick={closeTraining}
              className="tour-close-btn"
              title="Eğitimi Kapat"
              aria-label="Eğitimi Kapat"
            >
              <X size={15} />
            </button>
          </div>

          {/* İlerleme Çubuğu */}
          <div className="tour-progress-bar-wrap" aria-hidden="true">
            <div
              className="tour-progress-bar-fill"
              style={{
                width: `${((activeStepIndex + 1) / activeTrack.steps.length) * 100}%`,
              }}
            />
          </div>

          {/* İçerik */}
          <div className="tour-guide-body">
            {/* Konum Göstergesi */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/70 mb-2 w-fit">
              <Compass size={13} className="text-blue-600" />
              <span>
                Konum: {activeStep.expectedRoute === "/app" ? "Genel Bakış (Ana Panel)" : activeStep.expectedRoute.replace("/app/", "").toUpperCase()}
              </span>
            </div>

            <h4 className="tour-step-title">{activeStep.title}</h4>
            <p className="tour-step-instruction">{activeStep.instruction}</p>
            {activeStep.detail && (
              <p className="tour-step-detail">{activeStep.detail}</p>
            )}

            {/* Ne Yapılacak Açık İpucu Kutusu */}
            <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
              <span className="text-sm">👉</span>
              <span className="leading-relaxed">
                <strong>Ne yapmalısınız?</strong>{" "}
                {isActionStep
                  ? "Ekranda mavi ile vurgulanan öğeye tıklayın."
                  : 'Bilgiyi inceleyin ve aşağıdaki mavi "Sonraki →" butonuna basın.'}
              </span>
            </div>

            {activeStep.demoHint && (
              <div className="tour-demo-hint">
                <Sparkles size={14} className="text-amber-500 shrink-0" />
                <span>{activeStep.demoHint}</span>
              </div>
            )}

            {formErrorNotice && (
              <div className="tour-demo-hint !bg-rose-50 !border-rose-200 !text-rose-700">
                <AlertCircle size={14} className="text-rose-500 shrink-0" />
                <span>{formErrorNotice}</span>
              </div>
            )}

            {/* Durum Göstergesi: Arama veya Hedef Bulunamadı */}
            {status === "SEARCHING" && (
              <p className="tour-searching-hint">
                Hedef aranıyor… Lütfen bekleyin.
              </p>
            )}

            {status === "TARGET_NOT_FOUND" && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-sm">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-600" />
                  Hedef öğe arandı ancak görüntülenemedi
                </p>
                <p className="text-[11.5px] text-amber-700 mt-1 leading-relaxed">
                  Öğe bu ekranda farklı bir menüde olabilir. Eğitime kesintisiz devam etmek için adımı atlayabilirsiniz.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-sm"
                    onClick={skipStep}
                  >
                    Adımı Atla ve Devam Et <ArrowRight size={13} className="ml-1" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white text-slate-700 border-amber-300 hover:bg-amber-100"
                    onClick={() => {
                      setRetryKey((k) => k + 1);
                    }}
                  >
                    <RefreshCw size={12} className="mr-1" /> Yeniden Dene
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-slate-600 hover:bg-amber-100 hover:text-slate-900"
                    onClick={closeTraining}
                  >
                    Eğitimi Kapat
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Aksiyon Kontrolleri */}
          <div className="tour-guide-footer">
            <div className="tour-footer-left">
              {activeStepIndex > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevStep();
                  }}
                  className="tour-nav-btn"
                  title="Önceki Adım"
                  data-tour-action="prev"
                >
                  <ArrowLeft size={14} /> Geri
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  skipStep();
                }}
                className="tour-nav-btn secondary"
                title="Bu Adımı Geç"
                data-tour-action="skip"
              >
                <SkipForward size={14} /> Atla
              </button>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                nextStep();
              }}
              className="tour-action-btn"
              data-tour-action="next"
            >
              {activeStepIndex + 1 === activeTrack.steps.length ? (
                <>
                  Tamamla <CheckCircle2 size={14} />
                </>
              ) : (
                <>
                  Sonraki <ArrowRight size={14} />
                </>
              )}
            </Button>
          </div>
        </aside>
      )}

      {/* 5. Karşılama Modalı (Sıfır Kilitlenme / Zero Freeze Modal) */}
      {welcomeOpen && (
        <div
          className="tour-welcome-backdrop"
          onClick={dismissWelcome}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-welcome-title"
            className="tour-welcome-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="tour-welcome-close-btn"
              onClick={dismissWelcome}
              aria-label="Pencereyi kapat"
            >
              <X size={20} aria-hidden="true" />
            </button>

            <div className="tour-welcome-icon-box">
              <GraduationCap size={32} className="text-purple-600" />
            </div>

            <h2 id="tour-welcome-title" className="tour-welcome-title">
              SanayiPro&apos;yu Birlikte Öğrenelim
            </h2>

            <p className="tour-welcome-desc">
              Bir aracı servise kabul etmekten teslim etmeye kadar bütün işlemleri adım adım öğrenin.
            </p>

            <div className="tour-welcome-features">
              <div className="tour-welcome-feat">
                <span className="tour-welcome-feat-num">1</span>
                <div>
                  <strong>Gerçek Panelde Tıklayarak Öğrenin</strong>
                  <p>Pasif video izlemek yerine her adımı doğrudan tıklayarak gerçekleştirin.</p>
                </div>
              </div>
              <div className="tour-welcome-feat">
                <span className="tour-welcome-feat-num">2</span>
                <div>
                  <strong>İzole Demo Atölyesi</strong>
                  <p>Tüm işlemler eğitim servisi üzerinde çalışır; gerçek verilere asla karışmaz.</p>
                </div>
              </div>
              <div className="tour-welcome-feat">
                <span className="tour-welcome-feat-num">3</span>
                <div>
                  <strong>İstediğiniz An Sıfırlayın</strong>
                  <p>Eğitimi dilediğiniz zaman kapatabilir veya baştan başlatabilirsiniz.</p>
                </div>
              </div>
            </div>

            <div className="tour-welcome-actions">
              <Button
                type="button"
                size="lg"
                className="tour-welcome-primary"
                onClick={() => {
                  dismissWelcome();
                  startTrack("overview", 0);
                }}
              >
                <BookOpen size={17} /> Eğitime Başla
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={dismissWelcome}
              >
                Serbestçe Keşfet
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
