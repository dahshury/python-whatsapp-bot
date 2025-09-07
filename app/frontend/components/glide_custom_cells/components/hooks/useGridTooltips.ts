import { useCallback, useRef, useState } from "react";

export const TOOLTIP_DEBOUNCE_MS = 600;

export const getRequiredCellTooltip = () => {
	return "⚠️ This field is required";
};

export interface TooltipState {
	content: string;
	left: number;
	top: number;
}

export interface TooltipsReturn {
	tooltip: TooltipState | undefined;
	clearTooltip: () => void;
	onItemHovered: (args: {
		kind: "header" | "cell";
		location?: [number, number];
		bounds?: { x: number; y: number; width: number; height: number };
	}) => void;
}

function hasTooltip(cell: unknown): cell is { tooltip: string } {
	return (
		!!cell &&
		typeof cell === "object" &&
		cell !== null &&
		typeof (cell as { tooltip?: unknown }).tooltip === "string"
	);
}

function isMissingValueCell(cell: unknown): boolean {
	return (
		!!cell &&
		typeof cell === "object" &&
		cell !== null &&
		(cell as { isMissingValue?: boolean }).isMissingValue === true
	);
}

function isErrorCell(cell: unknown): cell is { errorDetails: string } {
	return (
		!!cell &&
		typeof cell === "object" &&
		cell !== null &&
		(cell as { isError?: boolean; errorDetails?: unknown }).isError === true &&
		typeof (cell as { errorDetails?: unknown }).errorDetails === "string"
	);
}

export function useGridTooltips(
	getCellContent: (cell: readonly [number, number]) => unknown,
	columns: Array<{ isRequired?: boolean; isEditable?: boolean; help?: string }>,
	validationErrors?: Array<{
		row: number;
		col: number;
		message: string;
		fieldName?: string;
	}>,
) {
	const [tooltip, setTooltip] = useState<TooltipState | undefined>();
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const clearTooltip = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setTooltip(undefined);
	}, []);

	const onItemHovered = useCallback(
		(args: {
			kind: "header" | "cell";
			location?: [number, number];
			bounds?: { x: number; y: number; width: number; height: number };
		}) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			setTooltip(undefined);

			if ((args.kind === "header" || args.kind === "cell") && !!args.location) {
				const colIdx = args.location[0];
				const rowIdx = args.location[1];
				let tooltipContent: string | undefined;

				if (colIdx < 0 || colIdx >= columns.length) {
					return;
				}

				const column = columns[colIdx];

				if (args.kind === "header" && column) {
					tooltipContent = column.help as string | undefined;
				} else if (args.kind === "cell" && rowIdx >= 0) {
					try {
						const cell = getCellContent([colIdx, rowIdx]);

						// Check for validation errors first (highest priority)
						if (validationErrors && validationErrors.length > 0) {
							const cellValidationError = validationErrors.find(
								(error) => error.row === rowIdx && error.col === colIdx,
							);
							if (cellValidationError) {
								tooltipContent = `❌ ${cellValidationError.message}`;
								console.log("[Tooltip] Showing validation error tooltip:", {
									row: rowIdx,
									col: colIdx,
									message: cellValidationError.message,
									fieldName: cellValidationError.fieldName,
								});
							}
						}

						// Fallback to cell-level errors
						if (!tooltipContent && isErrorCell(cell)) {
							tooltipContent = `❌ ${cell.errorDetails}`;
						}

						// Required field missing value
						if (
							!tooltipContent &&
							column &&
							!!column.isRequired &&
							!!column.isEditable &&
							isMissingValueCell(cell)
						) {
							tooltipContent = getRequiredCellTooltip();
						}

						// Cell-specific tooltip
						if (!tooltipContent && hasTooltip(cell)) {
							tooltipContent = cell.tooltip;
						}
					} catch {
						// ignore errors
					}
				}

				if (tooltipContent && args.bounds) {
					timeoutRef.current = setTimeout(() => {
						// Double-check bounds are still available in the callback
						if (args.bounds) {
							setTooltip({
								content: tooltipContent,
								left: args.bounds.x + args.bounds.width / 2,
								top: args.bounds.y,
							});
						}
					}, TOOLTIP_DEBOUNCE_MS);
				}
			}
		},
		[columns, getCellContent, validationErrors],
	);

	return { tooltip, clearTooltip, onItemHovered };
}
