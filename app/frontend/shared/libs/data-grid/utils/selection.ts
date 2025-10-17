import {
	CompactSelection,
	type GridSelection,
} from "@glideapps/glide-data-grid";

type GridStateApi = {
	setSelection: (selection: GridSelection) => void;
	setRowSelection: (rows: CompactSelection) => void;
};

export function clearSelection(gs: GridStateApi) {
	gs.setSelection({
		rows: CompactSelection.empty(),
		columns: CompactSelection.empty(),
	});
	gs.setRowSelection(CompactSelection.empty());
}
