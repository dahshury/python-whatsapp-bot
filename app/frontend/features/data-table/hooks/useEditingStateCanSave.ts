import type { RefObject } from "react";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";

type EditingState = {
  getNumRows?: () => number;
  getCell?: (colIndex: number, rowIndex: number) => unknown;
};

type ProviderLike = DataProvider & {
  getEditingState?: () => EditingState;
  getRowCount?: () => number;
  getColumnCount?: () => number;
  getColumnDefinition?: (c: number) => { isRequired?: boolean } | undefined;
  getCell?: (c: number, r: number) => unknown;
};

export type CheckState = { hasChanges: boolean; isValid: boolean };

export function computeCanSave(
  provider: ProviderLike | null | undefined,
  gridRowToEventMapRef:
    | RefObject<Map<number, unknown>>
    | { current?: Map<number, unknown> }
    | null
    | undefined,
  checkState: CheckState
): boolean {
  const hasChanges = Boolean(checkState?.hasChanges);
  const isValid = Boolean(checkState?.isValid);
  let canEnable = hasChanges && isValid;

  try {
    if (!canEnable) {
      return false;
    }
    if (!provider) {
      return canEnable;
    }

    const rowCount: number = provider.getRowCount?.() ?? 0;
    const colCount: number = provider.getColumnCount?.() ?? 0;
    const editingState = provider.getEditingState?.();
    const mappedRows = new Set<number>();
    try {
      const mapRef = gridRowToEventMapRef?.current as
        | Map<number, unknown>
        | undefined;
      if (mapRef && mapRef.size > 0) {
        for (const key of mapRef.keys()) {
          mappedRows.add(key);
        }
      }
    } catch (_err) {
      /* ignore map extraction errors */
    }

    const rowHasEdits = (rowIdx: number): boolean => {
      if (!editingState?.getCell) {
        return false;
      }
      for (let c = 0; c < colCount; c += 1) {
        const cell = editingState.getCell(c, rowIdx);
        if (cell !== undefined) {
          return true;
        }
      }
      return false;
    };

    const isRequiredCellMissing = (
      cell: unknown,
      colDef: { isRequired?: boolean }
    ): boolean => {
      if (!colDef?.isRequired) {
        return false;
      }
      if (!cell) {
        return true;
      }
      const gridCell = cell as {
        isMissingValue?: boolean;
        kind?: string;
        data?: unknown;
      };
      if (gridCell.isMissingValue === true) {
        return true;
      }
      const k = gridCell.kind;
      const data = (gridCell.data as Record<string, unknown>) || {};
      if (k === "Custom") {
        const kind = (data?.kind as string | undefined) || undefined;
        if (kind === "dropdown-cell") {
          return !data.value;
        }
        if (kind === "tempus-date-cell") {
          return !data.date;
        }
        if (kind === "timekeeper-cell") {
          return !data.time;
        }
      }
      if (k === "Text") {
        const textCell = cell as { data?: unknown };
        return !(textCell.data && String(textCell.data).trim());
      }
      return false;
    };

    for (let r = 0; r < rowCount; r += 1) {
      const isMapped = mappedRows.has(r);
      if (isMapped) {
        continue; // existing event row
      }
      if (!rowHasEdits(r)) {
        continue; // untouched template row
      }

      for (let c = 0; c < colCount; c += 1) {
        const colDef = provider.getColumnDefinition?.(c);
        if (!colDef?.isRequired) {
          continue;
        }
        const cell = provider.getCell?.(c, r);
        if (isRequiredCellMissing(cell, colDef)) {
          canEnable = false;
          break;
        }
      }
      if (!canEnable) {
        break;
      }
    }
  } catch (_err) {
    /* ignore evaluation failures and fall back to current flag */
  }
  return canEnable;
}

export function useEditingStateCanSave() {
  return { computeCanSave };
}
