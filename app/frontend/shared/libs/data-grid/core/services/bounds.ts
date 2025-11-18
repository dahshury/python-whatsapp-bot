import type { DataEditorRef } from '@glideapps/glide-data-grid'

export function createGetBoundsForCell(
	dataEditorRef: React.RefObject<DataEditorRef | null>
) {
	return (col: number, row: number) => {
		if (!dataEditorRef.current) {
			return
		}
		const api = dataEditorRef.current as unknown as {
			getBounds?: (
				c: number,
				r: number
			) => { x: number; y: number; width: number; height: number }
		}
		return api.getBounds ? api.getBounds(col, row) : undefined
	}
}
