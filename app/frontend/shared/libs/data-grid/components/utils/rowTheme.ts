import type { GetRowThemeCallback, Theme } from '@glideapps/glide-data-grid'

export function createGetRowThemeOverride(
	hoverRow: number | undefined,
	theme: Partial<Theme>,
	filteredRowCount: number
): GetRowThemeCallback {
	return (row) => {
		if (row === hoverRow) {
			return {
				bgCell: (theme as Theme & { bgHeaderHovered?: string }).bgHeaderHovered,
				bgCellMedium: (theme as Theme & { bgHeaderHovered?: string })
					.bgHeaderHovered,
			}
		}

		if (row === filteredRowCount) {
			return {
				bgCell:
					(theme as Theme & { bgHeader?: string }).bgHeader ??
					(theme as Theme).bgCell,
				bgCellMedium:
					(theme as Theme & { bgHeader?: string }).bgHeader ??
					(theme as Theme).bgCellMedium,
				textDark: (theme as Theme & { textHeader?: string }).textHeader,
			}
		}

		return {
			bgCell: (theme as Theme).bgCell,
			bgCellMedium: (theme as Theme).bgCellMedium,
			textDark: (theme as Theme).textDark,
			textLight: (theme as Theme).textLight,
		}
	}
}


