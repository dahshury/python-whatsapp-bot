import type { GridCell, Item } from '@glideapps/glide-data-grid'
import { GridCellKind } from '@glideapps/glide-data-grid'
import {
	LOADING_DEFAULT_APPROX_WIDTH,
	LOADING_MAX_WIDTH,
	LOADING_MIN_WIDTH,
	LOADING_SKELETON_HEIGHT,
	LOADING_WIDTH_MULTIPLIER,
} from '../constants/grid'

type CreateGetCellContentArgs = {
	loading?: boolean
	isDataReady: boolean
	columnsStateLength: number
	displayColumns: Array<{ width?: number; sticky?: boolean }>
	filteredRows: number[]
	baseGetCellContent: (visibleRows: number[]) => (cell: Item) => GridCell
	theme: unknown
	darkTheme: unknown
	documentsGrid?: boolean
}

export function createGetCellContent({
	loading,
	isDataReady,
	columnsStateLength,
	displayColumns,
	filteredRows,
	baseGetCellContent,
	theme,
	darkTheme,
	documentsGrid,
}: CreateGetCellContentArgs) {
	return (cell: Item): GridCell => {
		if (loading || !isDataReady || columnsStateLength === 0) {
			const [columnIdxLoading] = cell
			const approxWidth =
				(displayColumns[columnIdxLoading] as { width?: number } | undefined)
					?.width ?? LOADING_DEFAULT_APPROX_WIDTH
			return {
				kind: GridCellKind.Loading,
				skeletonWidth: Math.round(
					Math.max(
						LOADING_MIN_WIDTH,
						Math.min(LOADING_MAX_WIDTH, approxWidth * LOADING_WIDTH_MULTIPLIER)
					)
				),
				skeletonHeight: LOADING_SKELETON_HEIGHT,
				skeletonWidthVariability: 40,
			} as GridCell
		}

		const baseCell = baseGetCellContent(filteredRows)(cell)
		const [col] = cell
		const column = displayColumns[col] as { sticky?: boolean }

		// Apply documents grid styling: center align and larger font
		if (documentsGrid) {
			const cellWithDocumentStyling = {
				...baseCell,
				contentAlign: 'center',
				themeOverride: {
					...(baseCell as { themeOverride?: Record<string, unknown> })
						.themeOverride,
					baseFontStyle: '16px',
					editorFontSize: '16px',
				},
			} as GridCell

			// Handle sticky columns for documents grid
			if (column?.sticky) {
				return {
					...cellWithDocumentStyling,
					themeOverride: {
						...(
							cellWithDocumentStyling as {
								themeOverride?: Record<string, unknown>
							}
						).themeOverride,
						textDark: theme === darkTheme ? '#a1a1aa' : '#6b7280',
					},
				} as GridCell
			}

			return cellWithDocumentStyling
		}

		// Original non-documents grid logic
		if (column?.sticky) {
			if (
				baseCell.kind === GridCellKind.Text &&
				(baseCell as { style?: string }).style !== 'faded'
			) {
				return {
					...(baseCell as { style?: string }),
					style: 'faded',
				} as GridCell
			}
			return {
				...(baseCell as GridCell),
				themeOverride: {
					...(baseCell as { themeOverride?: Record<string, unknown> })
						.themeOverride,
					textDark: theme === darkTheme ? '#a1a1aa' : '#6b7280',
				},
			} as GridCell
		}

		if (
			baseCell.kind === GridCellKind.Text &&
			((baseCell as { style?: string }).style === 'faded' ||
				(baseCell as { themeOverride?: Record<string, unknown> }).themeOverride)
		) {
			const { style: _s, themeOverride: _t, ...rest } = baseCell as GridCell
			return { ...rest } as GridCell
		}

		return baseCell
	}
}
