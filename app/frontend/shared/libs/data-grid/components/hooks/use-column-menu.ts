import { useCallback, useState } from "react";
import type { BaseColumnProps } from "../core/types";

export type ColumnMenuState = {
	isOpen: boolean;
	column: BaseColumnProps | null;
	position: { x: number; y: number };
};

export function useColumnMenu() {
	const [menuState, setMenuState] = useState<ColumnMenuState>({
		isOpen: false,
		column: null,
		position: { x: 0, y: 0 },
	});

	const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
	const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
	const [pinnedColumns, setPinnedColumns] = useState<{
		left: Set<string>;
		right: Set<string>;
	}>({
		left: new Set(),
		right: new Set(),
	});
	const [columnFormats, setColumnFormats] = useState<Record<string, string>>(
		{}
	);

	const openMenu = useCallback(
		(column: BaseColumnProps, x: number, y: number) => {
			setMenuState({
				isOpen: true,
				column,
				position: { x, y },
			});
		},
		[]
	);

	const closeMenu = useCallback(() => {
		setMenuState({
			isOpen: false,
			column: null,
			position: { x: 0, y: 0 },
		});
	}, []);

	const sortColumn = useCallback(
		(_columnId: string, _direction: "asc" | "desc") => {
			closeMenu();
		},
		[closeMenu]
	);

	const pinColumn = useCallback(
		(columnId: string, side: "left" | "right") => {
			setPinnedColumns((prev) => ({
				...prev,
				[side]: new Set([...prev[side], columnId]),
				[side === "left" ? "right" : "left"]: new Set(
					[...prev[side === "left" ? "right" : "left"]].filter(
						(id) => id !== columnId
					)
				),
			}));
			closeMenu();
		},
		[closeMenu]
	);

	const unpinColumn = useCallback(
		(columnId: string) => {
			setPinnedColumns((prev) => ({
				left: new Set([...prev.left].filter((id) => id !== columnId)),
				right: new Set([...prev.right].filter((id) => id !== columnId)),
			}));
			closeMenu();
		},
		[closeMenu]
	);

	const hideColumn = useCallback(
		(columnId: string) => {
			setHiddenColumns((prev) => new Set([...prev, columnId]));
			closeMenu();
		},
		[closeMenu]
	);

	const autosizeColumn = useCallback(
		(columnId: string) => {
			// Simple autosize - could be enhanced with actual measurement
			setColumnWidths((prev) => ({
				...prev,
				[columnId]: 150, // Default auto-sized width
			}));
			closeMenu();
		},
		[closeMenu]
	);

	const changeFormat = useCallback(
		(columnId: string, format: string) => {
			setColumnFormats((prev) => ({
				...prev,
				[columnId]: format,
			}));
			closeMenu();
		},
		[closeMenu]
	);

	const getPinnedSide = useCallback(
		(columnId: string): "left" | "right" | false => {
			if (pinnedColumns.left.has(columnId)) {
				return "left";
			}
			if (pinnedColumns.right.has(columnId)) {
				return "right";
			}
			return false;
		},
		[pinnedColumns]
	);

	const isColumnHidden = useCallback(
		(columnId: string): boolean => hiddenColumns.has(columnId),
		[hiddenColumns]
	);

	const getColumnWidth = useCallback(
		(columnId: string): number | undefined => columnWidths[columnId],
		[columnWidths]
	);

	const getColumnFormat = useCallback(
		(columnId: string): string | undefined => columnFormats[columnId],
		[columnFormats]
	);

	return {
		menuState,
		openMenu,
		closeMenu,
		sortColumn,
		pinColumn,
		unpinColumn,
		hideColumn,
		autosizeColumn,
		changeFormat,
		getPinnedSide,
		isColumnHidden,
		getColumnWidth,
		getColumnFormat,
		hiddenColumns,
		pinnedColumns,
		columnWidths,
		columnFormats,
	};
}
