import type { GridColumn, Theme } from '@glideapps/glide-data-grid'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useGridData } from '@/shared/libs/data-grid/components/hooks/useGridData'

describe('useGridData hook', () => {
	const theme: Partial<Theme> = {}
	const darkTheme: Partial<Theme> = {}

	it('returns editingState and functions', () => {
		const FIVE = 5
		const { result } = renderHook(() =>
			useGridData({
				visibleColumnIndices: [0, 1, 2],
				theme,
				darkTheme,
				initialNumRows: FIVE,
				columnFormats: { number: 'automatic' },
				columns: [
					{ id: 'name' } as GridColumn,
					{ id: 'status' } as GridColumn,
					{ id: 'amount' } as GridColumn,
				],
			})
		)

		expect(result.current).toHaveProperty('editingState')
		expect(typeof result.current.getCellContent).toBe('function')
	})
})
