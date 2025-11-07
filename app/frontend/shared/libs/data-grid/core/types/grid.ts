import type { DataEditorRef, Theme } from '@glideapps/glide-data-grid'
import type { IDataSource } from '../../components/core/interfaces/IDataSource'
import type { EditInterceptor } from '../services/runEditPipeline'

export type ColumnConfig = {
	pinned?: boolean
	width?: number
	hidden?: boolean
}

export type GridRef = {
	updateCells: (cells: { cell: [number, number] }[]) => void
}

export type GridProps = {
	showThemeToggle?: boolean
	fullWidth?: boolean
	theme?: Partial<Theme>
	isDarkMode?: boolean
	dataSource?: IDataSource
	onReady?: () => void
	onDataProviderReady?: (provider: unknown) => void
	dataEditorRef?: React.RefObject<DataEditorRef | null>
	validationErrors?: Array<{
		row: number
		col: number
		message: string
		fieldName?: string
	}>
	onAppendRow?: () => void
	hideToolbar?: boolean
	hideHeaders?: boolean
	className?: string
	loading?: boolean
	rowHeight?: number
	headerHeight?: number
	hideAppendRowPlaceholder?: boolean
	rowMarkers?:
		| 'none'
		| 'both'
		| 'number'
		| 'checkbox'
		| 'checkbox-visible'
		| 'clickable-number'
		| 'selection'
	disableTrailingRow?: boolean
	onAddRowOverride?: () => void
	readOnly?: boolean
	disableTooltips?: boolean
	hideOuterFrame?: boolean
	editInterceptors?: EditInterceptor[]
	onFieldPersist?: (field: string) => void
	onNotify?: (field: string) => void
	documentsGrid?: boolean
}
