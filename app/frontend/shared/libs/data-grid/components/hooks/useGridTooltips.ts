"use client";

import type { RefObject } from "react";
import { useCallback, useRef, useState } from "react";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import { i18n } from "@/shared/libs/i18n";

export const TOOLTIP_DEBOUNCE_MS = 2000;

export const getRequiredCellTooltip = () => "⚠️ This field is required";

export type TooltipState = {
  content: string;
  left: number;
  top: number;
  fieldLabel?: string;
  message?: string;
  width?: number;
};

export type TooltipsReturn = {
  tooltip: TooltipState | undefined;
  clearTooltip: () => void;
  onItemHovered: (args: {
    kind: "header" | "cell";
    location?: [number, number];
    bounds?: { x: number; y: number; width: number; height: number };
  }) => void;
};

function hasTooltip(cell: unknown): cell is { tooltip: string } {
  return (
    !!cell &&
    typeof cell === "object" &&
    cell !== null &&
    typeof (cell as { tooltip?: unknown }).tooltip === "string"
  );
}

function isMissingValueCell(cell: unknown): boolean {
  return (
    !!cell &&
    typeof cell === "object" &&
    cell !== null &&
    (cell as { isMissingValue?: boolean }).isMissingValue === true
  );
}

function isErrorCell(cell: unknown): cell is { errorDetails: string } {
  return (
    !!cell &&
    typeof cell === "object" &&
    cell !== null &&
    (cell as { isError?: boolean; errorDetails?: unknown }).isError === true &&
    typeof (cell as { errorDetails?: unknown }).errorDetails === "string"
  );
}

const TRANSLATION_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.]*$/;
const MIN_TRANSLATION_KEY_LENGTH = 3;

/**
 * Translates a message if it looks like a translation key (e.g., "validation.phoneFormatNotRecognized" or "Validation.phoneFormatNotRecognized").
 * Returns the translated message if it's a key, otherwise returns the original message.
 */
function translateMessageIfKey(message: string, isLocalized: boolean): string {
  // Check if message looks like a translation key (contains dots and lowercase letters)
  // Pattern: "validation.phoneFormatNotRecognized" or "Validation.phoneFormatNotRecognized"
  const looksLikeKey =
    message.includes(".") &&
    TRANSLATION_KEY_PATTERN.test(message) &&
    message.length > MIN_TRANSLATION_KEY_LENGTH;

  if (looksLikeKey) {
    // Normalize the key (convert "Validation.phoneFormatNotRecognized" to "validation.phoneFormatNotRecognized")
    // Find the first dot and lowercase everything before it
    const firstDotIndex = message.indexOf(".");
    if (firstDotIndex > 0) {
      const prefix = message.substring(0, firstDotIndex).toLowerCase();
      const suffix = message.substring(firstDotIndex);
      const normalizedKey = prefix + suffix;

      const translated = i18n.getMessage(normalizedKey, isLocalized);
      // If translation found (different from key), return it
      if (translated !== normalizedKey) {
        return translated;
      }
    }
  }

  return message;
}

export type UseGridTooltipsOptions = {
  getCellContent: (cell: readonly [number, number]) => unknown;
  columns: Array<{ isRequired?: boolean; isEditable?: boolean; help?: string }>;
  validationErrors?: Array<{
    row: number;
    col: number;
    message: string;
    fieldName?: string;
  }>;
  getBoundsForCell?: (
    col: number,
    row: number
  ) => { x: number; y: number; width: number; height: number } | undefined;
  containerRef?: RefObject<HTMLElement | null>;
};

