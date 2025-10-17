import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import type {
	CreateCellOptions,
	IColumnType,
} from "../interfaces/i-column-type";
import {
	COLUMN_DATA_TYPE,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/i-data-source";

const MAILTO_REGEX = /^mailto:/;
const EMAIL_VALIDATION_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailColumnType implements IColumnType {
	id = "email";
	dataType = COLUMN_DATA_TYPE.EMAIL;

	createCell(options: CreateCellOptions): GridCell {
		const { value, column } = options;
		const email = this.formatValue(value, column.formatting);

		const cell: GridCell = {
			kind: GridCellKind.Uri,
			data: email ? `mailto:${email}` : "",
			displayData: email,
			allowOverlay: true,
			hoverEffect: true,
		};

		if (column.isRequired && !email) {
			(
				cell as {
					isMissingValue?: boolean;
					themeOverride?: { linkColor: string };
				}
			).isMissingValue = true;
			(
				cell as {
					isMissingValue?: boolean;
					themeOverride?: { linkColor: string };
				}
			).themeOverride = { linkColor: "#ef4444" };
		}

		return cell;
	}

	getCellValue(cell: GridCell): unknown {
		if (cell.kind === GridCellKind.Uri) {
			const data = (cell as { displayData?: string }).displayData || "";
			return data.replace(MAILTO_REGEX, "");
		}
		return "";
	}

	validateValue(
		value: unknown,
		column: IColumnDefinition
	): { isValid: boolean; error?: string } {
		const email = String(value || "").trim();

		if (column.isRequired && !email) {
			return { isValid: false, error: "Email is required" };
		}

		if (email) {
			const basicError = this.validateEmailBasic(email);
			if (basicError) {
				return basicError;
			}

			// Additional validation rules
			const rulesError = this.validateEmailRules(email, column.validationRules);
			if (rulesError) {
				return rulesError;
			}
		}

		return { isValid: true };
	}

	private validateEmailBasic(
		email: string
	): { isValid: boolean; error?: string } | null {
		// Basic email validation regex
		if (!EMAIL_VALIDATION_REGEX.test(email)) {
			return { isValid: false, error: "Invalid email format" };
		}
		return null;
	}

	private validateEmailRules(
		email: string,
		rules: IColumnDefinition["validationRules"]
	): { isValid: boolean; error?: string } | null {
		if (!rules) {
			return null;
		}

		for (const rule of rules) {
			if (rule.type === "pattern" && rule.value) {
				const regex = new RegExp(String(rule.value));
				if (!regex.test(email)) {
					return {
						isValid: false,
						error: rule.message || "Invalid email format",
					};
				}
			}
		}

		return null;
	}

	formatValue(value: unknown, _formatting?: IColumnFormatting): string {
		if (!value) {
			return "";
		}

		let email = String(value).trim().toLowerCase();

		// Remove mailto: prefix if present
		email = email.replace(MAILTO_REGEX, "");

		return email;
	}

	parseValue(input: string, _column: IColumnDefinition): unknown {
		return input.trim().toLowerCase();
	}

	getDefaultValue(column: IColumnDefinition): unknown {
		return column.defaultValue || "";
	}

	canEdit(column: IColumnDefinition): boolean {
		return column.isEditable !== false;
	}

	createEditableCell(
		cell: GridCell,
		_column: IColumnDefinition
	): EditableGridCell {
		// Convert URI cell to text cell for editing
		if (cell.kind === GridCellKind.Uri) {
			const email = this.getCellValue(cell);
			return {
				kind: GridCellKind.Text,
				data: email,
				displayData: email,
				allowOverlay: true,
			} as EditableGridCell;
		}
		return cell as EditableGridCell;
	}
}
