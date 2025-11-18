import type { GridColumn } from '@glideapps/glide-data-grid'
import { DEFAULT_COLUMN_WIDTH } from '../constants/grid'

type Bounds = { x: number; y: number; width: number; height: number }

export function createOpenColumnMenu(columnMenu: {
	openMenu: (column: unknown, x: number, y: number) => void
}) {
	return (column: GridColumn, bounds: Bounds) => {
		if (!column) {
			return
		}
		columnMenu.openMenu(
			{
				id: (column as { id?: string }).id,
				name: (column as { id?: string }).id,
				title: (column as { title?: string }).title,
				width: (column as { width?: number }).width ?? DEFAULT_COLUMN_WIDTH,
				isEditable: Boolean((column as { isEditable?: boolean }).isEditable),
				isHidden: Boolean((column as { isHidden?: boolean }).isHidden),
				isPinned: false,
				isRequired: Boolean((column as { isRequired?: boolean }).isRequired),
				isIndex: false,
				indexNumber: 0,
			},
			bounds.x + bounds.width,
			bounds.y + bounds.height
		)
	}
}
