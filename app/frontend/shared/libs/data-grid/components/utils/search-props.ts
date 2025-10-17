export function getSearchProps(gs: {
	searchValue: string;
	setSearchValue: (v: string) => void;
	showSearch: boolean;
	setShowSearch: (v: boolean) => void;
}) {
	return {
		searchValue: gs.searchValue,
		onSearchValueChange: gs.setSearchValue,
		showSearch: gs.showSearch,
		onSearchClose: () => {
			gs.setShowSearch(false);
			gs.setSearchValue("");
		},
	} as const;
}
