import { COL_KEY_RE } from '../../core/constants/grid'
import type { GridStateStorage } from '../../core/persistence/gridStateStorage'
import type { ColumnConfig } from '../../core/types/grid'

export function computePinnedColumns(
	columnConfigMapping: Map<string, ColumnConfig>
): number[] {
	const pinned: number[] = []
	for (const [key, config] of columnConfigMapping.entries()) {
		if (!config?.pinned) {
			continue
		}
		const match = key.match(COL_KEY_RE)
		if (match?.[1]) {
			const index = Number.parseInt(match[1], 10)
			pinned.push(index)
		}
	}
	return pinned
}

export function computeGridWidth(args: {
	isFullscreen: boolean
	fullWidth: boolean
	containerWidth?: number
	calculatedWidth: number
}): number | undefined {
	const { isFullscreen, fullWidth, containerWidth, calculatedWidth } = args
	if (isFullscreen) {
		return
	}
	if (fullWidth) {
		if (containerWidth && containerWidth > 0) {
			return containerWidth
		}
		return
	}
	return calculatedWidth
}

export function computeHasPersistedState(
	storage: GridStateStorage,
	key: string
): boolean {
	return storage.exists(key)
}