export function useGridTooltips(options: UseGridTooltipsOptions) {
  const { getCellContent, columns, validationErrors, getBoundsForCell } =
    options;
  const [tooltip, setTooltip] = useState<TooltipState | undefined>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isLocalized } = useLanguageStore();

  const clearTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setTooltip(undefined);
  }, []);

  const formatFieldLabel = useCallback(
    (field?: string): string => {
      const f = String(field || "").toLowerCase();
      if (!(isLocalized && f)) {
        return f;
      }
      const label = i18n.getMessage(`field_${f}`, isLocalized);
      return (
        label || f.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
      );
    },
    [isLocalized]
  );

  const onItemHovered = useCallback(
    (args: {
      kind: "header" | "cell";
      location?: [number, number];
      bounds?: { x: number; y: number; width: number; height: number };
    }) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setTooltip(undefined);

      if ((args.kind === "header" || args.kind === "cell") && !!args.location) {
        const colIdx = args.location[0];
        const rowIdx = args.location[1];
        let tooltipContent: string | undefined;
        let fieldLabel: string | undefined;
        let message: string | undefined;

        if (colIdx < 0 || colIdx >= columns.length) {
          return;
        }

        const column = columns[colIdx];

        if (args.kind === "header" && column) {
          tooltipContent = column.help as string | undefined;
        } else if (args.kind === "cell" && rowIdx >= 0) {
          try {
            const cell = getCellContent([colIdx, rowIdx]);

            // Check for validation errors first (highest priority)
            if (validationErrors && validationErrors.length > 0) {
              const cellValidationError = validationErrors.find(
                (error) => error.row === rowIdx && error.col === colIdx
              );
              if (cellValidationError) {
                fieldLabel = formatFieldLabel(cellValidationError.fieldName);
                message = translateMessageIfKey(
                  cellValidationError.message,
                  isLocalized
                );
                tooltipContent = fieldLabel
                  ? `${fieldLabel}: ${message}`
                  : message;
              }
            }

            // Fallback to cell-level errors
            if (!tooltipContent && isErrorCell(cell)) {
              message = translateMessageIfKey(cell.errorDetails, isLocalized);
              tooltipContent = message;
            }

            // Required field missing value
            if (
              !tooltipContent &&
              column &&
              !!column.isRequired &&
              !!column.isEditable &&
              isMissingValueCell(cell)
            ) {
              message = getRequiredCellTooltip();
              tooltipContent = message;
            }

            // Cell-specific tooltip
            if (!tooltipContent && hasTooltip(cell)) {
              const rawTooltip = (cell as { tooltip: string }).tooltip;
              message = translateMessageIfKey(rawTooltip, isLocalized);
              tooltipContent = message;
            }
          } catch {
            // ignore errors
          }
        }

        if (tooltipContent) {
          timeoutRef.current = setTimeout(() => {
            let bx: number | undefined;
            let by: number | undefined;
            let bw: number | undefined;
            if (getBoundsForCell && args.location) {
              const b = getBoundsForCell(args.location[0], args.location[1]);
              if (b) {
                bx = b.x;
                by = b.y;
                bw = b.width;
              }
            }
            // Fallback to event bounds
            if ((bx === undefined || by === undefined) && args.bounds) {
              bx = args.bounds.x;
              by = args.bounds.y;
              bw = args.bounds.width;
            }
            if (bx !== undefined && by !== undefined && tooltipContent) {
              // getBoundsForCell returns viewport coordinates (from getBoundingClientRect)
              // CSS transform handles centering (-50%) and vertical offset (calc(-100% - 8px))
              // So we position at the center-top of the cell
              setTooltip({
                content: tooltipContent,
                left: bx + (bw ?? 0) / 2, // Center horizontally
                top: by, // Top of cell (CSS will move it up)
                ...(fieldLabel && { fieldLabel }),
                ...(message && { message }),
                ...(bw && { width: bw }),
              });
            }
          }, TOOLTIP_DEBOUNCE_MS);
        }
      }
    },
    [
      columns,
      getCellContent,
      validationErrors,
      formatFieldLabel,
      getBoundsForCell,
      isLocalized,
    ]
  );

  return { tooltip, clearTooltip, onItemHovered };
}
