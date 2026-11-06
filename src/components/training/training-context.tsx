"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  TRAINING_TRACKS,
  INITIAL_TRAINING_PROGRESS,
  isRouteMatching,
  type TrainingTrack,
  type TrainingTrackId,
  type TrainingStep,
} from "@/lib/training-data";
import { useLocalRepository } from "@/lib/local-repository";

interface TrainingContextType {
  activeTrackId: TrainingTrackId | null;
  activeTrack: TrainingTrack | null;
  activeStepIndex: number;
  activeStep: TrainingStep | null;
  isTrainingActive: boolean;
  progress: typeof INITIAL_TRAINING_PROGRESS;
  feedbackMessage: string | null;
  welcomeOpen: boolean;
  setWelcomeOpen: (open: boolean) => void;
  dismissWelcome: () => void;
  startTrack: (trackId: TrainingTrackId, stepIndex?: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  closeTraining: () => void;
  resetTrainingProgress: () => void;
  resetAllDemoData: () => void;
}

const TrainingContext = createContext<TrainingContextType | null>(null);

export function TrainingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [activeTrackId, setActiveTrackId] = useLocalRepository<TrainingTrackId | null>(
    "training-active-track-id",
    null,
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const isTransitioningRef = useRef(false);

  const [progress, setProgress] = useLocalRepository(
    "training-progress",
    INITIAL_TRAINING_PROGRESS,
  );

  const [welcomeDismissed, setWelcomeDismissed] = useLocalRepository(
    "training-welcome-dismissed",
    false,
  );

  const [welcomeOpen, setWelcomeOpen] = useState(false);

  // Single source of truth: activeStepIndex is strictly derived from progress
  const activeStepIndex = useMemo(() => {
    if (!activeTrackId) return 0;
    return progress[activeTrackId]?.currentStepIndex ?? 0;
  }, [activeTrackId, progress]);

  // Auto-show welcome dialog if user is on /app (desktop) and hasn't dismissed yet
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return;
    }
    if (!welcomeDismissed && pathname === "/app" && !activeTrackId) {
      const timer = setTimeout(() => {
        setWelcomeOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [welcomeDismissed, pathname, activeTrackId]);

  const activeTrack = useMemo(() => {
    if (!activeTrackId) return null;
    return TRAINING_TRACKS.find((t) => t.id === activeTrackId) ?? null;
  }, [activeTrackId]);

  const activeStep = useMemo(() => {
    if (!activeTrack) return null;
    return activeTrack.steps[activeStepIndex] ?? null;
  }, [activeTrack, activeStepIndex]);

  const dismissWelcome = useCallback(() => {
    setWelcomeOpen(false);
    setWelcomeDismissed(true);
    if (typeof document !== "undefined") {
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
      document.body.removeAttribute("data-scroll-locked");
      const hiddenEls = document.querySelectorAll('[aria-hidden="true"]');
      hiddenEls.forEach((el) => {
        if (!el.classList.contains("sr-only")) {
          el.removeAttribute("aria-hidden");
        }
      });
    }
  }, [setWelcomeDismissed]);

  const startTrack = useCallback(
    (trackId: TrainingTrackId, stepIndex = 0) => {
      const track = TRAINING_TRACKS.find((t) => t.id === trackId);
      if (!track) return;

      if (process.env.NODE_ENV !== "production") {
        console.log(`[SanayiPro Training] startTrack: track=${trackId}, step=${stepIndex}`);
      }

      // Unblock and dismiss welcome modal
      setWelcomeOpen(false);
      setWelcomeDismissed(true);
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
        document.body.removeAttribute("data-scroll-locked");
      }

      setActiveTrackId(trackId);

      const firstStep = track.steps[stepIndex];
      if (
        firstStep &&
        firstStep.expectedRoute &&
        !isRouteMatching(firstStep.expectedRoute, pathname) &&
        !firstStep.expectedRoute.includes("[id]") &&
        !firstStep.targetSelector.includes("nav-") &&
        !firstStep.targetSelector.includes("global-search") &&
        !firstStep.targetSelector.includes("quick-actions") &&
        !firstStep.targetSelector.includes("branch-selector") &&
        !firstStep.targetSelector.includes("notifications")
      ) {
        router.push(firstStep.expectedRoute);
      }

      setProgress((prev) => ({
        ...prev,
        [trackId]: {
          status: "in_progress",
          currentStepIndex: stepIndex,
        },
      }));
    },
    [pathname, router, setProgress, setActiveTrackId, setWelcomeDismissed],
  );

  const nextStep = useCallback(() => {
    if (!activeTrack) return;
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 280);

    const nextIndex = activeStepIndex + 1;
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[SanayiPro Training] nextStep: track=${activeTrack.id}, step=${activeStepIndex + 1} -> ${nextIndex + 1}/${activeTrack.steps.length}`,
      );
    }

    if (activeStep?.successMessage) {
      setFeedbackMessage(activeStep.successMessage);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }

    if (nextIndex < activeTrack.steps.length) {
      const nextStepObj = activeTrack.steps[nextIndex];

      setProgress((prev) => ({
        ...prev,
        [activeTrack.id]: {
          status: "in_progress",
          currentStepIndex: nextIndex,
        },
      }));

      if (
        nextStepObj.expectedRoute &&
        !isRouteMatching(nextStepObj.expectedRoute, pathname) &&
        !nextStepObj.expectedRoute.includes("[id]") &&
        !nextStepObj.targetSelector.includes("nav-") &&
        !nextStepObj.targetSelector.includes("global-search") &&
        !nextStepObj.targetSelector.includes("quick-actions") &&
        !nextStepObj.targetSelector.includes("branch-selector") &&
        !nextStepObj.targetSelector.includes("notifications")
      ) {
        router.push(nextStepObj.expectedRoute);
      }
    } else {
      // Completed track
      setProgress((prev) => ({
        ...prev,
        [activeTrack.id]: {
          status: "completed",
          currentStepIndex: activeTrack.steps.length - 1,
          completedAt: new Date().toLocaleDateString("tr-TR"),
        },
      }));

      setFeedbackMessage(`Tebrikler! "${activeTrack.title}" eğitimini tamamladınız.`);
      setTimeout(() => setFeedbackMessage(null), 4000);

      // Advance to next track if available
      const currentTrackIndex = TRAINING_TRACKS.findIndex((t) => t.id === activeTrack.id);
      if (currentTrackIndex + 1 < TRAINING_TRACKS.length) {
        const nextTrack = TRAINING_TRACKS[currentTrackIndex + 1];
        setActiveTrackId(nextTrack.id);
        setProgress((prev) => ({
          ...prev,
          [nextTrack.id]: {
            status: "in_progress",
            currentStepIndex: 0,
          },
        }));
        if (
          nextTrack.steps[0]?.expectedRoute &&
          pathname !== nextTrack.steps[0].expectedRoute &&
          !nextTrack.steps[0].targetSelector.includes("nav-") &&
          !nextTrack.steps[0].targetSelector.includes("global-search") &&
          !nextTrack.steps[0].targetSelector.includes("quick-actions")
        ) {
          router.push(nextTrack.steps[0].expectedRoute);
        }
      } else {
        setActiveTrackId(null);
      }
    }
  }, [activeTrack, activeStep, activeStepIndex, pathname, router, setProgress, setActiveTrackId]);

  const prevStep = useCallback(() => {
    if (!activeTrack || activeStepIndex <= 0) return;
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 280);

    const prevIndex = activeStepIndex - 1;
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[SanayiPro Training] prevStep: track=${activeTrack.id}, step=${activeStepIndex + 1} -> ${prevIndex + 1}/${activeTrack.steps.length}`,
      );
    }

