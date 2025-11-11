import { type RefObject, useLayoutEffect, useState } from "react";
import type { IndexedPhoneOption } from "@/shared/libs/phone/indexed.types";
import {
  DROPDOWN_MAX_WIDTH_PX,
  DROPDOWN_MAX_WIDTH_VW_PERCENT,
  EMPTY_STATE_BADGE_PADDING_PX,
  EMPTY_STATE_BUTTON_EXTRA_PX,
  EMPTY_STATE_GAP_PX,
  EMPTY_STATE_ICON_SIZE_PX,
  EMPTY_STATE_PADDING_PX,
  EMPTY_STATE_SEARCH_ICON_SIZE_PX,
  FLAG_ICON_TOTAL_WIDTH_PX,
} from "@/shared/libs/phone/phone-combobox.config";

export type UseDropdownWidthOptions = {
  isOpen: boolean;
  orderedPhones: IndexedPhoneOption[];
  canCreateNew: boolean;
  addPreviewDisplay: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

/**
 * Hook to calculate dynamic dropdown width based on content
 * @param options - Configuration options for dropdown width calculation
 * @returns Calculated dropdown width or undefined
 */
export function useDropdownWidth(
  options: UseDropdownWidthOptions
): number | undefined {
  const { isOpen, orderedPhones, canCreateNew, addPreviewDisplay, triggerRef } =
    options;
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(
    undefined
  );

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    try {
      // Build a canvas context for fast text measurement
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      const bodyStyle = getComputedStyle(document.body);
      const fontFamily = bodyStyle.fontFamily || "ui-sans-serif, system-ui";
      const primaryFont = `600 14px ${fontFamily}`; // text-sm font-medium
      const secondaryFont = `400 14px ${fontFamily}`; // text-sm normal

      const measure = (text: string, font: string): number => {
        ctx.font = font;
        return Math.ceil(ctx.measureText(text || "").width);
      };

      let maxContent = 0;
      for (const opt of orderedPhones) {
        const primary = opt.name || opt.displayNumber || opt.number;
        const secondary = opt.displayNumber || opt.number;
        const primaryW = measure(primary, primaryFont);
        const secondaryW = measure(secondary, secondaryFont);
        // Include flag + gap on secondary line
        const secondaryTotal = secondaryW + FLAG_ICON_TOTAL_WIDTH_PX;
        const line = Math.max(primaryW, secondaryTotal);
        maxContent = Math.max(maxContent, line);
      }

      // Calculate minimum width for empty states (add new phone, no results, no data)
      let minEmptyStateWidth = 0;
      if (orderedPhones.length === 0) {
        const titleFont = `600 14px ${fontFamily}`; // font-semibold text-sm
        const descFont = `400 12px ${fontFamily}`; // text-xs
        const titleText = "Add new phone number";
        const descText =
          "We couldn't find this number. Create it to start tracking conversations.";

        if (canCreateNew) {
          // Use create-new state text
          const badgeText = addPreviewDisplay || "Enter a phone number";
          const buttonText = "Add number";
          const titleW = measure(titleText, titleFont);
          const descW = measure(descText, descFont);
          const badgeW =
            measure(badgeText, secondaryFont) + EMPTY_STATE_BADGE_PADDING_PX;
          const buttonW =
            measure(buttonText, secondaryFont) + EMPTY_STATE_BUTTON_EXTRA_PX;
          const emptyStateContent = Math.max(titleW, descW, badgeW, buttonW);
          minEmptyStateWidth =
            emptyStateContent +
            EMPTY_STATE_ICON_SIZE_PX +
            EMPTY_STATE_GAP_PX +
            EMPTY_STATE_PADDING_PX;
        } else {
          // Use no-results/no-data state text with constrained width (text wraps)
          // Cap at 280px to prevent overly wide dropdown
          const MAX_EMPTY_STATE_TEXT_WIDTH = 280;
          minEmptyStateWidth =
            MAX_EMPTY_STATE_TEXT_WIDTH +
            EMPTY_STATE_SEARCH_ICON_SIZE_PX +
            EMPTY_STATE_GAP_PX +
            EMPTY_STATE_PADDING_PX;
        }
      }

      // Account for paddings (px-3), internal gaps, potential scrollbar, and trailing check icon
      const H_PADDING = 24; // px-3 on both sides
      const CHECK_ICON = 28; // space for check icon at end
      const SCROLLBAR = 16; // guard for scrollbar / layout
      const INPUT_PADDING = 20; // breathing room for the input
      let computed =
        maxContent + H_PADDING + CHECK_ICON + SCROLLBAR + INPUT_PADDING;

      // Use minimum empty state width if applicable, otherwise respect trigger width
      const triggerW = triggerRef.current?.offsetWidth || 0;
      const minWidth = minEmptyStateWidth > 0 ? minEmptyStateWidth : triggerW;
      computed = Math.max(computed, minWidth);

      // Clamp to reasonable bounds so it is never too wide
      const MAX = Math.min(
        Math.floor(window.innerWidth * DROPDOWN_MAX_WIDTH_VW_PERCENT),
        DROPDOWN_MAX_WIDTH_PX
      ); // <= 35rem, <= 90vw
      computed = Math.min(computed, MAX);
      setDropdownWidth(computed);
    } catch {
      // Ignore errors when computing dropdown width
    }
  }, [isOpen, orderedPhones, canCreateNew, addPreviewDisplay, triggerRef]);

  return dropdownWidth;
}
