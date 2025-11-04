import {
	type GridCell,
	GridCellKind,
	type Theme,
} from '@glideapps/glide-data-grid'
import { EditingState } from '../../models/editing-state'
import type { IRowContext } from '../interfaces/IColumnType'
import type {
	IColumnDefinition,
	IDataProvider,
	IDataSource,
} from '../interfaces/IDataSource'
import { ColumnTypeRegistry } from './ColumnTypeRegistry'

export class DataProvider implements IDataProvider {
	private readonly dataSource: IDataSource
	private columnDefinitions: IColumnDefinition[]
	private readonly editingState: EditingState
	private theme: Partial<Theme>
	private isDarkTheme: boolean
	private readonly columnTypeRegistry: ColumnTypeRegistry
	private readonly cellCache: Map<string, GridCell> = new Map()
	private columnFormats: Record<string, string> = {}
	private onCellDataLoaded?: (col: number, row: number) => void

	constructor(
		dataSource: IDataSource,
		theme: Partial<Theme>,
		isDarkTheme: boolean
	) {
		this.dataSource = dataSource
		this.theme = theme
		this.isDarkTheme = isDarkTheme
		this.columnDefinitions = dataSource.getColumnDefinitions()
		this.editingState = new EditingState(
			dataSource.rowCount,
			theme,
			isDarkTheme
		)
		this.editingState.setColumnDefinitions(this.columnDefinitions)
		this.columnTypeRegistry = ColumnTypeRegistry.getInstance()
	}

	setOnCellDataLoaded(callback: (col: number, row: number) => void): void {
		this.onCellDataLoaded = callback
	}

	getCell(col: number, row: number): GridCell {
		const cacheKey = `${col}-${row}`

		const storedCell = this.editingState.getCell(col, row)
		if (storedCell) {
			// Return a copy to prevent mutation
			return { ...storedCell }
		}

		const cachedCell = this.cellCache.get(cacheKey)
		if (cachedCell) {
			// Make sure original value is stored for cached cells
			const dt = this.columnDefinitions[col]?.dataType
			const columnType = dt ? this.columnTypeRegistry.get(dt) : undefined
			if (columnType) {
				const cellValue = columnType.getCellValue(cachedCell)
				this.editingState.storeOriginalValue(row, col, cellValue)
			}
			// Return a copy to prevent mutation
			return { ...cachedCell }
		}

		const column = this.columnDefinitions[col]
		if (!column) {
			return this.createEmptyCell()
		}

		// Apply user-selected formatting if available
		const formattedColumn = this.applyColumnFormat(column)

		const columnType = this.columnTypeRegistry.get(formattedColumn.dataType)
		if (!columnType) {
			return this.createEmptyCell()
		}

		// Create row context for accessing other cells in the same row
		const rowContext: IRowContext = {
			row,
			getRowCellData: (targetCol: number) => {
				if (this.dataSource.id === 'in-memory') {
					const inMemorySource = this.dataSource as { data?: unknown[][] }
					if (
						inMemorySource.data &&
						inMemorySource.data[row] &&
						inMemorySource.data[row][targetCol] !== undefined
					) {
						return inMemorySource.data[row][targetCol]
					}
				}
				return
			},
		}

		// Check if the data source is InMemoryDataSource which has synchronous data access
		if (this.dataSource.id === 'in-memory') {
			// For InMemoryDataSource, we can get data synchronously
			const inMemorySource = this.dataSource as { data?: unknown[][] }
			if (
				inMemorySource.data &&
				inMemorySource.data[row] &&
				inMemorySource.data[row][col] !== undefined
			) {
				const value = inMemorySource.data[row][col]
				const cell = columnType.createCell({
					value,
					column: formattedColumn,
					theme: this.theme,
					isDarkTheme: this.isDarkTheme,
					rowContext,
				})
				this.cellCache.set(cacheKey, cell)

				// Store the original value
				const cellValue = columnType.getCellValue(cell)
				this.editingState.storeOriginalValue(row, col, cellValue)

				return { ...cell }
			}
		}

		// Get cell data asynchronously, but return a default cell immediately
		const defaultValue = columnType.getDefaultValue(formattedColumn)
		const cell = columnType.createCell({
			value: defaultValue,
			column: formattedColumn,
			theme: this.theme,
			isDarkTheme: this.isDarkTheme,
			rowContext,
		})

		// Asynchronously load the actual cell data and update cache
		this.dataSource
			.getCellData(col, row)
			.then((value) => {
				const updatedCell = columnType.createCell({
					value,
					column: formattedColumn,
					theme: this.theme,
					isDarkTheme: this.isDarkTheme,
					rowContext,
				})
				this.cellCache.set(cacheKey, updatedCell)

				// Store the original value in EditingState for change detection
				const cellValue = columnType.getCellValue(updatedCell)
				this.editingState.storeOriginalValue(row, col, cellValue)

				// Notify that cell data has been loaded
				if (this.onCellDataLoaded) {
					this.onCellDataLoaded(col, row)
				}
			})
			.catch((_error) => {
				// Cell data loading failed; use default cell
			})

		// Cache the default cell
		this.cellCache.set(cacheKey, cell)

		// Return a copy to prevent mutation
		return { ...cell }
	}

