import { useCallback, useMemo } from "react";
import type { DataProvider } from "@/components/glide_custom_cells/components/core/services/DataProvider";
import { useGridValidation } from "@/components/glide_custom_cells/components/hooks/useGridValidation";
import { getValidationColumns } from "@/lib/constants/data-table-editor.constants";
import type { ValidationResult } from "@/types/data-table-editor";

export function useDataTableValidation(
	dataProviderRef: React.RefObject<DataProvider | null>,
	isRTL: boolean,
) {
	// Translation function
	const translateMessage = useCallback(
		(message: string) => {
			return message
				.replace(
					"Phone is required",
					isRTL ? "رقم الهاتف مطلوب" : "Phone number is required",
				)
				.replace(
					"Name is required",
					isRTL ? "اسم العميل مطلوب" : "Customer name is required",
				)
				.replace(
					"Date is required",
					isRTL ? "التاريخ مطلوب" : "Date is required",
				)
				.replace("Time is required", isRTL ? "الوقت مطلوب" : "Time is required")
				.replace(
					"Invalid phone number format",
					isRTL ? "صيغة رقم الهاتف غير صالحة" : "Invalid phone number format",
				)
				.replace(
					"Phone number must be between 8 and 15 digits",
					isRTL
						? "رقم الهاتف يجب أن يكون بين 8-15 رقمًا"
						: "Phone number must be between 8-15 digits",
				);
		},
		[isRTL],
	);

	const columns = useMemo(() => getValidationColumns(isRTL), [isRTL]);

	// Use the generic validation hook
	const {
		validateAllCells: baseValidateAllCells,
		getValidationState,
		hasUnsavedChanges,
	} = useGridValidation(dataProviderRef, columns as any, {
		translateMessage,
		validateOnlyChanged: false,
	});

	const validateAllCells = useCallback((): ValidationResult => {
		const result = baseValidateAllCells();
		return {
			isValid: result.isValid,
			errors: result.errors.map((err) => ({
				row: err.row,
				col: err.col,
				message: err.message,
			})),
		};
	}, [baseValidateAllCells]);

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
