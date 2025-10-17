import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import { createElement } from "react";
import type {
	CreateCellOptions,
	IColumnType,
} from "../interfaces/i-column-type";
import {
	COLUMN_DATA_TYPE,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/i-data-source";

// Magic number constants for age wheel editor
const AGE_WHEEL_MIN_DEFAULT = 10;
const AGE_WHEEL_MAX_DEFAULT = 120;
const PERCENT_DIVISOR = 100;

export class NumberColumnType implements IColumnType {
	id = "number";
	dataType = COLUMN_DATA_TYPE.NUMBER;

	createCell(options: CreateCellOptions): GridCell {
		const { value, column } = options;
		// If this is the age column and metadata requests wheel editor, emit custom cell
		try {
			const ageWheelCell = this.createAgeWheelCell(value, column);
			if (ageWheelCell) {
				return ageWheelCell;
			}
		} catch {
			// Silently fail if age wheel cell creation fails
		}

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

	private createAgeWheelCell(
		value: unknown,
		column: IColumnDefinition
	): GridCell | null {
		const isAgeWheel =
			(column.id === "age" || column.name === "age") &&
			Boolean(
				column.metadata && (column.metadata as { useWheel?: boolean }).useWheel
			);
		if (!isAgeWheel) {
			return null;
		}

		let parsed: number | null = null;
		if (typeof value === "number" && Number.isFinite(value)) {
			parsed = value;
		} else if (value !== null && value !== undefined && value !== "") {
			const n = Number(String(value));
			parsed = Number.isFinite(n) ? n : null;
		}

		const { min, max } = this.getAgeWheelMinMax(column);
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

		return this.markAgeWheelCellValidation(cell, parsed, column);
	}

	private getAgeWheelMinMax(column: IColumnDefinition): {
		min: number;
		max: number;
	} {
		const minRule = (column.validationRules || []).find(
			(r) => r.type === "min"
		);
		const maxRule = (column.validationRules || []).find(
			(r) => r.type === "max"
		);
		return {
			min: Number(minRule?.value ?? AGE_WHEEL_MIN_DEFAULT),
			max: Number(maxRule?.value ?? AGE_WHEEL_MAX_DEFAULT),
		};
	}

	private markAgeWheelCellValidation(
		cell: GridCell,
		parsed: number | null,
		column: IColumnDefinition
	): GridCell {
		// Mark missing so grid renders placeholder styling (without validation indicator due to not required)
		if (parsed == null) {
			(
				cell as { isMissingValue?: boolean; validationError?: string }
			).isMissingValue = true;
		}
		// Mark missing when required and no value so grid draws validation indicator
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
		} catch {
			// Silently fail if age wheel cell extraction fails
		}
		const v = (cell as { data?: unknown }).data;
		return v === undefined ? null : v;
	}

	validateValue(
		value: unknown,
		column: IColumnDefinition
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
			const rulesError = this.validateNumberRules(num, column.validationRules);
			if (rulesError) {
				return rulesError;
			}
		}

		return { isValid: true };
	}

	private validateNumberRules(
		num: number,
		rules: IColumnDefinition["validationRules"]
	): { isValid: boolean; error?: string } | null {
		if (!rules) {
			return null;
		}

		for (const rule of rules) {
			let ruleError: { isValid: boolean; error?: string } | null = null;

			switch (rule.type) {
				case "min":
					ruleError = this.validateNumberMin(num, rule);
					break;
				case "max":
					ruleError = this.validateNumberMax(num, rule);
					break;
				case "custom":
					ruleError = this.validateNumberCustom(num, rule);
					break;
				default:
					// Unknown rule type - skip
					break;
			}

			if (ruleError) {
				return ruleError;
			}
		}

		return null;
	}

	private validateNumberMin(
		num: number,
		rule: unknown
	): { isValid: boolean; error?: string } | null {
		const ruleObj = rule as { value?: unknown; message?: string };
		if (ruleObj.value !== undefined && num < Number(ruleObj.value)) {
			return {
				isValid: false,
				error: ruleObj.message || `Minimum value is ${Number(ruleObj.value)}`,
			};
		}
		return null;
	}

	private validateNumberMax(
		num: number,
		rule: unknown
	): { isValid: boolean; error?: string } | null {
		const ruleObj = rule as { value?: unknown; message?: string };
		if (ruleObj.value !== undefined && num > Number(ruleObj.value)) {
			return {
				isValid: false,
				error: ruleObj.message || `Maximum value is ${Number(ruleObj.value)}`,
			};
		}
		return null;
	}

	private validateNumberCustom(
		num: number,
		rule: unknown
	): { isValid: boolean; error?: string } | null {
		const ruleObj = rule as {
			validate?: (val: string) => boolean;
			message?: string;
		};
		if (ruleObj.validate && !ruleObj.validate(String(num))) {
			return { isValid: false, error: ruleObj.message || "Invalid value" };
		}
		return null;
	}

	formatValue(value: unknown, formatting?: IColumnFormatting): string {
		if (
			value === null ||
			value === undefined ||
			Number.isNaN(value as number)
		) {
			return "";
		}

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

		return this.formatNumberByType(format, {
			value: Number(value),
			...(locale !== undefined && { locale }),
			...(minFD !== undefined && { minFD }),
			...(maxFD !== undefined && { maxFD }),
			...(currency !== undefined && { currency }),
			...(precision !== undefined && { precision }),
		});
	}

	private formatNumberByType(
		format: string,
		options: {
			value: number;
			locale?: string;
			minFD?: number;
			maxFD?: number;
			currency?: string;
			precision?: number;
		}
	): string {
		switch (format) {
			case "currency":
				return new Intl.NumberFormat(options.locale, {
					style: "currency",
					currency: options.currency || "USD",
					minimumFractionDigits: options.minFD ?? 2,
					maximumFractionDigits: options.maxFD ?? 2,
				}).format(options.value);

			case "percent":
				return new Intl.NumberFormat(options.locale, {
					style: "percent",
					minimumFractionDigits: options.minFD ?? 1,
					maximumFractionDigits: options.maxFD ?? 1,
				}).format(options.value / PERCENT_DIVISOR);

			case "scientific":
				return options.value.toExponential(options.precision || 2);

			case "compact":
				return new Intl.NumberFormat(options.locale, {
					notation: "compact",
					minimumFractionDigits: options.minFD,
					maximumFractionDigits: options.maxFD,
				}).format(options.value);

			default:
				return new Intl.NumberFormat(options.locale, {
					minimumFractionDigits: options.minFD ?? 0,
					maximumFractionDigits: options.maxFD ?? 2,
				}).format(options.value);
		}
	}

	parseValue(input: string, _column: IColumnDefinition): number {
		const cleaned = input.replace(/[^\d.-]/g, "").trim();
		if (cleaned === "") {
			return Number.NaN;
		}
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
		_column: IColumnDefinition
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
					if (!isAgeWheel) {
						return null;
					}
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
						typeof data?.min === "number"
							? (data?.min as number)
							: AGE_WHEEL_MIN_DEFAULT;
					const max =
						typeof data?.max === "number"
							? (data?.max as number)
							: AGE_WHEEL_MAX_DEFAULT;
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
					return createElement("input", {
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
