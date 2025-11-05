"use client";

import { useEffect } from "react";

/**
 * Suppresses known Excalidraw dev-only warnings that are harmless in production.
 * Excalidraw's internal gesture handlers can schedule state updates during render
 * in React 18, which triggers a warning but doesn't affect functionality.
 */
export function SuppressExcalidrawWarnings() {
  useEffect(() => {
    // No-op hook now – Excalidraw has its own guards and console overrides cause setState warnings.
  }, []);

  return null;
}
