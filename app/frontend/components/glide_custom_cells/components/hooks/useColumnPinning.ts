import { useCallback, useMemo, useState } from "react";
import type { BaseColumnProps } from "../core/types";
import { moveArrayItem } from "../utils/generalUtils";

export interface PinnedColumns {
	left: string[];
	right: string[];
}

export function useColumnPinning(columns: BaseColumnProps[]) {
	const [pinnedColumns, setPinnedColumns] = useState<PinnedColumns>({
		left: [],
		right: [],
	});

	const pinColumn = useCallback((columnId: string, side: "left" | "right") => {
		setPinnedColumns((prev) => {
			const newPinned = { ...prev };

			// Remove from other side if it exists
			const otherSide = side === "left" ? "right" : "left";
			newPinned[otherSide] = newPinned[otherSide].filter(
				(id) => id !== columnId,
			);

			// Add to specified side if not already there
			if (!newPinned[side].includes(columnId)) {
				newPinned[side] = [...newPinned[side], columnId];
			}

			return newPinned;
		});
	}, []);

	const unpinColumn = useCallback((columnId: string) => {
		setPinnedColumns((prev) => ({
			left: prev.left.filter((id) => id !== columnId),
			right: prev.right.filter((id) => id !== columnId),
		}));
	}, []);

	const movePinnedColumn = useCallback(
		(columnId: string, side: "left" | "right", newIndex: number) => {
			setPinnedColumns((prev) => {
				const newPinned = { ...prev };
				const currentIndex = newPinned[side].indexOf(columnId);

				if (currentIndex !== -1) {
					newPinned[side] = moveArrayItem(
						newPinned[side],
						currentIndex,
						newIndex,
					);
				}

				return newPinned;
			});
		},
		[],
	);

	const orderedColumns = useMemo(() => {
		const leftPinned = pinnedColumns.left
			.map((id) => columns.find((col) => col.id === id))
			.filter(Boolean) as BaseColumnProps[];

		const rightPinned = pinnedColumns.right
			.map((id) => columns.find((col) => col.id === id))
			.filter(Boolean) as BaseColumnProps[];

		const unpinned = columns.filter(
			(col) =>
				!pinnedColumns.left.includes(col.id) &&
				!pinnedColumns.right.includes(col.id),
		);

		return {
			leftPinned,
			unpinned,
			rightPinned,
			all: [...leftPinned, ...unpinned, ...rightPinned],
		};
	}, [columns, pinnedColumns]);

	const isPinned = useCallback(
		(columnId: string): "left" | "right" | false => {
			if (pinnedColumns.left.includes(columnId)) return "left";
			if (pinnedColumns.right.includes(columnId)) return "right";
			return false;
		},
		[pinnedColumns],
	);

	const canPin = useCallback(
		(columnId: string): boolean => {
			const column = columns.find((col) => col.id === columnId);
			return column ? !column.isIndex : false;
		},
		[columns],
	);

	return {
		pinnedColumns,
		pinColumn,
		unpinColumn,
		movePinnedColumn,
		orderedColumns,
		isPinned,
		canPin,
	};
}
