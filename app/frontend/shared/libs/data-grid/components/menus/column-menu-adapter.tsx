import type { BaseColumnProps } from "../core/types";
import { ColumnMenu } from "./column-menu";

type MenuState = {
	isOpen: boolean;
	column?: BaseColumnProps | null;
	position?: { x: number; y: number } | null;
};

type SortState = {
	columnId?: string;
	direction?: "asc" | "desc" | null;
};

type ColumnMenuAdapterProps = {
	menuState: MenuState;
	onClose: () => void;
	onSort: (columnId: string, direction: "asc" | "desc") => void;
	onPin: (columnId: string, side: "left" | "right") => void;
	onUnpin: (columnId: string) => void;
	onHide: (columnId: string) => void;
	onAutosize: (columnId: string) => void;
	onChangeFormat: (columnId: string, format: string) => void;
	columnConfigMapping: Map<string, { pinned?: boolean }>;
	displayColumns: Array<{ id: string }>;
	sortState?: SortState | null;
	isDarkTheme: boolean;
};

export function ColumnMenuAdapter({
	menuState,
	onClose,
	onSort,
	onPin,
	onUnpin,
	onHide,
	onAutosize,
	onChangeFormat,
	columnConfigMapping,
	displayColumns,
	sortState,
	isDarkTheme,
}: ColumnMenuAdapterProps) {
	if (!(menuState.isOpen && menuState.column)) {
		return null;
	}

	const colId = menuState.column.id;
	const byIdPinned = columnConfigMapping.get(colId)?.pinned === true;
	const displayIdx = displayColumns.findIndex((c) => c.id === colId);
	const legacyKey = displayIdx >= 0 ? `col_${displayIdx}` : undefined;
	const isPinned =
		byIdPinned ||
		(legacyKey ? columnConfigMapping.get(legacyKey)?.pinned === true : false);

	const sortDirection =
		sortState?.columnId === colId ? (sortState?.direction ?? null) : null;

	return (
		<ColumnMenu
			column={menuState.column as BaseColumnProps}
			isDarkTheme={isDarkTheme}
			isPinned={isPinned ? "left" : false}
			onAutosize={onAutosize}
			onChangeFormat={(columnId, format) => onChangeFormat(columnId, format)}
			onClose={onClose}
			onHide={onHide}
			onPin={(columnId, side) => onPin(columnId, side)}
			onSort={onSort}
			onUnpin={onUnpin}
			position={menuState.position || { x: 0, y: 0 }}
			sortDirection={sortDirection || null}
		/>
	);
}
