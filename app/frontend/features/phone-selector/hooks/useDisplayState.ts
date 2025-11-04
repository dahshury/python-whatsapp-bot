export function useDisplayState(
	canCreateNew: boolean,
	hasFilteredItems: boolean,
	search: string
) {
	const showCreatePanel = canCreateNew && !hasFilteredItems
	const showCreateShortcut = canCreateNew && hasFilteredItems
	const showNoResults =
		!(canCreateNew || hasFilteredItems) && Boolean(search.trim())
	const showNoData = !(canCreateNew || hasFilteredItems || search.trim())

	return {
		showCreatePanel,
		showCreateShortcut,
		showNoResults,
		showNoData,
	}
}
