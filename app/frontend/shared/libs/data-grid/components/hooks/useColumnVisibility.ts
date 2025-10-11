import { useCallback, useState } from "react";
import type { BaseColumnProps } from "../core/types";

export interface ColumnVisibilityState {
	hiddenColumns: Set<string>;
}

export function useColumnVisibility(initialHiddenColumns: string[] = []) {
	const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(initialHiddenColumns));

	const hideColumn = useCallback((columnId: string) => {
		setHiddenColumns((prev) => new Set([...prev, columnId]));
	}, []);

	const showColumn = useCallback((columnId: string) => {
		setHiddenColumns((prev) => {
			const newSet = new Set(prev);
			newSet.delete(columnId);
			return newSet;
		});
	}, []);

	const toggleColumnVisibility = useCallback((columnId: string) => {
		setHiddenColumns((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(columnId)) {
				newSet.delete(columnId);
			} else {
				newSet.add(columnId);
			}
			return newSet;
		});
	}, []);

	const isColumnHidden = useCallback(
		(columnId: string): boolean => {
			return hiddenColumns.has(columnId);
		},
		[hiddenColumns]
	);

	const getVisibleColumns = useCallback(
		(columns: BaseColumnProps[]): BaseColumnProps[] => {
			return columns.filter((column) => !hiddenColumns.has(column.id));
		},
		[hiddenColumns]
	);

	const getHiddenColumns = useCallback(
		(columns: BaseColumnProps[]): BaseColumnProps[] => {
			return columns.filter((column) => hiddenColumns.has(column.id));
		},
		[hiddenColumns]
	);

	const showAllColumns = useCallback(() => {
		setHiddenColumns(new Set());
	}, []);

	const hideAllColumns = useCallback((columns: BaseColumnProps[]) => {
		const allColumnIds = columns.map((col) => col.id);
		setHiddenColumns(new Set(allColumnIds));
	}, []);

	return {
		hiddenColumns,
		hideColumn,
		showColumn,
		toggleColumnVisibility,
		isColumnHidden,
		getVisibleColumns,
		getHiddenColumns,
		showAllColumns,
		hideAllColumns,
		hiddenColumnsCount: hiddenColumns.size,
	};
}
