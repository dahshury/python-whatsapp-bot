import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import * as React from "react";
import type { IColumnType } from "../interfaces/IColumnType";
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/IDataSource";

export class NumberColumnType implements IColumnType {
	id = "number";
	dataType = ColumnDataType.NUMBER;

	createCell(
		value: unknown,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		_isDarkTheme: boolean,
		_rowContext?: unknown,
	): GridCell {
		// If this is the age column and metadata requests wheel editor, emit custom cell
		try {
			const isAgeWheel =
				(column.id === "age" || column.name === "age") &&
				Boolean(
					column.metadata &&
						(column.metadata as { useWheel?: boolean }).useWheel,
				);
			if (isAgeWheel) {
				let parsed: number | null = null;
				if (typeof value === "number" && Number.isFinite(value)) parsed = value;
				else if (value !== null && value !== undefined && value !== "") {
					const n = Number(String(value));
					parsed = Number.isFinite(n) ? n : null;
				}
				const minRule = (column.validationRules || []).find(
					(r) => r.type === "min",
				);
				const maxRule = (column.validationRules || []).find(
					(r) => r.type === "max",
				);
				const min = Number(minRule?.value ?? 10);
				const max = Number(maxRule?.value ?? 120);
				const cell: GridCell = {
					kind: GridCellKind.Custom,
					data: {
						kind: "age-wheel-cell",
						value: parsed,
						display: parsed == null ? "" : String(parsed),
						min,
						max,
					},
					copyData: parsed == null ? "" : String(parsed),
					allowOverlay: true,
				};
				// Mark missing when required and no value so grid draws validation indicator and "None"
				if (column.isRequired && (parsed === null || parsed === undefined)) {
					(
						cell as { isMissingValue?: boolean; validationError?: string }
					).isMissingValue = true;
					(
						cell as { isMissingValue?: boolean; validationError?: string }
					).validationError = "";
				}
				return cell;
			}
		} catch {}

		// Preserve empty state for undefined/null/empty-string instead of coercing to 0
		let numValue: number | null;
		if (value === null || value === undefined || value === "") {
			numValue = null;
		} else if (typeof value === "number") {
			numValue = Number.isFinite(value) ? value : null;
		} else {
			const parsed = this.parseValue(String(value), column);
			numValue = Number.isNaN(parsed) ? null : parsed;
		}
		const displayValue = this.formatValue(numValue, column.formatting);

		const cell: GridCell = {
			kind: GridCellKind.Number,
			// Avoid null to satisfy GridCell typing; undefined means empty
			data: (numValue === null ? undefined : numValue) as number | undefined,
			displayData: displayValue,
			allowOverlay: true,
		};

		if (column.isRequired && (numValue === null || numValue === undefined)) {
			(cell as { isMissingValue?: boolean }).isMissingValue = true;
		}

		return cell;
	}

	getCellValue(cell: GridCell): unknown {
		// Support custom age wheel cells by extracting numeric value
		try {
			if (
				cell.kind === GridCellKind.Custom &&
				(typeof (cell as { data?: unknown }).data === "object" ||
					typeof (cell as { data?: unknown }).data === "function") &&
				(cell as { data?: { kind?: string } }).data &&
				(cell as { data?: { kind?: string } }).data?.kind === "age-wheel-cell"
			) {
				const raw = (cell as { data?: { value?: unknown } }).data?.value;
				return raw === undefined ? null : raw;
			}
		} catch {}
		const v = (cell as { data?: unknown }).data;
		return v === undefined ? null : v;
	}

	validateValue(
		value: unknown,
		column: IColumnDefinition,
	): { isValid: boolean; error?: string } {
		if (value === null || value === undefined || value === "") {
			// Missing value
			return column.isRequired
				? { isValid: false, error: "" }
				: { isValid: true };
		}
		const num = Number(value);

		if (Number.isNaN(num)) {
			return { isValid: false, error: "Must be a valid number" };
		}

		if (column.validationRules) {
			for (const rule of column.validationRules) {
				switch (rule.type) {
					case "min":
						if (rule.value !== undefined && num < Number(rule.value)) {
							return {
								isValid: false,
								error: rule.message || `Minimum value is ${Number(rule.value)}`,
							};
						}
						break;
					case "max":
						if (rule.value !== undefined && num > Number(rule.value)) {
							return {
								isValid: false,
								error: rule.message || `Maximum value is ${Number(rule.value)}`,
							};
						}
						break;
					case "custom":
						if (rule.validate && !rule.validate(String(num))) {
							return { isValid: false, error: rule.message || "Invalid value" };
						}
						break;
				}
			}
		}

		return { isValid: true };
	}

