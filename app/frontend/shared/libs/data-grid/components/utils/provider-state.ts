export function clearEditingAndCacheForCells(
	providerLike: unknown,
	cells: Array<{ col: number; row: number }>
): void {
	try {
		const provider = (providerLike || {}) as unknown as {
			cellCache?: Map<string, unknown>;
			editingState?: {
				editedCells?: Map<number, Map<number, unknown>>;
			};
		};

		// Clear editing state entries for specified cells
		if (provider.editingState?.editedCells) {
			for (const { col, row } of cells) {
				try {
					const rowMap = provider.editingState.editedCells.get(row);
					rowMap?.delete(col);
				} catch {
					// Silently ignore errors when deleting from cache
				}
			}
		}

		// Clear cell cache entries for specified cells
		if (provider.cellCache) {
			for (const { col, row } of cells) {
				try {
					provider.cellCache.delete(`${col}-${row}`);
				} catch {
					// Silently ignore errors when deleting from cache
				}
			}
		}
	} catch {
		// Gracefully ignore all errors in provider state manipulation
	}
}
