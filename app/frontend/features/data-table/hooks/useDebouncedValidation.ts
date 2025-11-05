import type { RefObject } from "react";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import type { ValidationError } from "@/shared/libs/validation/areValidationErrorsEqual";

type ProviderForValidation = DataProvider & {
  getColumnDefinition?: (
    c: number
  ) => { id?: string; name?: string; title?: string } | undefined;
  getCell?: (c: number, r: number) => unknown;
};

const DEBOUNCE_VALIDATE_MS = 100;

export function useDebouncedValidation(params: {
  handleCheckEditingState: () => void;
  validateAllCells: () => {
    errors?: Array<{
      row: number;
      col: number;
      message: string;
      fieldName?: string;
    }>;
  };
  dataProviderRef: RefObject<ProviderForValidation | null>;
  setValidationErrors: (errors: ValidationError[]) => void;
}): () => () => void {
  const {
    handleCheckEditingState,
    validateAllCells,
    dataProviderRef,
    setValidationErrors,
  } = params;

  return () => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        handleCheckEditingState();
        try {
          const result = validateAllCells();
          const provider = dataProviderRef.current;
          const mapped = (result.errors || [])
            .map((err) => {
              let fieldName = (err as { fieldName?: string })?.fieldName;
              if (!fieldName && provider?.getColumnDefinition) {
                try {
                  const def = provider.getColumnDefinition(err.col);
                  fieldName = def?.id || def?.name || def?.title;
                } catch (_err) {
                  /* ignore column definition errors */
                }
              }
              return { ...err, fieldName } as ValidationError;
            })
            .filter((err) => {
              const fn = String(err.fieldName || "").toLowerCase();
              if (fn !== "scheduled_time") {
                return true;
              }
              try {
                const cell = provider?.getCell?.(err.col, err.row) as
                  | {
                      data?: {
                        kind?: string;
                        date?: unknown;
                      };
                    }
                  | undefined;
                const hasDate = Boolean(
                  cell &&
                    (cell as { data?: { kind?: string; date?: unknown } }).data
                      ?.kind === "tempus-date-cell" &&
                    (cell as { data?: { kind?: string; date?: unknown } }).data
                      ?.date
                );
                return !hasDate;
              } catch (_err) {
                return true;
              }
            });
          setValidationErrors(mapped);
        } catch (_err) {
          /* ignore validation mapping errors */
        }
        timeoutId = null;
      }, DEBOUNCE_VALIDATE_MS);
    };
  };
}
