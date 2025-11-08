"use client";

import { type ReactNode, useEffect } from "react";
import { i18n } from "@/shared/libs/i18n";
import { useLanguageStore, useSettingsStore } from "../store/app-store";

/**
 * Store Provider - Initializes Zustand stores with persisted state
 *
 * This provider handles hydration of persisted stores on client-side mount
 * to prevent hydration mismatches in Next.js.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initializeStores();
  }, []);

  return children;
}

/**
 * Initialize stores with persisted values from localStorage
 * Zustand's persist middleware handles most of this automatically,
 * but we ensure language store properly initializes i18n
 */
function initializeStores() {
  if (typeof window === "undefined") {
    return;
  }

  // The persist middleware automatically rehydrates from localStorage
  // Access stores to trigger rehydration
  useSettingsStore.getState();
  const languageState = useLanguageStore.getState();

  // Ensure i18n is initialized with the current locale
  // This handles cases where the store was created before i18n was ready
  try {
    i18n.changeLanguage(languageState.locale === "ar" ? "ar" : "en");
    document.documentElement.setAttribute(
      "lang",
      languageState.locale === "ar" ? "ar" : "en"
    );
  } catch {
    // i18n may not be initialized yet, will be handled by store actions
  }
}
