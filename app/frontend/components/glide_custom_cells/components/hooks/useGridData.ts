import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type GridColumn,
	type Item,
	type Theme,
} from "@glideapps/glide-data-grid";
import React from "react";
import { EditingState } from "../models/EditingState";

import { FormattingService } from "../services/FormattingService";
import type { TempusDateCell } from "../TempusDominusDateCell";
import type { TimekeeperCell } from "../TimekeeperCell";
import { messages } from "../utils/i18n";

const validateNameField = (
	text: string,
): { isValid: boolean; correctedValue?: string; errorMessage?: string } => {
	// Empty input check
	if (!text || text.trim() === "") {
		return { isValid: false, errorMessage: messages.validation.nameRequired() };
	}

	// 1) Coerce – strip everything that is NOT a Unicode letter, space, or hyphen
	const cleaned = text
		.replace(/[^\p{L}\s-]/gu, "")
		.replace(/\s+/g, " ")
		.trim();

	// 2) Split into words
	let words = cleaned.split(/[\s-]+/).filter(Boolean);

	// 3) Validation rules
	// Each word ≥ 2 chars
	if (words.some((w) => w.length < 2)) {
		return {
			isValid: false,
			errorMessage: messages.validation.nameWordsTooShort(),
		};
	}

	// At least two words
	if (words.length < 2) {
		if (words.length === 1 && words[0] && words[0].length >= 2) {
			words.push("Doe"); // add placeholder last name
		} else {
			return {
				isValid: false,
				errorMessage: messages.validation.nameTooShort(),
			};
		}
	}

	// 4) Auto-capitalize English words (first letter if a-z)
	words = words.map(capitalizeWord);

	const finalName = words.join(" ");
	return { isValid: true, correctedValue: finalName };
};

// Auto-capitalize only if the word starts with an English lowercase letter
const capitalizeWord = (word: string): string => {
	return word.replace(/^[a-z]/, (c) => c.toUpperCase());
};

const generateSampleData = (row: number, col: number): unknown => {
	const seed = row * 1000 + col;
	const random = () => {
		const x = Math.sin(seed) * 10000;
		return x - Math.floor(x);
	};

	// Sample names for the first column
	const sampleNames = [
		"John Smith",
		"Maria Garcia",
		"Ahmed Hassan",
		"Sarah Johnson",
		"Chen Wei",
		"Anna Kowalski",
		"David Brown",
		"Fatima Al-Zahra",
		"Pierre Dubois",
		"Yuki Tanaka",
		"Elena Rodriguez",
		"Michael Davis",
		"Priya Sharma",
		"Lars Andersen",
		"Sofia Rossi",
		"James Wilson",
		"Aisha Okafor",
		"Carlos Mendez",
		"Emma Thompson",
		"Ali Rahman",
	];

	switch (col) {
		case 0:
			return sampleNames[row % sampleNames.length];
		case 1:
			return ["Option A", "Option B", "Option C"][Math.floor(random() * 3)];
		case 2:
			return Math.round((random() * 10000 + 100) * 100) / 100; // Amount: $100-$10,100
		case 3:
			return new Date(
				2020 + Math.floor(random() * 4),
				Math.floor(random() * 12),
				Math.floor(random() * 28) + 1,
			);
		case 4:
			return new Date(
				1970,
				0,
				1,
				Math.floor(random() * 24),
				Math.floor(random() * 60),
			);
		default:
			return `Cell ${row},${col}`;
	}
};

