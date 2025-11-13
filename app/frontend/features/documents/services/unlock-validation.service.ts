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
  console.log("[UNLOCK VALIDATION] isGridCellValid called", {
    hasProvider: !!provider,
    columnIndex,
    rowIndex,
  });

  if (!provider || columnIndex < 0 || rowIndex < 0) {
    console.log("[UNLOCK VALIDATION] isGridCellValid: Invalid provider or indices");
    return false;
  }

  try {
    const cell = provider.getCell(columnIndex, rowIndex) as {
      isMissingValue?: boolean;
      validationError?: unknown;
      data?: unknown;
      displayData?: unknown;
    };

    console.log("[UNLOCK VALIDATION] Cell contents:", {
      columnIndex,
      hasCell: !!cell,
      data: cell?.data,
      displayData: cell?.displayData,
      isMissingValue: cell?.isMissingValue,
      validationError: cell?.validationError,
    });

    if (!cell) {
      console.log("[UNLOCK VALIDATION] isGridCellValid: No cell found");
      return false;
    }

    if (cell.isMissingValue === true) {
      console.log("[UNLOCK VALIDATION] isGridCellValid: Cell has isMissingValue=true");
      return false;
    }

    if (cell.validationError !== undefined && cell.validationError !== null) {
      console.log("[UNLOCK VALIDATION] isGridCellValid: Cell has validation error:", cell.validationError);
      return false;
    }

    console.log("[UNLOCK VALIDATION] isGridCellValid: Cell is VALID ✓");
    return true;
  } catch (error) {
    console.error("[UNLOCK VALIDATION] isGridCellValid: Exception:", error);
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

    console.log("[UNLOCK VALIDATION] validate() called", {
      waId,
      hasDataSource: !!customerDataSource,
      hasProvider: !!provider,
      pendingInitialLoadWaId,
      columns: customerColumns.map(c => c.id),
    });

    // For new customers, waId might be empty/default, but we can still validate
    // based on whether name and phone are filled
    const isNewCustomerScenario = !waId || waId === DEFAULT_DOCUMENT_WA_ID;
    
    console.log("[UNLOCK VALIDATION] Scenario:", {
      isNewCustomer: isNewCustomerScenario,
      waId,
      defaultWaId: DEFAULT_DOCUMENT_WA_ID,
    });

    // Find columns by id
    const nameCol = customerColumns.findIndex((c) => c.id === "name");
    const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

    console.log("[UNLOCK VALIDATION] Column indices:", { nameCol, phoneCol });

    if (nameCol === -1 || phoneCol === -1) {
      console.log("[UNLOCK VALIDATION] Name or phone column not found");
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

    console.log("[UNLOCK VALIDATION] Cell data values:", {
      nameVal,
      phoneVal,
      nameType: typeof nameVal,
      phoneType: typeof phoneVal,
    });

    const nameOk = typeof nameVal === "string" && nameVal.trim().length > 0;
    const phoneOk =
      typeof phoneVal === "string" && phoneVal.trim().startsWith("+");
    
    console.log("[UNLOCK VALIDATION] Value checks:", {
      nameOk,
      phoneOk,
    });

    console.log("[UNLOCK VALIDATION] Checking grid cell validity for NAME (col:", nameCol, ")");
    const gridNameValid = isGridCellValid(
      provider ?? null,
      nameCol,
      GRID_ROW_INDEX
    );
    
    console.log("[UNLOCK VALIDATION] Checking grid cell validity for PHONE (col:", phoneCol, ")");
    const gridPhoneValid = isGridCellValid(
      provider ?? null,
      phoneCol,
      GRID_ROW_INDEX
    );
    
    const isPendingInitialLoad = Boolean(
      pendingInitialLoadWaId && pendingInitialLoadWaId === waId
    );

    // For new customers (waId is default), we can unlock if name+phone are valid
    // For existing customers, we also need a valid waId
    const waIdOk = !isNewCustomerScenario;
    const shouldUnlock = Boolean(
      nameOk &&
        phoneOk &&
        gridNameValid &&
        gridPhoneValid &&
        !isPendingInitialLoad
    );

    console.log("[UNLOCK VALIDATION] FINAL VALIDATION RESULT:", {
      shouldUnlock,
      nameOk,
      phoneOk,
      waIdOk,
      gridNameValid,
      gridPhoneValid,
      isPendingInitialLoad,
      isNewCustomerScenario,
      formula: `${nameOk} && ${phoneOk} && ${gridNameValid} && ${gridPhoneValid} && !${isPendingInitialLoad} = ${shouldUnlock}`,
    });

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
