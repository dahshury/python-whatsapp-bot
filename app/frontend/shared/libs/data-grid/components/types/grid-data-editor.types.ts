import type {
	DataEditorRef,
	GridColumn,
	GridSelection,
	Item,
	SpriteMap,
	Theme,
} from '@glideapps/glide-data-grid'
import type React from 'react'
import type { ColumnConfig } from './column-config-streamlit.types'

export type GridDataEditorProps = {
	displayColumns: GridColumn[]
	filteredRows: number[]
	filteredRowCount: number
	getCellContent: (cell: Item) => unknown
	onCellEdited: (cell: Item, newVal: unknown) => void
	onGridSelectionChange: (selection: GridSelection) => void
	gridSelection: GridSelection
	onRowAppended?: () => void
	onItemHovered: (args: {
		location: [number, number]
		item: Item
		bounds?: { x: number; y: number; width: number; height: number }
	}) => void
	onHeaderMenuClick: (
		column: GridColumn,
		bounds: { x: number; y: number; width: number; height: number }
	) => void
	searchValue: string
	onSearchValueChange: (value: string) => void
	showSearch: boolean
	onSearchClose: () => void
	theme: Partial<Theme>
	darkTheme: Partial<Theme>
	hoverRow?: number
	dataEditorRef: React.RefObject<DataEditorRef | null>
	onMouseEnter?: () => void
	onMouseLeave?: () => void
	gridWidth?: number
	fullWidth?: boolean
	containerWidth?: number
	containerHeight?: number
	// Column management props - using Streamlit-style configuration
	columnConfigMapping?: Map<string, ColumnConfig>
	onColumnConfigChange?: (mapping: Map<string, ColumnConfig>) => void
	clearSelection?: (keepRows?: boolean, keepColumns?: boolean) => void
	// Column resizing - keep the existing functionality
	onColumnResize?: (column: GridColumn, newSize: number) => void
	// Autosize functionality like st_DataFrame
	onAutosize?: (columnIndex: number) => void
	// Custom header icons
	headerIcons?: SpriteMap
	// Compact sizing controls
	rowHeightOverride?: number
	headerHeightOverride?: number
	showAppendRowPlaceholder?: boolean
	rowMarkers?:
		| 'checkbox'
		| 'number'
		| 'clickable-number'
		| 'checkbox-visible'
		| 'both'
		| 'none'
		| 'selection'
		| {
				kind:
					| 'checkbox'
					| 'number'
					| 'clickable-number'
					| 'checkbox-visible'
					| 'both'
					| 'none'
					| 'selection'
				checkboxStyle?: 'circle' | 'square'
				startIndex?: number
				width?: number
				theme?: Partial<Theme>
		  }
	disableTrailingRow?: boolean
	// If true, disable editing/selection/fill handle
	readOnly?: boolean
	// If true, render without outer border/background so it blends into dialogs
	hideOuterFrame?: boolean
}