const formatNumber = (value: number, format?: string): string => {
	if (value === null || value === undefined || Number.isNaN(value)) return "";

	switch (format) {
		case "currency":
			return new Intl.NumberFormat(undefined, {
				style: "currency",
				currency: "USD",
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}).format(value);
		case "dollar":
			return new Intl.NumberFormat(undefined, {
				style: "currency",
				currency: "USD",
			}).format(value);
		case "euro":
			return new Intl.NumberFormat(undefined, {
				style: "currency",
				currency: "EUR",
			}).format(value);
		case "yen":
			return new Intl.NumberFormat(undefined, {
				style: "currency",
				currency: "JPY",
				maximumFractionDigits: 0,
			}).format(value);
		case "percent":
			return new Intl.NumberFormat(undefined, {
				style: "percent",
				minimumFractionDigits: 1,
				maximumFractionDigits: 1,
			}).format(value / 100);
		case "compact":
			return new Intl.NumberFormat(undefined, { notation: "compact" }).format(
				value,
			);
		case "plain":
		case "localized":
		case "automatic":
			return new Intl.NumberFormat(undefined).format(value);
		case "percentage":
			return new Intl.NumberFormat(undefined, {
				style: "percent",
				minimumFractionDigits: 1,
				maximumFractionDigits: 1,
			}).format(value / 100);
		case "scientific":
			return value.toExponential(2);
		default:
			return new Intl.NumberFormat(undefined, {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}).format(value);
	}
};

function getInitialCell(
	col: number,
	row: number,
	theme: Partial<Theme>,
	darkTheme: Partial<Theme>,
	columnFormats?: Record<string, string>,
	columnId?: string,
): GridCell {
	const data = generateSampleData(row, col);

	switch (col) {
		case 0: // Text
			return {
				kind: GridCellKind.Text,
				data: String(data ?? ""),
				displayData: String(data ?? ""),
				allowOverlay: true,
			};
		case 1: // Dropdown
			return {
				kind: GridCellKind.Custom,
				data: {
					kind: "dropdown-cell",
					allowedValues: ["Option A", "Option B", "Option C"],
					value: String(data ?? ""),
				},
				copyData: String(data ?? ""),
				allowOverlay: true,
			} as GridCell;
		case 2: {
			// Number (Amount)
			const format =
				columnFormats?.[columnId || "number"] ||
				columnFormats?.number ||
				"number";
			return {
				kind: GridCellKind.Number,
				data: Number(data ?? 0),
				displayData: formatNumber(Number(data ?? 0), String(format)),
				allowOverlay: true,
			};
		}
		case 3: {
			// Date Picker (Date)
			const dateFormat =
				columnFormats?.[columnId || "date"] || columnFormats?.date;
			const formattedDate =
				dateFormat && data instanceof Date
					? FormattingService.formatValue(data, "date", dateFormat)
					: data instanceof Date
						? data.toLocaleDateString("en-GB")
						: "";
			return {
				kind: GridCellKind.Custom,
				data: {
					kind: "tempus-date-cell",
					format: "date",
					date: data instanceof Date ? data : new Date(),
					displayDate: formattedDate,
					isDarkTheme: theme === darkTheme,
				},
				copyData: formattedDate,
				allowOverlay: true,
			} as TempusDateCell;
		}
		case 4: {
			// Time Picker (Time)
			const timeFormat =
				columnFormats?.[columnId || "time"] || columnFormats?.time;
			const use24Hour =
				Boolean((columnFormats as { use24Hour?: boolean })?.use24Hour) || false;
			const formattedTime =
				timeFormat && data instanceof Date
					? FormattingService.formatValue(data, "time", timeFormat)
					: data instanceof Date
						? data.toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})
						: "";
			return {
				kind: GridCellKind.Custom,
				data: {
					kind: "timekeeper-cell",
					time: data instanceof Date ? data : new Date(),
					displayTime: formattedTime,
					isDarkTheme: theme === darkTheme,
					use24Hour: use24Hour,
				},
				copyData: formattedTime,
				allowOverlay: true,
			} as TimekeeperCell;
		}
		default:
			return {
				kind: GridCellKind.Text,
				data: String(data ?? ""),
				displayData: String(data ?? ""),
				allowOverlay: true,
			};
	}
}

