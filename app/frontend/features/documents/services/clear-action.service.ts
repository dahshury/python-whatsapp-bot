import type { IColumnDefinition, IDataSource } from "@/shared/libs/data-grid";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";

export type ClearActionParams = {
  customerDataSource: IDataSource;
  customerColumns: IColumnDefinition[];
  providerRef: {
    current: DataProvider | null;
  };
};

export type ClearActionResult = {
  name: string;
  age: number | null;
  phone: string;
};

/**
 * Service for clearing customer row data and resetting document state.
 * Handles grid data clearing and provider state management.
 */
export const ClearActionService = {
  /**
   * Clears customer row data (name, age, phone).
   * @param params - Clear action parameters
   * @returns Cleared values
   */
  async clearRow(params: ClearActionParams): Promise<ClearActionResult> {
    const { customerDataSource, customerColumns, providerRef } = params;

    const nameCol = customerColumns.findIndex((c) => c.id === "name");
    const ageCol = customerColumns.findIndex((c) => c.id === "age");
    const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

    // Clear editing state through provider to ensure grid immediately reflects
    providerRef.current?.setOnCellDataLoaded?.(() => {
      // Intentionally empty callback to clear editing state
    });

    const clearedRow: unknown[] = customerColumns.map((column) => {
      if (column.id === "age") {
        return null;
      }
      return "";
    });

    let resetApplied = false;
    try {
      const resettable = customerDataSource as unknown as {
        reset?: (columns: IColumnDefinition[], rows: unknown[][]) => void;
      };
      if (typeof resettable.reset === "function") {
        resettable.reset(customerColumns, [clearedRow]);
        resetApplied = true;
      }
    } catch {
      resetApplied = false;
    }

    if (!resetApplied) {
      await Promise.all([
        nameCol !== -1
          ? customerDataSource.setCellData(nameCol, 0, "")
          : Promise.resolve(),
        ageCol !== -1
          ? customerDataSource.setCellData(ageCol, 0, null)
          : Promise.resolve(),
        phoneCol !== -1
          ? customerDataSource.setCellData(phoneCol, 0, "")
          : Promise.resolve(),
      ]);
    }

    // Force grid refresh
    const provider = providerRef.current;
    if (provider) {
      try {
        provider.getEditingState().clearMemory();
      } catch {
        // Ignore editing state clear failures to avoid blocking clear flow
      }
      try {
        await provider.refresh();
      } catch {
        // Ignore refresh failures
      }
    }

    try {
      const gridApi = (
        window as unknown as {
          __docGridApi?: {
            updateCells?: (cells: { cell: [number, number] }[]) => void;
          };
        }
      ).__docGridApi;
      if (gridApi?.updateCells) {
        const updates = [nameCol, ageCol, phoneCol]
          .filter((col) => col !== -1)
          .map((col) => ({ cell: [col, 0] as [number, number] }));
        if (updates.length > 0) {
          gridApi.updateCells(updates);
        }
      }
    } catch {
      // Silently fail if grid update fails
    }

    // Set guard to ignore provider-applied loads for the next tick
    const PROVIDER_LOAD_GUARD_DURATION_MS = 500;
    const PROVIDER_LOAD_GUARD_CLEANUP_DELAY_MS = 600;
    try {
      (
        globalThis as unknown as { __docIgnoreProviderLoad?: number }
      ).__docIgnoreProviderLoad = Date.now() + PROVIDER_LOAD_GUARD_DURATION_MS;
      setTimeout(() => {
        try {
          const global = globalThis as unknown as {
            __docIgnoreProviderLoad?: number | undefined;
          };
          global.__docIgnoreProviderLoad = undefined;
        } catch {
          // Silently fail if cleanup fails
        }
      }, PROVIDER_LOAD_GUARD_CLEANUP_DELAY_MS);
    } catch {
      // Silently fail if guard setup fails
    }

    return {
      name: "",
      age: null,
      phone: "",
    };
  },
};
