import { GridCellKind } from '@glideapps/glide-data-grid'
import { describe, expect, it } from 'vitest'
import { CellFactory } from '@/shared/libs/data-grid/components/services/CellFactory'

const theme = {}
const darkTheme = {}

describe('CellFactory', () => {
	it('creates text cell', () => {
		const factory = new CellFactory({ theme, darkTheme })
		const cell = factory.createInitialCell(0, 0, { id: 'name', kind: 'text' })
		expect(cell.kind).toBe(GridCellKind.Text)
	})

	it('creates number cell with displayData', () => {
		const factory = new CellFactory({ theme, darkTheme })
		const cell = factory.createInitialCell(0, 2, {
			id: 'amount',
			kind: 'number',
		})
		expect(
			'displayData' in (cell as unknown as { displayData?: unknown })
		).toBe(true)
	})
})