export function useGridData(
	visibleColumnIndices: number[],
	theme: Partial<Theme>,
	darkTheme: Partial<Theme>,
	initialNumRows: number,
	columnFormats?: Record<string, string>,
	columns?: GridColumn[],
) {
	const editingState = React.useRef(
		new EditingState(initialNumRows, theme, theme === darkTheme),
	);

	const getRawCellContent = React.useCallback(
		(col: number, row: number): GridCell => {
			const storedCell = editingState.current.getCell(col, row);
			if (storedCell) {
				// Ensure numeric cells have formatted display
				if (storedCell.kind === GridCellKind.Number) {
					// Access data property directly - GridCell types have this property
					const raw = (storedCell as GridCell & { data?: unknown }).data;
					const columnId = columns?.[col]?.id;
					const key = (columnId ?? "number") as string;
					const format = String(
						columnFormats?.[key] || columnFormats?.number || "number",
					);
					const formatted =
						raw !== undefined && raw !== null
							? formatNumber(Number(raw), format)
							: "";
					// @ts-expect-error
					storedCell.displayData = formatted;
				}

				// Update date/time cell formatting
				const cellWithDateData = storedCell as GridCell & {
					data?: {
						kind?: string;
						date?: Date;
						format?: string;
						displayDate?: string;
					};
				};
				if (
					storedCell.kind === GridCellKind.Custom &&
					cellWithDateData.data?.kind === "tempus-date-cell"
				) {
					const cellData = cellWithDateData.data;
					const date = cellData.date;
					if (date instanceof Date) {
						const columnId = columns?.[col]?.id;
						let format: string | undefined;
						let columnType: string;

						if ((cellData as { format?: string }).format === "date") {
							format =
								columnFormats?.[columnId || "date"] || columnFormats?.date;
							columnType = "date";
						} else if ((cellData as { format?: string }).format === "time") {
							format =
								columnFormats?.[columnId || "time"] || columnFormats?.time;
							columnType = "time";
						} else {
							format =
								columnFormats?.[columnId || "datetime"] ||
								columnFormats?.datetime;
							columnType = "datetime";
						}

						if (format) {
							const formattedValue = FormattingService.formatValue(
								date,
								columnType,
								format,
							);
							(cellData as { displayDate?: string }).displayDate =
								formattedValue;
							(storedCell as GridCell & { copyData?: string }).copyData =
								(cellData as { displayDate?: string }).displayDate ?? "";
						} else {
							// Use default formatting
							if ((cellData as { format?: string }).format === "date") {
								(cellData as { displayDate?: string }).displayDate =
									date.toLocaleDateString("en-GB");
							} else if ((cellData as { format?: string }).format === "time") {
								(cellData as { displayDate?: string }).displayDate =
									date.toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									});
							} else {
								(cellData as { displayDate?: string }).displayDate =
									date.toLocaleString();
							}
							(storedCell as GridCell & { copyData?: string }).copyData =
								(cellData as { displayDate?: string }).displayDate ?? "";
						}
					}
				}

				// Update timekeeper cell formatting
				const cellWithTimekeeperData = storedCell as GridCell & {
					data?: {
						kind?: string;
						time?: Date;
						displayTime?: string;
						use24Hour?: boolean;
					};
				};
				if (
					storedCell.kind === GridCellKind.Custom &&
					cellWithTimekeeperData.data?.kind === "timekeeper-cell"
				) {
					const cellData = cellWithTimekeeperData.data;
					const time = cellData.time;
					if (time instanceof Date) {
						const columnId = columns?.[col]?.id;
						const format =
							columnFormats?.[columnId || "time"] || columnFormats?.time;

						if (format) {
							const formattedValue = FormattingService.formatValue(
								time,
								"time",
								format,
							);
							(cellData as { displayTime?: string }).displayTime =
								formattedValue;
							(storedCell as GridCell & { copyData?: string }).copyData =
								(cellData as { displayTime?: string }).displayTime ?? "";
						} else {
							// Use default formatting based on use24Hour
							const hours = time.getHours();
							const minutes = time.getMinutes();
							const minutesStr = minutes.toString().padStart(2, "0");

							if ((cellData as { use24Hour?: boolean }).use24Hour) {
								(cellData as { displayTime?: string }).displayTime =
									`${hours.toString().padStart(2, "0")}:${minutesStr}`;
							} else {
								const isPM = hours >= 12;
								const displayHours =
									hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

								(cellData as { displayTime?: string }).displayTime =
									`${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
							}
							(storedCell as GridCell & { copyData?: string }).copyData =
								(cellData as { displayTime?: string }).displayTime ?? "";
						}
					}
				}

				// Mark missing values and validate for required columns
				if (col === 0 && storedCell.kind === GridCellKind.Text) {
					// Name column validation
					const cellWithValidation = storedCell as GridCell & {
						data?: string;
						displayData?: string;
						isMissingValue?: boolean;
						validationError?: string;
					};
					const data = cellWithValidation.data || "";
					const validation = validateNameField(data);

					if (!validation.isValid) {
						cellWithValidation.isMissingValue = true;
						cellWithValidation.validationError =
							validation.errorMessage || "Validation error";
					} else {
						cellWithValidation.isMissingValue = false;
						if (
							validation.correctedValue &&
							validation.correctedValue !== data
						) {
							cellWithValidation.data = validation.correctedValue;
							cellWithValidation.displayData = validation.correctedValue;
						}
					}
				}

				return storedCell;
			}
			const columnId = columns?.[col]?.id;
			const cell = getInitialCell(
				col,
				row,
				theme,
				darkTheme,
				columnFormats,
				columnId,
			);
			if (cell.kind === GridCellKind.Number) {
				// Access data property directly - GridCell types have this property
				const raw = (cell as GridCell & { data?: unknown }).data;
				const key = (columnId ?? "number") as string;
				const format = String(
					columnFormats?.[key] || columnFormats?.number || "number",
				);
				// @ts-expect-error
				cell.displayData =
					raw !== undefined && raw !== null
						? formatNumber(Number(raw), String(format))
						: "";
			}

			// Mark missing values and validate for required columns
			if (col === 0 && cell.kind === GridCellKind.Text) {
				// Name column validation
				const data: string = String((cell as { data?: unknown }).data ?? "");
				const validation = validateNameField(data);

				if (!validation.isValid) {
					(
						cell as { isMissingValue?: boolean; validationError?: string }
					).isMissingValue = true;
					(
						cell as { isMissingValue?: boolean; validationError?: string }
					).validationError = validation.errorMessage || "Validation error";
				} else {
					(cell as { isMissingValue?: boolean }).isMissingValue = false;
					if (validation.correctedValue && validation.correctedValue !== data) {
						(cell as { data?: unknown }).data = validation.correctedValue;
						(cell as { displayData?: unknown }).displayData =
							validation.correctedValue;
					}
				}
			}
			return cell;
		},
		[theme, darkTheme, columnFormats, columns],
	);

	const normalizeEditedCell = React.useCallback(
		(cell: EditableGridCell, col?: number): GridCell => {
			// Ensure essential props like displayData are present so the grid renders the updated value immediately
			switch (cell.kind) {
				case GridCellKind.Text: {
					let text = (cell as GridCell & { data?: string }).data ?? "";
					let hasError = false;
					let errorMessage = "";

					// Apply name validation for column 0 (name field)
					if (col === 0) {
						const validation = validateNameField(text);
						if (!validation.isValid) {
							hasError = true;
							errorMessage =
								validation.errorMessage || messages.validation.invalidName();
						} else if (validation.correctedValue) {
							text = validation.correctedValue;
						}
					}

					return {
						kind: GridCellKind.Text,
						data: text,
						displayData: text,
						allowOverlay: true,
						...(hasError && {
							hoverEffect: false,
						}),
						...(col === 0 &&
							hasError && {
								isMissingValue: true,
								validationError: errorMessage,
							}),
					} as GridCell;
				}
				case GridCellKind.Number: {
					const num = (cell as GridCell & { data?: unknown }).data ?? 0;
					const columnId = columns?.[col || 0]?.id;
					const key = (columnId ?? "number") as string;
					const format = String(
						columnFormats?.[key] || columnFormats?.number || "number",
					);
					return {
						kind: GridCellKind.Number,
						data: num,
						displayData: formatNumber(Number(num), String(format)),
						allowOverlay: true,
					} as GridCell;
				}
				case GridCellKind.Custom: {
					// Handle date/time cells
					const cellWithDateData = cell as GridCell & {
						data?: { kind?: string; date?: Date; format?: string };
					};
					if (cellWithDateData.data?.kind === "tempus-date-cell") {
						const cellData = cellWithDateData.data;
						const date = cellData.date;
						if (date instanceof Date) {
							const columnId = columns?.[col || 0]?.id;
							let format: string | undefined;
							let columnType: string;

							if ((cellData as { format?: string }).format === "date") {
								format =
									columnFormats?.[columnId || "date"] || columnFormats?.date;
								columnType = "date";
							} else if ((cellData as { format?: string }).format === "time") {
								format =
									columnFormats?.[columnId || "time"] || columnFormats?.time;
								columnType = "time";
							} else {
								format =
									columnFormats?.[columnId || "datetime"] ||
									columnFormats?.datetime;
								columnType = "datetime";
							}

							let formattedValue: string;
							if (format) {
								formattedValue = FormattingService.formatValue(
									date,
									columnType,
									format,
								);
							} else {
								// Use default formatting
								if ((cellData as { format?: string }).format === "date") {
									formattedValue = date.toLocaleDateString("en-GB");
								} else if (
									(cellData as { format?: string }).format === "time"
								) {
									formattedValue = date.toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									});
								} else {
									formattedValue = date.toLocaleString();
								}
							}

							(cellData as { displayDate?: string }).displayDate =
								formattedValue;
							return {
								...cell,
								data: cellData,
								copyData: formattedValue,
							} as unknown as GridCell;
						}
					}

					// Handle timekeeper cells
					const cellWithTimekeeperData = cell as GridCell & {
						data?: {
							kind?: string;
							time?: Date;
							displayTime?: string;
							use24Hour?: boolean;
						};
					};
					if (cellWithTimekeeperData.data?.kind === "timekeeper-cell") {
						const cellData = cellWithTimekeeperData.data;
						const time = cellData.time;
						if (time instanceof Date) {
							const columnId = columns?.[col || 0]?.id;
							const format =
								columnFormats?.[columnId || "time"] || columnFormats?.time;

							let formattedValue: string;
							if (format) {
								formattedValue = FormattingService.formatValue(
									time,
									"time",
									format,
								);
							} else {
								// Use default formatting based on use24Hour
								const hours = time.getHours();
								const minutes = time.getMinutes();
								const minutesStr = minutes.toString().padStart(2, "0");

								if ((cellData as { use24Hour?: boolean }).use24Hour) {
									formattedValue = `${hours.toString().padStart(2, "0")}:${minutesStr}`;
								} else {
									const isPM = hours >= 12;
									const displayHours =
										hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
									formattedValue = `${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
								}
							}

							cellData.displayTime = formattedValue;
							return {
								...cell,
								data: cellData,
								copyData: formattedValue,
							} as unknown as GridCell;
						}
					}

					return cell as unknown as GridCell;
				}
				default:
					// For other cells, assume full data provided
					return cell as unknown as GridCell;
			}
		},
		[columnFormats, columns],
	);

	const onCellEdited = React.useCallback(
		(visibleRows: readonly number[]) =>
			(cell: Item, newValue: EditableGridCell) => {
				const [displayCol, displayRow] = cell;
				const actualCol = visibleColumnIndices[displayCol];
				const actualRow = visibleRows[displayRow];

				if (actualRow !== undefined && actualCol !== undefined) {
					const normalized = normalizeEditedCell(newValue, actualCol);
					editingState.current.setCell(actualCol, actualRow, normalized);
				}
			},
		[visibleColumnIndices, normalizeEditedCell],
	);

	const getCellContent = React.useCallback(
		(visibleRows: readonly number[]) =>
			(cell: Item): GridCell => {
				const [displayCol, displayRow] = cell;
				const actualCol = visibleColumnIndices[displayCol];
				const actualRow = visibleRows[displayRow];

				if (actualRow === undefined || actualCol === undefined) {
					return {
						kind: GridCellKind.Text,
						data: "",
						displayData: "",
						allowOverlay: false,
					};
				}

				return getRawCellContent(actualCol, actualRow);
			},
		[visibleColumnIndices, getRawCellContent],
	);

	return { editingState, getCellContent, onCellEdited, getRawCellContent };
}
