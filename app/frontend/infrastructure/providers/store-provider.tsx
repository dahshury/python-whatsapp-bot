"use client";

import { type ReactNode, useEffect } from "react";
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
 * but we can add custom initialization logic here if needed
 */
function initializeStores() {
  if (typeof window === "undefined") {
    return;
  }

  // The persist middleware automatically rehydrates from localStorage
  // We just need to ensure stores are accessed once to trigger rehydration
  useSettingsStore.getState();
  useLanguageStore.getState();
}



