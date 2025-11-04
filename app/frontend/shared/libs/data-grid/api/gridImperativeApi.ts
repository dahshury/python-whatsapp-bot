import type { DataEditorRef } from '@glideapps/glide-data-grid'
import type { GridRef } from '../core/types/grid'

export function createGridImperativeApi(
	dataEditorRef: React.RefObject<DataEditorRef | null>
): GridRef {
	return {
		updateCells: (cells) => {
			try {
				dataEditorRef.current?.updateCells(cells)
			} catch {
				/* ignore api update error */
			}
		},
	}
}
