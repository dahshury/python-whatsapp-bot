"use client";

import { useEffect } from "react";
import type { EventTypeColorConfig } from "@/entities/app-config";
import { useAppConfigQuery } from "@/features/app-config";

/**
 * Hook that applies event colors from app config to CSS variables in real-time.
 * Updates automatically when config changes (via React Query cache invalidation).
 */
export function useCalendarColorVariables() {
  const { data: appConfig } = useAppConfigQuery();

  useEffect(() => {
    if (!appConfig?.eventColors) {
      return;
    }

    const eventColors = appConfig.eventColors;
    const root = document.documentElement;

    // Apply event type colors
    const type0Colors = eventColors.eventColorByType["0"] as
      | EventTypeColorConfig
      | string
      | undefined;
    const type1Colors = eventColors.eventColorByType["1"] as
      | EventTypeColorConfig
      | string
      | undefined;
    const type2Colors = eventColors.eventColorByType["2"] as
      | EventTypeColorConfig
      | string
      | undefined;

    // Helper to normalize color config
    const normalizeColor = (
      value: EventTypeColorConfig | string | undefined,
      defaultBg: string,
      defaultBorder: string
    ): { bg: string; border: string } => {
      if (!value) {
        return { bg: defaultBg, border: defaultBorder };
      }
      if (typeof value === "string") {
        return { bg: defaultBg, border: value };
      }
      return { bg: value.background, border: value.border };
    };

    // Check-up (Type 0)
    const checkUp = normalizeColor(type0Colors, "#e2eee9", "#12b981");
    root.style.setProperty("--fc-reservation-type-0-bg", checkUp.bg);
    root.style.setProperty("--fc-reservation-type-0-border", checkUp.border);
    root.style.setProperty("--fc-reservation-type-0-text", checkUp.border);
    root.style.setProperty("--fc-reservation-type-0-bg-grad-end", checkUp.bg);

    // Follow-up (Type 1)
    const followUp = normalizeColor(type1Colors, "#e2e8f4", "#3c82f6");
    root.style.setProperty("--fc-reservation-type-1-bg", followUp.bg);
    root.style.setProperty("--fc-reservation-type-1-border", followUp.border);
    root.style.setProperty("--fc-reservation-type-1-text", followUp.border);
    root.style.setProperty("--fc-reservation-type-1-bg-grad-end", followUp.bg);

    // Conversation (Type 2)
    const conversation = normalizeColor(type2Colors, "#edae49", "#edae49");
    root.style.setProperty("--fc-conversation-bg", conversation.bg);
    root.style.setProperty("--fc-conversation-border", conversation.border);

    // Document stroke color (single color for both light and dark mode)
    const documentStroke = eventColors.documentStrokeColor ?? "#facc15";
    root.style.setProperty("--fc-document-stroke-color", documentStroke);

    // Cleanup function to reset to defaults when config changes or component unmounts
    return () => {
      root.style.removeProperty("--fc-reservation-type-0-bg");
      root.style.removeProperty("--fc-reservation-type-0-border");
      root.style.removeProperty("--fc-reservation-type-0-text");
      root.style.removeProperty("--fc-reservation-type-0-bg-grad-end");
      root.style.removeProperty("--fc-reservation-type-1-bg");
      root.style.removeProperty("--fc-reservation-type-1-border");
      root.style.removeProperty("--fc-reservation-type-1-text");
      root.style.removeProperty("--fc-reservation-type-1-bg-grad-end");
      root.style.removeProperty("--fc-conversation-bg");
      root.style.removeProperty("--fc-conversation-border");
      root.style.removeProperty("--fc-document-stroke-color");
    };
  }, [appConfig?.eventColors]);
}
