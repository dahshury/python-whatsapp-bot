import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import {
	formatPhoneNumberIntl,
	isValidPhoneNumber,
	parsePhoneNumber,
} from "react-phone-number-input";
import type { PhoneInputCell } from "../../PhoneInputCell";
import { customerAutoFillService } from "../../services/CustomerAutoFillService";
import { messages } from "../../utils/i18n";
import type { IColumnType } from "../interfaces/IColumnType";
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/IDataSource";

export class PhoneColumnType implements IColumnType {
	id = "phone";
	dataType = ColumnDataType.PHONE;

	createCell(
		value: any,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		isDarkTheme: boolean,
		rowContext?: any,
	): GridCell {
		// Ensure phone is in E.164 format for storage
		const phone = this.parseValue(value, column);
		// Format only for display
		const displayPhone = this.formatValue(phone, column.formatting);

		// Get row index for customer auto-fill
		console.log("🔍 PhoneColumnType createCell - rowContext:", rowContext);
		const rowIndex = rowContext?.row ?? 0;
		console.log(
			"🔍 PhoneColumnType createCell - extracted rowIndex:",
			rowIndex,
		);

		// Create customer select handler for auto-fill functionality
		const onCustomerSelect =
			customerAutoFillService.createCustomerSelectHandler(rowIndex);

		const cell = {
			kind: GridCellKind.Custom,
			data: {
				kind: "phone-input-cell",
				phone: phone, // Store in E.164 format
				displayPhone: displayPhone, // Display formatted version
				isDarkTheme: isDarkTheme,
				onCustomerSelect: onCustomerSelect, // Add customer auto-fill callback
			},
			copyData: displayPhone,
			allowOverlay: true,
		} as PhoneInputCell;

		// Validate and store error details
		const validation = this.validateValue(phone, column);
		if (!validation.isValid) {
			(cell as any).isMissingValue = true;
			(cell as any).validationError = validation.error;
		}

		return cell;
	}

	getCellValue(cell: GridCell): any {
		if (
			cell.kind === GridCellKind.Custom &&
			(cell as any).data?.kind === "phone-input-cell"
		) {
			return (cell as any).data.phone;
		}
		return "";
	}

	validateValue(
		value: any,
		column: IColumnDefinition,
	): { isValid: boolean; error?: string } {
		const phoneNumber = String(value || "").trim();

		if (column.isRequired && !phoneNumber) {
			return {
				isValid: false,
				error: messages.validation.required(
					column.title || column.name || "Phone number",
				),
			};
		}

		if (phoneNumber) {
			try {
				// Use isValidPhoneNumber which is more robust
				if (!isValidPhoneNumber(phoneNumber)) {
					return { isValid: false, error: messages.validation.invalidPhone() };
				}
			} catch {
				// If isValidPhoneNumber throws an error, treat as invalid
				return { isValid: false, error: messages.validation.invalidPhone() };
			}
		}

		return { isValid: true };
	}

	formatValue(value: any, formatting?: IColumnFormatting): string {
		if (!value) return "";

		const phoneStr = String(value);

		// For display purposes, use proper international formatting
		if (formatting?.pattern === "display" && phoneStr.startsWith("+")) {
			try {
				const parsed = parsePhoneNumber(phoneStr);
				if (parsed) {
					return formatPhoneNumberIntl(phoneStr);
				}
			} catch {
				// If formatting fails, return original
				return phoneStr;
			}
		}

		// Return as-is if no formatting needed or if formatting fails
		return phoneStr;
	}

	parseValue(input: any, _column: IColumnDefinition): any {
		if (!input) return "";

		const inputStr = String(input).trim();

		// If already in E.164 format and valid, return as-is
		if (inputStr.startsWith("+")) {
			try {
				const parsed = parsePhoneNumber(inputStr);
				return parsed ? parsed.format("E.164") : inputStr;
			} catch {
				// If parsing fails, return the original string to avoid crashes
				return inputStr;
			}
		}

		// Try parsing without specifying a default country
		try {
			const parsed = parsePhoneNumber(inputStr);
			if (parsed) {
				return parsed.format("E.164");
			}
		} catch {
			// Final fallback - return original string to avoid crashes
			// The validation will mark it as invalid
		}

		// Return original input to avoid crashes - validation will handle marking as invalid
		return inputStr;
	}

	getDefaultValue(column: IColumnDefinition): any {
		return column.defaultValue || "";
	}

	canEdit(column: IColumnDefinition): boolean {
		return column.isEditable !== false;
	}

	createEditableCell(
		cell: GridCell,
		_column: IColumnDefinition,
	): EditableGridCell {
		return cell as EditableGridCell;
	}
}
