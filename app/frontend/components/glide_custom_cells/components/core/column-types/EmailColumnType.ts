import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import type { IColumnType } from "../interfaces/IColumnType";
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/IDataSource";

export class EmailColumnType implements IColumnType {
	id = "email";
	dataType = ColumnDataType.EMAIL;

	createCell(
		value: any,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		_isDarkTheme: boolean,
		_rowContext?: any,
	): GridCell {
		const email = this.formatValue(value, column.formatting);

		const cell: GridCell = {
			kind: GridCellKind.Uri,
			data: email ? `mailto:${email}` : "",
			displayData: email,
			allowOverlay: true,
			hoverEffect: true,
		};

		if (column.isRequired && !email) {
			(cell as any).isMissingValue = true;
			(cell as any).themeOverride = { linkColor: "#ef4444" };
		}

		return cell;
	}

	getCellValue(cell: GridCell): any {
		if (cell.kind === GridCellKind.Uri) {
			const data = (cell as any).displayData || "";
			return data.replace(/^mailto:/, "");
		}
		return "";
	}

	validateValue(
		value: any,
		column: IColumnDefinition,
	): { isValid: boolean; error?: string } {
		const email = String(value || "").trim();

		if (column.isRequired && !email) {
			return { isValid: false, error: "Email is required" };
		}

		if (email) {
			// Basic email validation regex
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return { isValid: false, error: "Invalid email format" };
			}

			// Additional validation rules
			if (column.validationRules) {
				for (const rule of column.validationRules) {
					if (rule.type === "pattern" && rule.value) {
						const regex = new RegExp(rule.value);
						if (!regex.test(email)) {
							return {
								isValid: false,
								error: rule.message || "Invalid email format",
							};
						}
					}
				}
			}
		}

		return { isValid: true };
	}

	formatValue(value: any, _formatting?: IColumnFormatting): string {
		if (!value) return "";

		let email = String(value).trim().toLowerCase();

		// Remove mailto: prefix if present
		email = email.replace(/^mailto:/, "");

		return email;
	}

	parseValue(input: string, _column: IColumnDefinition): any {
		return input.trim().toLowerCase();
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
