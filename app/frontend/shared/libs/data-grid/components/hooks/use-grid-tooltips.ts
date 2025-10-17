import { useLanguage } from "@shared/libs/state/language-context";
import { useCallback, useMemo, useRef, useState } from "react";
import { i18n } from "@/shared/libs/i18n";

export const TOOLTIP_DEBOUNCE_MS = 2000;

export const getRequiredCellTooltip = () => "⚠️ This field is required";

export type TooltipState = {
	content: string;
	left: number;
	top: number;
	fieldLabel?: string;
	message?: string;
	width?: number;
};

export type TooltipsReturn = {
	tooltip: TooltipState | undefined;
	clearTooltip: () => void;
	onItemHovered: (args: {
		kind: "header" | "cell";
		location?: [number, number];
		bounds?: { x: number; y: number; width: number; height: number };
	}) => void;
};

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
	getBoundsForCell?: (
		col: number,
		row: number
	) => { x: number; y: number; width: number; height: number } | undefined
) {
	const [tooltip, setTooltip] = useState<TooltipState | undefined>();
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const { isLocalized } = useLanguage();

	const clearTooltip = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setTooltip(undefined);
	}, []);

	const formatFieldLabel = useCallback(
		(field?: string): string => {
			const f = String(field || "").toLowerCase();
			if (!(isLocalized && f)) {
				return f;
			}
			const label = i18n.getMessage(`field_${f}`, isLocalized);
			return (
				label || f.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
			);
		},
		[isLocalized]
	);

	// Helper to determine cell tooltip content
	const determineCellTooltipContent = useCallback(
		(args: {
			cell: unknown;
			colIdx: number;
			rowIdx: number;
			column?: { isRequired?: boolean; isEditable?: boolean; help?: string };
			errors?: Array<{
				row: number;
				col: number;
				message: string;
				fieldName?: string;
			}>;
		}): { tooltipContent?: string; fieldLabel?: string; message?: string } => {
			// Validation error takes precedence
			const fromValidation = () => {
				const errs = args.errors;
				if (!errs || errs.length === 0) {
					return;
				}
				const match = errs.find(
					(e) => e.row === args.rowIdx && e.col === args.colIdx
				);
				if (!match) {
					return;
				}
				const fieldLabel = formatFieldLabel(match.fieldName);
				const message = match.message;
				return {
					tooltipContent: fieldLabel ? `${fieldLabel}: ${message}` : message,
					fieldLabel,
					message,
				};
			};

			const fromErrorCell = () => {
				if (!isErrorCell(args.cell)) {
					return;
				}
				const message = (args.cell as { errorDetails: string }).errorDetails;
				return { tooltipContent: message, message };
			};

			const fromRequiredMissing = () => {
				if (
					!(
						args.column?.isRequired &&
						args.column?.isEditable &&
						isMissingValueCell(args.cell)
					)
				) {
					return;
				}
				const message = getRequiredCellTooltip();
				return { tooltipContent: message, message };
			};

			const fromCellTooltip = () => {
				if (!hasTooltip(args.cell)) {
					return;
				}
				const message = (args.cell as { tooltip: string }).tooltip;
				return { tooltipContent: message, message };
			};

			const result =
				fromValidation() ||
				fromErrorCell() ||
				fromRequiredMissing() ||
				fromCellTooltip();
			return result ?? {};
		},
		[formatFieldLabel]
	);

	// Helper to position tooltip based on bounds
	const positionTooltip = useCallback(
		(
			args: {
				location?: [number, number];
				bounds?: { x: number; y: number; width: number; height: number };
			},
			cellBoundsGetter:
				| ((
						col: number,
						row: number
				  ) => { x: number; y: number; width: number } | undefined)
				| undefined
		): { bx?: number; by?: number; bw?: number } => {
			let bx: number | undefined;
			let by: number | undefined;
			let bw: number | undefined;

			if (cellBoundsGetter && args.location) {
				const b = cellBoundsGetter(args.location[0], args.location[1]);
				if (b) {
					bx = b.x;
					by = b.y;
					bw = b.width;
				}
			}

			// Fallback to event bounds
			if ((bx === undefined || by === undefined) && args.bounds) {
				bx = args.bounds.x;
				by = args.bounds.y;
				bw = args.bounds.width;
			}

			return {
				...(bx !== undefined && { bx }),
				...(by !== undefined && { by }),
				...(bw !== undefined && { bw }),
			};
		},
		[]
	);

	const scheduleTooltipDisplay = useCallback(
		(
			tooltipText: string,
			label: string | undefined,
			detailMessage: string | undefined,
			args: {
				location?: [number, number];
				bounds?: { x: number; y: number; width: number; height: number };
			}
		) => {
			timeoutRef.current = setTimeout(() => {
				const { bx, by, bw } = positionTooltip(args, getBoundsForCell);
				if (bx !== undefined && by !== undefined) {
					setTooltip({
						content: tooltipText,
						left: bx + (bw ?? 0) / 2,
						top: by,
						...(label && { fieldLabel: label }),
						...(detailMessage && { message: detailMessage }),
						...(bw && { width: bw }),
					});
				}
			}, TOOLTIP_DEBOUNCE_MS);
		},
		[positionTooltip, getBoundsForCell]
	);

	const emptyTooltip = useMemo(
		() => () =>
			({
				text: undefined,
				label: undefined,
				detail: undefined,
			}) as const,
		[]
	);

	const getHeaderTooltip = useMemo(
		() => (column: unknown) => {
			if ((column as unknown as { help?: string }).help) {
				return {
					text: (column as unknown as { help?: string }).help,
					label: undefined,
					detail: undefined,
				} as const;
			}
			return emptyTooltip();
		},
		[emptyTooltip]
	);

	const resolveTooltipForArgs = useCallback(
		(args: { kind: "header" | "cell"; location?: [number, number] }) => {
			if (!args.location) {
				return emptyTooltip();
			}
			const colIdx = args.location[0];
			const rowIdx = args.location[1];
			if (colIdx < 0 || colIdx >= columns.length) {
				return emptyTooltip();
			}
			const column = columns[colIdx];
			if (args.kind === "header" && column) {
				return getHeaderTooltip(column);
			}
			if (!(args.kind === "cell" && rowIdx >= 0)) {
				return emptyTooltip();
			}
			try {
				const cell = getCellContent([colIdx, rowIdx]);
				const res = determineCellTooltipContent({
					cell,
					colIdx,
					rowIdx,
					...(column && { column }),
					...(validationErrors && { errors: validationErrors }),
				});
				return {
					text: res.tooltipContent,
					label: res.fieldLabel,
					detail: res.message,
				} as const;
			} catch {
				return emptyTooltip();
			}
		},
		[
			columns,
			getCellContent,
			validationErrors,
			determineCellTooltipContent,
			emptyTooltip,
			getHeaderTooltip,
		]
	);

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

			if (!(args.kind === "header" || args.kind === "cell")) {
				return;
			}
			const { text, label, detail } = resolveTooltipForArgs(args);
			if (!text) {
				return;
			}
			scheduleTooltipDisplay(text, label, detail, args);
		},
		[resolveTooltipForArgs, scheduleTooltipDisplay]
	);

	return { tooltip, clearTooltip, onItemHovered };
}
