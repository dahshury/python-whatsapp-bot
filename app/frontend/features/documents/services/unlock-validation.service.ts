import type { IColumnDefinition, IDataSource } from "@/shared/libs/data-grid";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import { DEFAULT_DOCUMENT_WA_ID } from "@/shared/libs/documents";

export type UnlockValidationParams = {
  waId: string;
  customerDataSource: IDataSource;
  customerColumns: IColumnDefinition[];
  provider?: DataProvider | null;
  pendingInitialLoadWaId?: string | null;
};

export type UnlockValidationResult = {
  shouldUnlock: boolean;
  nameOk: boolean;
  phoneOk: boolean;
  waIdOk: boolean;
  gridNameValid: boolean;
  gridPhoneValid: boolean;
  isPendingInitialLoad: boolean;
};

const GRID_ROW_INDEX = 0;

/**
 * Determines whether a specific grid cell currently satisfies validation.
 * Falls back to `false` when provider information is unavailable.
 */
export function isGridCellValid(
  provider: DataProvider | null | undefined,
  columnIndex: number,
  rowIndex: number
): boolean {
  if (!provider || columnIndex < 0 || rowIndex < 0) {
    return false;
  }

  try {
    const cell = provider.getCell(columnIndex, rowIndex) as {
      isMissingValue?: boolean;
      validationError?: unknown;
    };

    if (!cell) {
      return false;
    }

    if (cell.isMissingValue === true) {
      return false;
    }

    if (cell.validationError !== undefined && cell.validationError !== null) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Service for validating document unlock conditions.
 * Requires non-empty valid name and phone (age optional).
 *
 * Business rules:
 * - nameOk: name must be a non-empty string after trimming
 * - phoneOk: phone must be a string starting with '+'
 * - waIdOk: waId must exist and not be the default document ID
 * - shouldUnlock: all three conditions must be true
 */
export const UnlockValidationService = {
  /**
   * Validates unlock conditions for a document.
   * @param params - Validation parameters
   * @returns Validation result
   */
  async validate(
    params: UnlockValidationParams
  ): Promise<UnlockValidationResult> {
    const {
      waId,
      customerDataSource,
      customerColumns,
      provider,
      pendingInitialLoadWaId,
    } = params;

    // Skip check if no customer selected (blank document)
    if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
      return {
        shouldUnlock: false,
        nameOk: false,
        phoneOk: false,
        waIdOk: false,
        gridNameValid: false,
        gridPhoneValid: false,
        isPendingInitialLoad: Boolean(
          pendingInitialLoadWaId && pendingInitialLoadWaId === waId
        ),
      };
    }

    const waIdOk = Boolean(waId && waId !== DEFAULT_DOCUMENT_WA_ID);

    // Find columns by id
    const nameCol = customerColumns.findIndex((c) => c.id === "name");
    const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

    if (nameCol === -1 || phoneCol === -1) {
      return {
        shouldUnlock: false,
        nameOk: false,
        phoneOk: false,
        waIdOk,
        gridNameValid: false,
        gridPhoneValid: false,
        isPendingInitialLoad: Boolean(
          pendingInitialLoadWaId && pendingInitialLoadWaId === waId
        ),
      };
    }

    const [nameVal, phoneVal] = await Promise.all([
      customerDataSource.getCellData(nameCol, 0),
      customerDataSource.getCellData(phoneCol, 0),
    ]);

    const nameOk = typeof nameVal === "string" && nameVal.trim().length > 0;
    const phoneOk =
      typeof phoneVal === "string" && phoneVal.trim().startsWith("+");
    const gridNameValid = isGridCellValid(
      provider ?? null,
      nameCol,
      GRID_ROW_INDEX
    );
    const gridPhoneValid = isGridCellValid(
      provider ?? null,
      phoneCol,
      GRID_ROW_INDEX
    );
    const isPendingInitialLoad = Boolean(
      pendingInitialLoadWaId && pendingInitialLoadWaId === waId
    );

    const shouldUnlock = Boolean(
      nameOk &&
        phoneOk &&
        waIdOk &&
        gridNameValid &&
        gridPhoneValid &&
        !isPendingInitialLoad
    );

    return {
      shouldUnlock,
      nameOk,
      phoneOk,
      waIdOk,
      gridNameValid,
      gridPhoneValid,
      isPendingInitialLoad,
    };
  },
};
