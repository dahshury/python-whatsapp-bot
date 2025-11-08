"use client";

import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import { cn } from "@/lib/utils";
import { i18n } from "@/shared/libs/i18n";
import { useAppShellVisibility } from "@/shared/ui/app-shell-visibility";
import { Button } from "@/shared/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Safely get locale preference - error boundaries may render outside LanguageProvider
 * Falls back to localStorage if context is unavailable
 */
function getIsLocalized(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stored = localStorage.getItem("locale");
    if (stored === "ar") {
      return true;
    }
    // Backward compatibility: migrate old isLocalized flag to locale
    const legacyIsLocalized = localStorage.getItem("isLocalized");
    if (legacyIsLocalized === "true") {
      return true;
    }
  } catch {
    // localStorage access failed
  }

  return false;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const { setShowShell } = useAppShellVisibility();

  // Safely get locale - error boundaries may render outside providers
  // Use Zustand store directly, fallback to localStorage if store not initialized
  const languageStore = useLanguageStore.getState();
  const isLocalized = useMemo(() => {
    // Prefer store if available
    if (languageStore?.isLocalized !== undefined) {
      return languageStore.isLocalized;
    }
    // Fallback to localStorage
    return getIsLocalized();
  }, [languageStore?.isLocalized]);

  // Ensure i18n is initialized with the correct language
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const locale = isLocalized ? "ar" : "en";
        i18n.changeLanguage(locale);
        document.documentElement.setAttribute("lang", locale);
      } catch {
        // ignore initialization errors
      }
    }
  }, [isLocalized]);

  useEffect(() => {
    setShowShell(false);
    return () => {
      setShowShell(true);
    };
  }, [setShowShell]);

  return (
    <section
      className={cn(
        "relative mx-auto flex min-h-[var(--doc-dvh,100dvh)] w-full max-w-4xl flex-1 items-center justify-center px-6 py-16"
      )}
    >
      <Empty className="w-full border border-border/60 border-dashed bg-background/80 p-8 shadow-sm backdrop-blur">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle
              aria-hidden="true"
              className="size-6 text-destructive"
            />
          </EmptyMedia>
          <EmptyTitle>
            {i18n.getMessage("global_error_title", isLocalized)}
          </EmptyTitle>
          <EmptyDescription>
            {i18n.getMessage("global_error_description", isLocalized)}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {error.digest ? (
            <p className="rounded-md border border-border/60 bg-card px-3 py-2 text-muted-foreground text-xs">
              {i18n.getMessage("global_error_reference", isLocalized)}{" "}
              <span className="font-medium text-foreground">
                {error.digest}
              </span>
            </p>
          ) : null}
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={reset} type="button">
              <RotateCcw aria-hidden="true" className="mr-2 size-4" />
              {i18n.getMessage("global_error_button_try_again", isLocalized)}
            </Button>
            <Button asChild className="flex-1" variant="outline">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/";
                }}
              >
                <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
                {i18n.getMessage(
                  "global_error_button_return_home",
                  isLocalized
                )}
              </a>
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </section>
  );
}