	setCell(col: number, row: number, value: GridCell): void {
		const column = this.columnDefinitions[col]
		if (!column?.isEditable) {
			return
		}

		// Apply user-selected formatting if available
		const formattedColumn = this.applyColumnFormat(column)

		const columnType = this.columnTypeRegistry.get(column.dataType)
		if (!columnType) {
			return
		}

		const cellValue = columnType.getCellValue(value)
		const validation = columnType.validateValue(cellValue, column)

		// Create row context for accessing other cells in the same row
		const rowContext: IRowContext = {
			row,
			getRowCellData: (targetCol: number) => {
				if (this.dataSource.id === 'in-memory') {
					const inMemorySource = this.dataSource as { data?: unknown[][] }
					if (
						inMemorySource.data &&
						inMemorySource.data[row] &&
						inMemorySource.data[row][targetCol] !== undefined
					) {
						return inMemorySource.data[row][targetCol]
					}
				}
				return
			},
		}

		// Create updated cell with validation state
		const updatedCell = columnType.createCell({
			value: cellValue,
			column: formattedColumn,
			theme: this.theme,
			isDarkTheme: this.isDarkTheme,
			rowContext,
		})

		// Store validation error information on the cell
		const cellWithValidation = updatedCell as {
			isMissingValue?: boolean
			validationError?: string | undefined
		}

		// If the cell has isMissingValue flag, preserve it (important for validation)
		if (cellWithValidation.isMissingValue === true) {
			// Already set by createCell - preserve any existing validation error
		} else if (!validation.isValid) {
			// Store the specific validation error message from the column type
			cellWithValidation.isMissingValue = true
			if (validation.error) {
				cellWithValidation.validationError = validation.error
			}
		} else if (
			column.isRequired &&
			(cellValue === null || cellValue === undefined || cellValue === '')
		) {
			// Mark as missing value for empty required fields
			cellWithValidation.isMissingValue = true
			// Don't set validationError, will use default required message
		}

		this.editingState.setCell(col, row, updatedCell)

		// Force revalidation flag for this cell so external validation UIs can pick up changes
		try {
			;(
				this as unknown as { onCellDataLoaded?: (c: number, r: number) => void }
			).onCellDataLoaded?.(col, row)
		} catch {
			// onCellDataLoaded callback failed; continue
		}

		if (validation.isValid) {
			this.dataSource.setCellData(col, row, cellValue).catch((_error) => {
				// Cell data save failed; continue
			})
		} else {
			// Clear the cache so the cell gets re-rendered with validation state
			const cacheKey = `${col}-${row}`
			this.cellCache.delete(cacheKey)
		}
	}

