"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, GitFork, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { track } from "@/lib/posthog/events";

const STORAGE_KEY = "wt_tutorial_seen_v1";
const GITHUB_URL = "https://github.com/westvegh/nextjs-workout-tracker";

interface Step {
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Try an example workout",
    body: (
      <p className="text-sm text-muted-foreground">
        Click one of the example workouts to try it out. We loaded three so you
        can feel the logger without signing up.
      </p>
    ),
  },
  {
    title: "Add your own exercises",
    body: (
      <p className="text-sm text-muted-foreground">
        Build a custom workout from the 2,000+ exercise library. Everything you
        create is saved locally in your browser until you sign up.
      </p>
    ),
  },
  {
    title: "Fork the repo when you're ready",
    body: (
      <p className="text-sm text-muted-foreground">
        Everything you see is open source. Fork on GitHub, swap in your own
        Supabase, and ship your workout app.
      </p>
    ),
  },
];

function subscribeStorage(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getSeenSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function getServerSeenSnapshot(): boolean {
  // Treat the tutorial as seen during SSR so it only appears after hydration.
  return true;
}

export function FirstVisitTutorial() {
  const seen = useSyncExternalStore(
    subscribeStorage,
    getSeenSnapshot,
    getServerSeenSnapshot
  );
  const [step, setStep] = useState(0);
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  const shownRef = useRef(false);

  const open = !seen && !manuallyDismissed;

  useEffect(() => {
    if (open && !shownRef.current) {
      shownRef.current = true;
      track.tutorialShown();
    }
  }, [open]);

  function persistSeen() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {
      // ignore
    }
  }

  function handleSkip() {
    track.tutorialDismissed(step);
    persistSeen();
    setManuallyDismissed(true);
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    track.tutorialCompleted();
    persistSeen();
    setManuallyDismissed(true);
  }

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tutorial"
    >
      <Card className="relative w-full max-w-md p-6">
        <button
          type="button"
          onClick={handleSkip}
          aria-label="Close tutorial"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </div>
        <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold tracking-tight">
          {current.title}
          {step === 0 ? (
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          ) : null}
        </h2>
        <div className="mt-3">{current.body}</div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {isLast ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track.forkClicked("tutorial")}
                >
                  <GitFork className="mr-1 h-4 w-4" />
                  Fork on GitHub
                </a>
              </Button>
            ) : null}
            <Button size="sm" onClick={handleNext}>
              {isLast ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
