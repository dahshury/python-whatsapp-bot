import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type GridColumn,
	type Item,
	type Theme,
} from '@glideapps/glide-data-grid'
import React from 'react'
import type { GridColumnConfig } from '../../types/grid-data'
import { EditingState } from '../models/editing-state'
import { CellFactory, type SampleDataProvider } from '../services/CellFactory'
import {
	normalizeTempusDateCell,
	normalizeTimekeeperCell,
} from '../services/DateTimeCellFormatter'
import { FormattingService } from '../services/FormattingService'
import {
	ValidationService,
	type ValidatorRegistry,
} from '../services/ValidationService'

// Removed name-specific validation and i18n coupling

// Removed local sample data generator and cell builder; using CellFactory and services

type UseGridDataOptions = {
	visibleColumnIndices: number[]
	theme: Partial<Theme>
	darkTheme: Partial<Theme>
	initialNumRows: number
	columnFormats?: Record<string, string>
	columns?: GridColumn[]
	options?: {
		columnConfigs?: GridColumnConfig[]
		validators?: ValidatorRegistry
		sampleDataProvider?: SampleDataProvider
	}
}

export function useGridData(params: UseGridDataOptions) {
	const {
		visibleColumnIndices,
		theme,
		darkTheme,
		initialNumRows,
		columnFormats,
		columns,
		options,
	} = params
	const editingState = React.useRef(
		new EditingState(initialNumRows, theme, theme === darkTheme)
	)

	const validationService = React.useMemo(() => {
		const configs = options?.columnConfigs || []
		const registry = options?.validators || {}
		return new ValidationService(registry, configs)
	}, [options?.columnConfigs, options?.validators])

	const cellFactory = React.useMemo(
		() =>
			new CellFactory({
				theme,
				darkTheme,
				sampleDataProvider: options?.sampleDataProvider,
			}),
		[theme, darkTheme, options?.sampleDataProvider]
	)

	const getRawCellContent = React.useCallback(
		(col: number, row: number): GridCell => {
			const storedCell = editingState.current.getCell(col, row)
			if (storedCell) {
				// Ensure numeric cells have formatted display
				// Ensure numeric cells have formatted display
				let workingCell: GridCell = storedCell
				if (storedCell.kind === GridCellKind.Number) {
					const raw = (storedCell as GridCell & { data?: unknown }).data
					const columnId = columns?.[col]?.id
					const key = (columnId ?? 'number') as string
					const format = String(
						columnFormats?.[key] || columnFormats?.number || 'number'
					)
					const formatted =
						raw !== undefined && raw !== null
							? FormattingService.formatValue(raw, 'number', format)
							: ''
					workingCell = {
						...storedCell,
						displayData: formatted,
					} as unknown as GridCell
				}

				// Normalize and validate custom cells
				const columnId = columns?.[col]?.id
				let normalized = normalizeTempusDateCell(
					workingCell,
					columnId ?? undefined,
					columnFormats
				)
				normalized = normalizeTimekeeperCell(
					normalized,
					columnId ?? undefined,
					columnFormats
				)
				const value: unknown = (normalized as { data?: unknown }).data
				const result = validationService.validate(columnId ?? undefined, value)
				if (!result.isValid) {
					;(normalized as { isMissingValue?: boolean }).isMissingValue = true
					if (result.code) {
						;(
							normalized as { validationErrorCode?: string }
						).validationErrorCode = result.code
					}
				}
				return normalized
			}
			const columnId = columns?.[col]?.id
			const config =
				options?.columnConfigs?.find((c) => c.id === columnId) ||
				options?.columnConfigs?.[col] ||
				({ id: columnId ?? String(col), kind: 'text' } as GridColumnConfig)
			let cell = cellFactory.createInitialCell(row, col, config)
			if (cell.kind === GridCellKind.Number) {
				const raw = (cell as GridCell & { data?: unknown }).data
				const key = (columnId ?? 'number') as string
				const format = String(
					columnFormats?.[key] || columnFormats?.number || 'number'
				)
				const displayData =
					raw !== undefined && raw !== null
						? FormattingService.formatValue(raw, 'number', format)
						: ''
				cell = { ...cell, displayData } as unknown as GridCell
			}

			// Normalize date/time custom cells and run validation based on column id
			let normalized = normalizeTempusDateCell(
				cell,
				columnId ?? undefined,
				columnFormats
			)
			normalized = normalizeTimekeeperCell(
				normalized,
				columnId ?? undefined,
				columnFormats
			)
			const value: unknown = (normalized as { data?: unknown }).data
			const result = validationService.validate(columnId ?? undefined, value)
			if (!result.isValid) {
				;(normalized as { isMissingValue?: boolean }).isMissingValue = true
				if (result.code) {
					;(
						normalized as { validationErrorCode?: string }
					).validationErrorCode = result.code
				}
			}
			return normalized
		},
		[
			columnFormats,
			columns,
			cellFactory,
			validationService,
			options?.columnConfigs,
		]
	)

	const normalizeEditedCell = React.useCallback(
		(cell: EditableGridCell, col?: number): GridCell => {
			// Ensure essential props like displayData are present so the grid renders the updated value immediately
			switch (cell.kind) {
				case GridCellKind.Text: {
					const text = (cell as GridCell & { data?: string }).data ?? ''
					return {
						kind: GridCellKind.Text,
						data: text,
						displayData: text,
						allowOverlay: true,
					} as GridCell
				}
				case GridCellKind.Number: {
					const num = (cell as GridCell & { data?: unknown }).data ?? 0
					const columnId = columns?.[col || 0]?.id
					const key = (columnId ?? 'number') as string
					const format = String(
						columnFormats?.[key] || columnFormats?.number || 'number'
					)
					return {
						kind: GridCellKind.Number,
						data: num,
						displayData: FormattingService.formatValue(
							Number(num),
							'number',
							String(format)
						),
						allowOverlay: true,
					} as GridCell
				}
				case GridCellKind.Custom: {
					const columnId = columns?.[col || 0]?.id
					let normalized = normalizeTempusDateCell(
						cell as unknown as GridCell,
						columnId,
						columnFormats
					)
					normalized = normalizeTimekeeperCell(
						normalized,
						columnId,
						columnFormats
					)
					return normalized as unknown as GridCell
				}
				default:
					// For other cells, assume full data provided
					return cell as unknown as GridCell
			}
		},
		[columnFormats, columns]
	)

	const onCellEdited = React.useCallback(
		(visibleRows: readonly number[]) =>
			(cell: Item, newValue: EditableGridCell) => {
				const [displayCol, displayRow] = cell
				const actualCol = visibleColumnIndices[displayCol]
				const actualRow = visibleRows[displayRow]

				if (actualRow !== undefined && actualCol !== undefined) {
					const normalized = normalizeEditedCell(newValue, actualCol)
					editingState.current.setCell(actualCol, actualRow, normalized)
				}
			},
		[visibleColumnIndices, normalizeEditedCell]
	)

	const getCellContent = React.useCallback(
		(visibleRows: readonly number[]) =>
			(cell: Item): GridCell => {
				const [displayCol, displayRow] = cell
				const actualCol = visibleColumnIndices[displayCol]
				const actualRow = visibleRows[displayRow]

				if (actualRow === undefined || actualCol === undefined) {
					return {
						kind: GridCellKind.Text,
						data: '',
						displayData: '',
						allowOverlay: false,
					}
				}

				return getRawCellContent(actualCol, actualRow)
			},
		[visibleColumnIndices, getRawCellContent]
	)

	return { editingState, getCellContent, onCellEdited, getRawCellContent }
}
