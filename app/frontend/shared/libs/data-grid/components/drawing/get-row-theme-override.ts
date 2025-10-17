import type { GetRowThemeCallback, Theme } from "@glideapps/glide-data-grid";

/**
 * Factory for row theme override callback, supporting hover and trailing row styling.
 */
export function createRowThemeOverride(
	hoverRow: number | undefined,
	theme: Theme,
	filteredRowCount: number
): GetRowThemeCallback {
	const t = theme as Theme & {
		bgHeaderHovered?: string;
		bgHeader?: string;
		textHeader?: string;
	};

	return (row) => {
		if (row === hoverRow) {
			return {
				bgCell: t.bgHeaderHovered,
				bgCellMedium: t.bgHeaderHovered,
			};
		}

		if (row === filteredRowCount) {
			return {
				bgCell: t.bgHeader ?? (theme as Theme).bgCell,
				bgCellMedium: t.bgHeader ?? (theme as Theme).bgCellMedium,
				textDark: t.textHeader,
			};
		}

		return {
			bgCell: (theme as Theme).bgCell,
			bgCellMedium: (theme as Theme).bgCellMedium,
			textDark: (theme as Theme).textDark,
			textLight: (theme as Theme).textLight,
		};
	};
}
