import type {
	DataEditorProps,
	GridCell,
	GridMouseEventArgs,
} from "@glideapps/glide-data-grid";
import { useCallback, useRef, useState } from "react";
import { messages } from "../utils/i18n";

export const TOOLTIP_DEBOUNCE_MS = 600;

// Get the required cell tooltip based on RTL
export const getRequiredCellTooltip = () => {
	return `⚠️ ${messages.validation.thisFieldIsRequired()}`;
};

export interface TooltipState {
	content: string;
	left: number;
	top: number;
}

export interface TooltipsReturn {
	tooltip: TooltipState | undefined;
	clearTooltip: () => void;
	onItemHovered: DataEditorProps["onItemHovered"];
}

/**
 * Returns true if the given cell has a tooltip available (custom property `tooltip`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasTooltip(cell: any): cell is { tooltip: string } {
	return cell && typeof cell === "object" && typeof cell.tooltip === "string";
}

/**
 * Returns true if the given cell contains no value (-> missing value).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isMissingValueCell(cell: any): boolean {
	return cell && typeof cell === "object" && cell.isMissingValue === true;
}

/**
 * Returns true if the given cell contains an error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isErrorCell(cell: any): cell is { errorDetails: string } {
	return (
		cell &&
		typeof cell === "object" &&
		cell.isError === true &&
		typeof cell.errorDetails === "string"
	);
}

/**
 * Returns true if the given cell has a validation error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasValidationError(cell: any): cell is { validationError: string } {
	return (
		cell && typeof cell === "object" && typeof cell.validationError === "string"
	);
}

/**
 * Hook to manage hover tooltips for DataEditor cells and headers.
 * Supports validation tooltips, error tooltips, and custom tooltips.
 */
export function useGridTooltips(
	getCellContent: (cell: readonly [number, number]) => GridCell,
	columns: any[],
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
		(args: GridMouseEventArgs) => {
			// Always reset the tooltips on any change
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			setTooltip(undefined);

			if ((args.kind === "header" || args.kind === "cell") && args.location) {
				const colIdx = args.location[0];
				const rowIdx = args.location[1];
				let tooltipContent: string | undefined;

				if (colIdx < 0 || colIdx >= columns.length) {
					// Ignore negative column index (Row index column)
					// and column index that is out of bounds
					return;
				}

				const column = columns[colIdx];

				if (args.kind === "header" && column) {
					tooltipContent = column.help;
				} else if (args.kind === "cell" && rowIdx >= 0) {
					try {
						const cell = getCellContent([colIdx, rowIdx]);

						if (isErrorCell(cell)) {
							// If the cell is an error cell, show error details
							tooltipContent = `❌ ${cell.errorDetails}`;
						} else if (hasValidationError(cell)) {
							// If the cell has a validation error, show specific error message
							tooltipContent = `⚠️ ${cell.validationError}`;
						} else if (
							column.isRequired &&
							column.isEditable &&
							isMissingValueCell(cell)
						) {
							// Show generic required field tooltip only if no specific error
							tooltipContent = getRequiredCellTooltip();
						} else if (hasTooltip(cell)) {
							// Show custom tooltip
							tooltipContent = cell.tooltip;
						}
					} catch (_e) {
						// Ignore errors when getting cell content (e.g., for add row)
					}
				}

				if (tooltipContent && args.bounds) {
					timeoutRef.current = setTimeout(() => {
						setTooltip({
							content: tooltipContent,
							left: args.bounds.x + args.bounds.width / 2,
							top: args.bounds.y,
						});
					}, TOOLTIP_DEBOUNCE_MS);
				}
			}
		},
		[columns, getCellContent],
	);

	return {
		tooltip,
		clearTooltip,
		onItemHovered,
	};
}
