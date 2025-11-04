import type { EditableGridCell, Item } from '@glideapps/glide-data-grid'

export type CellEditContext = {
	cell: Item
	newValue: EditableGridCell
	/** Map from displayRow index -> actualRow index as used by data provider */
	visibleRows: readonly number[]
	/** Map from displayCol index -> actualCol index */
	visibleColumns: readonly number[]
	/** Optional extra bag for feature-specific data */
	extras?: Record<string, unknown>
}

export type CellEditInterceptor = (
	ctx: CellEditContext
) => boolean | undefined | Promise<boolean | undefined>

export function composeInterceptors(
	interceptors: CellEditInterceptor[]
): (ctx: CellEditContext) => Promise<boolean> {
	return async (ctx: CellEditContext) => {
		for (const interceptor of interceptors) {
			try {
				const result = await interceptor(ctx)
				if (result === true) {
					return true
				}
			} catch {
				// Ignore interceptor errors to avoid blocking baseline editing
			}
		}
		return false
	}
}
