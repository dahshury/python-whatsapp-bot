import type React from "react";
import { useCallback, useMemo } from "react";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import type { BaseColumnProps } from "@/shared/libs/data-grid/components/core/types";
import { useGridValidation } from "@/shared/libs/data-grid/components/hooks/useGridValidation";
import { logger } from "@/shared/libs/logger";
import type { ValidationResult } from "@/widgets/data-table-editor/types";

const DEFAULT_COLUMN_WIDTH = 150;

export function useDataTableValidation(
  dataProviderRef: React.RefObject<DataProvider | null>
) {
  // Build column list using the provider's true order and flags; fallback to sensible defaults
  const columns: BaseColumnProps[] = useMemo(() => {
    const provider = dataProviderRef.current as
      | (DataProvider & {
          getColumnCount?: () => number;
          getColumnDefinition?: (c: number) => IColumnDefinition;
        })
      | null;
    try {
      const count = provider?.getColumnCount?.() ?? 0;
      if (count > 0 && provider?.getColumnDefinition) {
        const list: BaseColumnProps[] = [];
        for (let i = 0; i < count; i += 1) {
          const def = provider.getColumnDefinition(i) as IColumnDefinition;
          list.push({
            id: def?.id ?? def?.name ?? `col_${i}`,
            name: def?.name ?? def?.id ?? `col_${i}`,
            title: def?.title ?? def?.name ?? def?.id ?? `Column ${i}`,
            width: def?.width ?? DEFAULT_COLUMN_WIDTH,
            isEditable: def?.isEditable !== false,
            isHidden: def?.isHidden === true,
            isRequired: def?.isRequired === true,
            isPinned: def?.isPinned === true,
            isIndex: false,
            indexNumber: i,
            contentAlignment: "left",
            defaultValue: def?.defaultValue,
            columnTypeOptions: {},
          });
        }
        return list;
      }
    } catch (error) {
      logger.warn(
        "[useDataTableValidation] Failed to derive columns from provider definitions",
        error
      );
    }
    // Fallback order that mirrors getDataTableColumns
    const fallback = [
      { name: "scheduled_time", required: true },
      { name: "phone", required: true },
      { name: "type", required: true },
      { name: "name", required: true },
    ];
    return fallback.map((c, i) => ({
      id: c.name,
      name: c.name,
      title: c.name,
      width: DEFAULT_COLUMN_WIDTH,
      isEditable: true,
      isHidden: false,
      isRequired: Boolean(c.required),
      isPinned: false,
      isIndex: false,
      indexNumber: i,
      contentAlignment: "left",
      columnTypeOptions: {},
    }));
  }, [dataProviderRef.current]);

  // Use the generic validation hook
  const {
    validateAllCells: baseValidateAllCells,
    getValidationState,
    hasUnsavedChanges,
  } = useGridValidation(dataProviderRef, columns, {
    validateOnlyChanged: false,
  });

  const validateAllCells = useCallback((): ValidationResult => {
    const result = baseValidateAllCells();

    // Post-process to suppress false-positive scheduled_time required errors
    // by checking the actual cell value via the provider (ensures default is applied).
    const provider = dataProviderRef.current as {
      getColumnDefinition?: (c: number) => {
        id?: string;
        name?: string;
        title?: string;
        defaultValue?: unknown;
      };
      getCell?: (c: number, r: number) => unknown;
    } | null;

    const filtered = (result.errors || [])
      .map((err) => {
        let fieldName = (err as { fieldName?: string })?.fieldName;
        if (!fieldName && provider?.getColumnDefinition) {
          try {
            const def = provider.getColumnDefinition(err.col) as
              | {
                  id?: string;
                  name?: string;
                  title?: string;
                  defaultValue?: unknown;
                }
              | undefined;
            fieldName = def?.id || def?.name || def?.title;
          } catch (error) {
            logger.warn(
              "[useDataTableValidation] Unable to resolve column definition for validation error",
              error
            );
          }
        }
        return { ...err, fieldName } as typeof err & { fieldName?: string };
      })
      .filter((err) => {
        const fn = String(
          (err as { fieldName?: string }).fieldName || ""
        ).toLowerCase();
        if (fn !== "scheduled_time") {
          return true;
        }
        // Ensure the cell is realized; this will create a default cell if needed
        try {
          const cell = provider?.getCell?.(err.col, err.row) as
            | { data?: { kind?: string; date?: unknown } }
            | undefined;
          const hasDate = Boolean(
            cell &&
              (cell as { data?: { kind?: string; date?: unknown } }).data
                ?.kind === "tempus-date-cell" &&
              (cell as { data?: { kind?: string; date?: unknown } }).data?.date
          );
          return !hasDate;
        } catch {
          return true;
        }
      });

    return {
      isValid: filtered.length === 0,
      errors: filtered.map((err) => {
        const errWithField = err as { fieldName?: string };
        return {
          row: err.row,
          col: err.col,
          message: err.message,
          ...(errWithField.fieldName
            ? { fieldName: errWithField.fieldName }
            : {}),
        };
      }),
    };
  }, [baseValidateAllCells, dataProviderRef]);

  const checkEditingState = useCallback(() => {
    const state = getValidationState();

    if (!state.hasChanges) {
      return { hasChanges: false, isValid: false };
    }

    return { hasChanges: state.hasChanges, isValid: state.isValid };
  }, [getValidationState]);

  return {
    validateAllCells,
    checkEditingState,
    hasUnsavedChanges,
  };
}
