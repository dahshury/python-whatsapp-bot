const COLUMN_INDEX_PATTERN = /^col_(\d+)$/;

export function getPinnedColumnsFromConfig(
	columnConfigMapping: Map<string, { pinned?: boolean }>
): number[] {
	const pinned: number[] = [];
	for (const [key, config] of columnConfigMapping.entries()) {
		if (!config?.pinned) {
			continue;
		}
		const match = key.match(COLUMN_INDEX_PATTERN);
		if (match?.[1]) {
			const index = Number.parseInt(match[1], 10);
			pinned.push(index);
		}
	}
	return pinned;
}