    const prevStepObj = activeTrack.steps[prevIndex];

    setProgress((prev) => ({
      ...prev,
      [activeTrack.id]: {
        status: "in_progress",
        currentStepIndex: prevIndex,
      },
    }));

    if (
      prevStepObj.expectedRoute &&
      !isRouteMatching(prevStepObj.expectedRoute, pathname) &&
      !prevStepObj.expectedRoute.includes("[id]") &&
      !prevStepObj.targetSelector.includes("nav-") &&
      !prevStepObj.targetSelector.includes("global-search") &&
      !prevStepObj.targetSelector.includes("quick-actions") &&
      !prevStepObj.targetSelector.includes("branch-selector") &&
      !prevStepObj.targetSelector.includes("notifications")
    ) {
      router.push(prevStepObj.expectedRoute);
    }
  }, [activeTrack, activeStepIndex, pathname, router, setProgress]);

  const skipStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const closeTraining = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[SanayiPro Training] Training closed");
    }
    setActiveTrackId(null);
    setFeedbackMessage(null);
    if (typeof document !== "undefined") {
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
      document.body.removeAttribute("data-scroll-locked");
      document.body.classList.remove("tour-mobile-open");
      const targetEls = document.querySelectorAll('[data-tour-active-target="true"]');
      targetEls.forEach((el) => el.removeAttribute("data-tour-active-target"));
      const hiddenEls = document.querySelectorAll('[aria-hidden="true"]');
      hiddenEls.forEach((el) => {
        if (!el.classList.contains("sr-only") && !el.getAttribute("data-radix-focus-guard")) {
          el.removeAttribute("aria-hidden");
        }
      });
    }
  }, [setActiveTrackId]);

  const resetTrainingProgress = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[SanayiPro Training] Resetting training progress");
    }
    setProgress(INITIAL_TRAINING_PROGRESS);
    setActiveTrackId(null);
    setWelcomeDismissed(false);
  }, [setProgress, setActiveTrackId, setWelcomeDismissed]);

  const resetAllDemoData = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith("sanayipro:v1:") || key.startsWith("sanayipro:"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      }
    } catch {}
    setProgress(INITIAL_TRAINING_PROGRESS);
    setActiveTrackId(null);
    setWelcomeDismissed(false);
    if (typeof window !== "undefined") {
      const basePath = process.env.NODE_ENV === "production" ? "/sanayipro" : "";
      window.location.replace(`${window.location.origin}${basePath}/app/`);
    }
  }, [setProgress, setActiveTrackId, setWelcomeDismissed]);

  return (
    <TrainingContext.Provider
      value={{
        activeTrackId,
        activeTrack,
        activeStepIndex,
        activeStep,
        isTrainingActive: Boolean(activeTrackId && activeStep),
        progress,
        feedbackMessage,
        welcomeOpen,
        setWelcomeOpen,
        dismissWelcome,
        startTrack,
        nextStep,
        prevStep,
        skipStep,
        closeTraining,
        resetTrainingProgress,
        resetAllDemoData,
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error("useTraining must be used within TrainingProvider");
  }
  return context;
}
