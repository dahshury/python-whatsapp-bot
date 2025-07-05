import { GridCellKind } from "@glideapps/glide-data-grid";
import type { PhoneInputCell } from "../PhoneInputCell";
import { customerAutoFillService } from "../services/CustomerAutoFillService";

export interface CreatePhoneInputCellOptions {
	phone?: string;
	displayPhone?: string;
	readonly?: boolean;
	countryCode?: string;
	isDarkTheme?: boolean;
	enableCustomerAutoFill?: boolean;
	rowIndex?: number;
}

export function createPhoneInputCell(
	options: CreatePhoneInputCellOptions = {},
): PhoneInputCell {
	const {
		phone = "",
		displayPhone,
		readonly = false,
		countryCode,
		isDarkTheme = false,
		enableCustomerAutoFill = true,
		rowIndex = 0,
	} = options;

	const onCustomerSelect = enableCustomerAutoFill
		? customerAutoFillService.createCustomerSelectHandler(rowIndex)
		: undefined;

	return {
		kind: GridCellKind.Custom,
		allowOverlay: !readonly,
		readonly,
		copyData: phone,
		data: {
			kind: "phone-input-cell",
			phone,
			displayPhone: displayPhone || phone,
			readonly,
			countryCode,
			isDarkTheme,
			onCustomerSelect,
		},
	};
}

export function createPhoneInputCellFromValue(
	value: string | null | undefined,
	options: Omit<CreatePhoneInputCellOptions, "phone"> = {},
): PhoneInputCell {
	return createPhoneInputCell({
		...options,
		phone: value || "",
	});
}

/**
 * Helper to configure the customer auto-fill service for a data table
 * Call this when initializing your data table editor
 */
export function configureCustomerAutoFill(
	onNameUpdate: (rowIndex: number, customerName: string) => void,
	phoneColumnId?: string,
	nameColumnId?: string,
) {
	customerAutoFillService.configure({
		phoneColumnId,
		nameColumnId,
		onNameUpdate,
	});
}
