import { type GridCell, GridCellKind } from '@glideapps/glide-data-grid'
import { describe, expect, it } from 'vitest'
import {
	normalizeTempusDateCell,
	normalizeTimekeeperCell,
} from '@/shared/libs/data-grid/components/services/DateTimeCellFormatter'

describe('DateTimeCellFormatter', () => {
	it('normalizes tempus-date-cell', () => {
		const date = new Date('2025-01-01T00:00:00Z')
		const cell: GridCell = {
			kind: GridCellKind.Custom,
			data: { kind: 'tempus-date-cell', format: 'date', date },
		} as GridCell
		const res = normalizeTempusDateCell(cell, 'date', {
			date: 'localized',
		})
		expect(
			(res as GridCell & { data?: { displayDate?: unknown } })?.data
				?.displayDate
		).toBeTypeOf('string')
	})

	it('normalizes timekeeper-cell', () => {
		const date = new Date('1970-01-01T12:30:00')
		const cell: GridCell = {
			kind: GridCellKind.Custom,
			data: { kind: 'timekeeper-cell', time: date, use24Hour: true },
		} as GridCell
		const res = normalizeTimekeeperCell(cell, 'time', {
			time: 'automatic',
		})
		expect(
			(res as GridCell & { data?: { displayTime?: unknown } })?.data
				?.displayTime
		).toBeTypeOf('string')
	})
})
