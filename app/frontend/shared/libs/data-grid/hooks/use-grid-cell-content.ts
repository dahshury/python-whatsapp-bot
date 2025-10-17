import {
	type GridCell,
	GridCellKind,
	type Item,
	type Theme,
} from "@glideapps/glide-data-grid";
import { useCallback } from "react";

type DisplayColumn = {
	width?: number;
	sticky?: boolean;
	id?: string;
	[key: string]: unknown;
};

const DEFAULT_COLUMN_WIDTH = 150;
const SKELETON_WIDTH_MIN = 60;
const SKELETON_WIDTH_MAX = 220;
const SKELETON_WIDTH_RATIO = 0.65;
const SKELETON_HEIGHT = 14;
const SKELETON_WIDTH_VARIABILITY = 40;

function createLoadingCell(
	displayColumns: DisplayColumn[],
	colIdx: number
): GridCell {
	const approxWidth = (displayColumns[colIdx]?.width ??
		DEFAULT_COLUMN_WIDTH) as number;
	return {
		kind: GridCellKind.Loading,
		skeletonWidth: Math.round(
			Math.max(
				SKELETON_WIDTH_MIN,
				Math.min(SKELETON_WIDTH_MAX, approxWidth * SKELETON_WIDTH_RATIO)
			)
		),
		skeletonHeight: SKELETON_HEIGHT,
		skeletonWidthVariability: SKELETON_WIDTH_VARIABILITY,
	} as GridCell;
}

function applyContentAlign(
	cell: GridCell,
	contentAlign?: "left" | "center" | "right"
): GridCell {
	return contentAlign
		? ({
				...(cell as unknown as {
					contentAlign?: "left" | "center" | "right";
				}),
				contentAlign,
			} as GridCell)
		: cell;
}

function applyStickyStyle(
	baseCell: GridCell,
	theme: Partial<Theme> | Theme | undefined,
	darkTheme: Partial<Theme> | Theme | undefined
): GridCell {
	if (
		baseCell.kind === GridCellKind.Text &&
		(baseCell as { style?: string }).style !== "faded"
	) {
		return {
			...(baseCell as { style?: string }),
			style: "faded",
		} as GridCell;
	}

	return {
		...(baseCell as GridCell),
		themeOverride: {
			...(baseCell as { themeOverride?: Record<string, unknown> })
				.themeOverride,
			textDark: theme === darkTheme ? "#a1a1aa" : "#6b7280",
		},
	} as GridCell;
}

function removeFadedStyle(baseCell: GridCell): GridCell {
	const { style: _s, themeOverride: _t, ...rest } = baseCell as GridCell;
	return { ...rest } as GridCell;
}

export function useGridCellContent({
	loading = false,
	isDataReady,
	columnsStateLength,
	displayColumns,
	theme,
	darkTheme,
	baseGetCellContent,
	filteredRows,
	contentAlign,
}: {
	loading?: boolean;
	isDataReady: boolean;
	columnsStateLength: number;
	displayColumns: DisplayColumn[];
	theme: Partial<Theme> | Theme | undefined;
	darkTheme: Partial<Theme> | Theme | undefined;
	baseGetCellContent: (rows: number[]) => (cell: Item) => GridCell;
	filteredRows: number[];
	contentAlign?: "left" | "center" | "right";
}) {
	return useCallback(
		(cell: Item): GridCell => {
			if (loading || !isDataReady || columnsStateLength === 0) {
				const [col] = cell;
				return applyContentAlign(
					createLoadingCell(displayColumns, col),
					contentAlign
				);
			}

			const baseCell = baseGetCellContent(filteredRows)(cell);
			const [colIndex] = cell;
			const column = displayColumns[colIndex] as
				| { sticky?: boolean }
				| undefined;

			if (column?.sticky) {
				return applyContentAlign(
					applyStickyStyle(baseCell, theme, darkTheme),
					contentAlign
				);
			}

			if (
				baseCell.kind === GridCellKind.Text &&
				((baseCell as { style?: string }).style === "faded" ||
					(baseCell as { themeOverride?: Record<string, unknown> })
						.themeOverride)
			) {
				return applyContentAlign(removeFadedStyle(baseCell), contentAlign);
			}

			return applyContentAlign(baseCell, contentAlign);
		},
		[
			loading,
			isDataReady,
			columnsStateLength,
			displayColumns,
			baseGetCellContent,
			filteredRows,
			theme,
			darkTheme,
			contentAlign,
		]
	);
}
