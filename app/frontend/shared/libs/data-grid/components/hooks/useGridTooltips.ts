import { useLanguage } from '@shared/libs/state/language-context'
import { useCallback, useRef, useState } from 'react'
import { i18n } from '@/shared/libs/i18n'

export const TOOLTIP_DEBOUNCE_MS = 2000

export const getRequiredCellTooltip = () => '⚠️ This field is required'

export type TooltipState = {
	content: string
	left: number
	top: number
	fieldLabel?: string
	message?: string
	width?: number
}

export type TooltipsReturn = {
	tooltip: TooltipState | undefined
	clearTooltip: () => void
	onItemHovered: (args: {
		kind: 'header' | 'cell'
		location?: [number, number]
		bounds?: { x: number; y: number; width: number; height: number }
	}) => void
}

function hasTooltip(cell: unknown): cell is { tooltip: string } {
	return (
		!!cell &&
		typeof cell === 'object' &&
		cell !== null &&
		typeof (cell as { tooltip?: unknown }).tooltip === 'string'
	)
}

function isMissingValueCell(cell: unknown): boolean {
	return (
		!!cell &&
		typeof cell === 'object' &&
		cell !== null &&
		(cell as { isMissingValue?: boolean }).isMissingValue === true
	)
}

function isErrorCell(cell: unknown): cell is { errorDetails: string } {
	return (
		!!cell &&
		typeof cell === 'object' &&
		cell !== null &&
		(cell as { isError?: boolean; errorDetails?: unknown }).isError === true &&
		typeof (cell as { errorDetails?: unknown }).errorDetails === 'string'
	)
}

export function useGridTooltips(
	getCellContent: (cell: readonly [number, number]) => unknown,
	columns: Array<{ isRequired?: boolean; isEditable?: boolean; help?: string }>,
	validationErrors?: Array<{
		row: number
		col: number
		message: string
		fieldName?: string
	}>,
	getBoundsForCell?: (
		col: number,
		row: number
	) => { x: number; y: number; width: number; height: number } | undefined
) {
	const [tooltip, setTooltip] = useState<TooltipState | undefined>()
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)
	const { isLocalized } = useLanguage()

	const clearTooltip = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
		setTooltip(undefined)
	}, [])

	const formatFieldLabel = useCallback(
		(field?: string): string => {
			const f = String(field || '').toLowerCase()
			if (!(isLocalized && f)) {
				return f
			}
			const label = i18n.getMessage(`field_${f}`, isLocalized)
			return (
				label || f.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
			)
		},
		[isLocalized]
	)

	const onItemHovered = useCallback(
		(args: {
			kind: 'header' | 'cell'
			location?: [number, number]
			bounds?: { x: number; y: number; width: number; height: number }
		}) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
			setTooltip(undefined)

			if ((args.kind === 'header' || args.kind === 'cell') && !!args.location) {
				const colIdx = args.location[0]
				const rowIdx = args.location[1]
				let tooltipContent: string | undefined
				let fieldLabel: string | undefined
				let message: string | undefined

				if (colIdx < 0 || colIdx >= columns.length) {
					return
				}

				const column = columns[colIdx]

				if (args.kind === 'header' && column) {
					tooltipContent = column.help as string | undefined
				} else if (args.kind === 'cell' && rowIdx >= 0) {
					try {
						const cell = getCellContent([colIdx, rowIdx])

						// Check for validation errors first (highest priority)
						if (validationErrors && validationErrors.length > 0) {
							const cellValidationError = validationErrors.find(
								(error) => error.row === rowIdx && error.col === colIdx
							)
							if (cellValidationError) {
								fieldLabel = formatFieldLabel(cellValidationError.fieldName)
								message = cellValidationError.message
								tooltipContent = fieldLabel
									? `${fieldLabel}: ${cellValidationError.message}`
									: `${cellValidationError.message}`
							}
						}

						// Fallback to cell-level errors
						if (!tooltipContent && isErrorCell(cell)) {
							message = cell.errorDetails
							tooltipContent = cell.errorDetails
						}

						// Required field missing value
						if (
							!tooltipContent &&
							column &&
							!!column.isRequired &&
							!!column.isEditable &&
							isMissingValueCell(cell)
						) {
							message = getRequiredCellTooltip()
							tooltipContent = message
						}

						// Cell-specific tooltip
						if (!tooltipContent && hasTooltip(cell)) {
							message = (cell as { tooltip: string }).tooltip
							tooltipContent = message
						}
					} catch {
						// ignore errors
					}
				}

				if (tooltipContent) {
					timeoutRef.current = setTimeout(() => {
						let bx: number | undefined
						let by: number | undefined
						let bw: number | undefined
						if (getBoundsForCell && args.location) {
							const b = getBoundsForCell(args.location[0], args.location[1])
							if (b) {
								bx = b.x
								by = b.y
								bw = b.width
							}
						}
						// Fallback to event bounds
						if ((bx === undefined || by === undefined) && args.bounds) {
							bx = args.bounds.x
							by = args.bounds.y
							bw = args.bounds.width
						}
						if (bx !== undefined && by !== undefined && tooltipContent) {
							setTooltip({
								content: tooltipContent,
								left: bx + (bw ?? 0) / 2,
								top: by,
								...(fieldLabel && { fieldLabel }),
								...(message && { message }),
								...(bw && { width: bw }),
							})
						}
					}, TOOLTIP_DEBOUNCE_MS)
				}
			}
		},
		[
			columns,
			getCellContent,
			validationErrors,
			formatFieldLabel,
			getBoundsForCell,
		]
	)

	return { tooltip, clearTooltip, onItemHovered }
}