	formatValue(value: unknown, formatting?: IColumnFormatting): string {
		if (value === null || value === undefined || Number.isNaN(value as number))
			return "";

		const format = formatting?.type || "number";
		const locale =
			typeof formatting?.locale === "string" ? formatting.locale : undefined;
		const options = (formatting?.options || {}) as Record<string, unknown>;
		const minFD =
			typeof options.minimumFractionDigits === "number"
				? options.minimumFractionDigits
				: undefined;
		const maxFD =
			typeof options.maximumFractionDigits === "number"
				? options.maximumFractionDigits
				: undefined;
		const currency =
			typeof options.currency === "string" ? options.currency : undefined;
		const precision =
			typeof options.precision === "number" ? options.precision : undefined;

		switch (format) {
			case "currency":
				return new Intl.NumberFormat(locale, {
					style: "currency",
					currency: currency || "USD",
					minimumFractionDigits: minFD ?? 2,
					maximumFractionDigits: maxFD ?? 2,
				}).format(Number(value));

			case "percent":
				return new Intl.NumberFormat(locale, {
					style: "percent",
					minimumFractionDigits: minFD ?? 1,
					maximumFractionDigits: maxFD ?? 1,
				}).format(Number(value) / 100);

			case "scientific":
				return Number(value).toExponential(precision || 2);

			case "compact":
				return new Intl.NumberFormat(locale, {
					notation: "compact",
					minimumFractionDigits: minFD,
					maximumFractionDigits: maxFD,
				}).format(Number(value));

			default:
				return new Intl.NumberFormat(locale, {
					minimumFractionDigits: minFD ?? 0,
					maximumFractionDigits: maxFD ?? 2,
				}).format(Number(value));
		}
	}

	parseValue(input: string, _column: IColumnDefinition): number {
		const cleaned = input.replace(/[^\d.-]/g, "").trim();
		if (cleaned === "") return Number.NaN;
		const num = Number(cleaned);
		return num;
	}

	getDefaultValue(column: IColumnDefinition): unknown {
		return column.defaultValue ?? null;
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

	// Provide a simple numeric editor for the custom age wheel cell so edits persist
	provideEditor() {
		return {
			editor: (props: {
				value: GridCell;
				onChange: (cell: GridCell) => void;
				onFinishedEditing: (save: boolean) => void;
			}) => {
				const { value, onChange, onFinishedEditing } = props;
				try {
					const isAgeWheel =
						value.kind === GridCellKind.Custom &&
						(value as { data?: { kind?: string } }).data?.kind ===
							"age-wheel-cell";
					if (!isAgeWheel) return null;
					const data = (
						value as {
							data?: { value?: unknown; min?: number; max?: number };
						}
					).data as { value?: unknown; min?: number; max?: number };
					const current =
						typeof data?.value === "number" && Number.isFinite(data.value)
							? (data.value as number)
							: ("" as unknown as number);
					const min =
						typeof data?.min === "number" ? (data?.min as number) : 10;
					const max =
						typeof data?.max === "number" ? (data?.max as number) : 120;
					const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
						const num = e.target.value === "" ? null : Number(e.target.value);
						const newCell: GridCell = {
							kind: GridCellKind.Custom,
							data: {
								kind: "age-wheel-cell",
								value: num,
								display: num == null ? "" : String(num),
								min,
								max,
							},
							copyData: num == null ? "" : String(num),
							allowOverlay: true,
						};
						onChange(newCell);
					};
					const finish = () => onFinishedEditing(true);
					return React.createElement("input", {
						type: "number",
						min,
						max,
						value: current as unknown as number,
						onChange: handleChange,
						onBlur: finish,
						autoFocus: true,
						style: {
							width: "100%",
							height: "100%",
							boxSizing: "border-box",
							padding: "0.25rem",
							font: "inherit",
						},
					});
				} catch {
					return null;
				}
			},
		};
	}
}