	getColumnDefinition(col: number): IColumnDefinition {
		return this.columnDefinitions[col] as IColumnDefinition
	}

	getRowCount(): number {
		return this.dataSource.rowCount
	}

	getColumnCount(): number {
		return this.dataSource.columnCount
	}

	async refresh(): Promise<void> {
		this.cellCache.clear()
		this.columnDefinitions = this.dataSource.getColumnDefinitions()
		this.editingState.setColumnDefinitions(this.columnDefinitions)
		await this.dataSource.refresh()
		// Sync editing state's base row count with data source after refresh
		try {
			this.editingState.setBaseRowCount?.(this.dataSource.rowCount)
		} catch {
			// setBaseRowCount failed; continue
		}
	}

	updateTheme(theme: Partial<Theme>, isDarkTheme: boolean): void {
		this.theme = theme
		this.isDarkTheme = isDarkTheme
		this.editingState.updateTheme(theme, isDarkTheme)
		this.cellCache.clear()
	}

	setColumnFormats(formats: Record<string, string>): void {
		// Find columns that have format changes and clear their cache
		const columnsToInvalidate = new Set<number>()

		this.columnDefinitions.forEach((col, idx) => {
			const oldFormat = this.columnFormats[col.id]
			const newFormat = formats[col.id]
			if (oldFormat !== newFormat) {
				columnsToInvalidate.add(idx)
			}
		})

		// Clear cache only for affected columns
		if (columnsToInvalidate.size > 0) {
			const keysToDelete: string[] = []
			this.cellCache.forEach((_, key) => {
				const parts = key.split('-')
				const colNum = Number(parts[0])
				if (Number.isFinite(colNum) && columnsToInvalidate.has(colNum)) {
					keysToDelete.push(key)
				}
			})
			for (const key of keysToDelete) {
				this.cellCache.delete(key)
			}
		}

		this.columnFormats = formats
	}

	async addRow(): Promise<number> {
		const newRowIndex = await this.dataSource.addRow()
		// Ensure editingState is aware of new row count without losing existing edits
		// We add an empty row entry to maintain consistency
		const rowCells = new Map<number, GridCell>()

		// Create row context for the new row
		const rowContext: IRowContext = {
			row: newRowIndex,
			getRowCellData: (_targetCol: number) => {
				// For new rows, return undefined since there's no data yet
				return
			},
		}

		this.columnDefinitions.forEach((col, idx) => {
			const columnType = this.columnTypeRegistry.get(col.dataType)
			if (columnType) {
				// Use the column's defaultValue instead of null
				const defaultValue = columnType.getDefaultValue(col)
				const cell = columnType.createCell({
					value: defaultValue,
					column: col,
					theme: this.theme,
					isDarkTheme: this.isDarkTheme,
					rowContext,
				})
				rowCells.set(idx, cell)
			}
		})
		this.editingState.addRow(rowCells)
		return newRowIndex
	}

	async deleteRow(row: number): Promise<boolean> {
		const success = await this.dataSource.deleteRow(row)
		if (success) {
			this.editingState.deleteRow(row)
		}
		return success
	}

	getDeletedRows(): Set<number> {
		const combined = new Set<number>([
			...this.dataSource.getDeletedRows(),
			...this.editingState.getDeletedRows(),
		])
		return combined
	}

	private createEmptyCell(): GridCell {
		return {
			kind: GridCellKind.Text,
			data: '',
			displayData: '',
			allowOverlay: false,
		}
	}

	private applyColumnFormat(column: IColumnDefinition): IColumnDefinition {
		const format = this.columnFormats[column.id]
		if (!format) {
			return column
		}

		// Create a new column definition with the selected format
		return {
			...column,
			formatting: {
				...column.formatting,
				type: format,
			},
		}
	}

	getEditingState(): EditingState {
		return this.editingState
	}
}
