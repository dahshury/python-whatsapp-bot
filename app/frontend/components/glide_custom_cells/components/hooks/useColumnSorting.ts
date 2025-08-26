import { useCallback, useMemo, useState } from "react";
import type { BaseColumnProps } from "../core/types";
import { toSafeString } from "../utils/generalUtils";

export type SortDirection = "asc" | "desc";

export interface SortRule {
	columnId: string;
	direction: SortDirection;
}

export interface SortState {
	rules: SortRule[];
	isMultiSort: boolean;
}

export function useColumnSorting(
	columns: BaseColumnProps[],
	data: unknown[][],
	maxSortRules: number = 3,
) {
	const [sortState, setSortState] = useState<SortState>({
		rules: [],
		isMultiSort: false,
	});

	const toggleSort = useCallback(
		(columnId: string) => {
			setSortState((prev) => {
				const existingRuleIndex = prev.rules.findIndex(
					(rule) => rule.columnId === columnId,
				);

				if (existingRuleIndex !== -1) {
					const existingRule = prev.rules[existingRuleIndex];
					const newRules = [...prev.rules];

					if (existingRule.direction === "asc") {
						newRules[existingRuleIndex] = {
							...existingRule,
							direction: "desc",
						};
					} else {
						newRules.splice(existingRuleIndex, 1);
					}

					return { ...prev, rules: newRules };
				} else {
					const newRule: SortRule = { columnId, direction: "asc" };

					if (prev.isMultiSort) {
						const newRules = [...prev.rules, newRule];
						if (newRules.length > maxSortRules) {
							newRules.shift();
						}
						return { ...prev, rules: newRules };
					} else {
						return { ...prev, rules: [newRule] };
					}
				}
			});
		},
		[maxSortRules],
	);

	const clearSort = useCallback(() => {
		setSortState((prev) => ({ ...prev, rules: [] }));
	}, []);

	const toggleMultiSort = useCallback(() => {
		setSortState((prev) => ({
			...prev,
			isMultiSort: !prev.isMultiSort,
			rules: prev.isMultiSort ? prev.rules.slice(0, 1) : prev.rules,
		}));
	}, []);

	const getSortDirection = useCallback(
		(columnId: string): SortDirection | null => {
			const rule = sortState.rules.find((rule) => rule.columnId === columnId);
			return rule?.direction ?? null;
		},
		[sortState.rules],
	);

	const getSortIndex = useCallback(
		(columnId: string): number => {
			return sortState.rules.findIndex((rule) => rule.columnId === columnId);
		},
		[sortState.rules],
	);

	const compareValues = useCallback(
		(a: unknown, b: unknown, direction: SortDirection): number => {
			const aStr = toSafeString(a).toLowerCase();
			const bStr = toSafeString(b).toLowerCase();

			// Try numeric comparison first
			const aNum = Number(a);
			const bNum = Number(b);

			if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
				const result = aNum - bNum;
				return direction === "asc" ? result : -result;
			}

			// Date comparison
			const aDate = new Date(String(a));
			const bDate = new Date(String(b));

			if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) {
				const result = aDate.getTime() - bDate.getTime();
				return direction === "asc" ? result : -result;
			}

			// String comparison
			const result = aStr.localeCompare(bStr);
			return direction === "asc" ? result : -result;
		},
		[],
	);

	const sortedData = useMemo(() => {
		if (sortState.rules.length === 0 || data.length === 0) {
			return data;
		}

		const columnIndices = new Map<string, number>();
		columns.forEach((col, index) => {
			columnIndices.set(col.id, index);
		});

		return [...data].sort((rowA, rowB) => {
			for (const rule of sortState.rules) {
				const columnIndex = columnIndices.get(rule.columnId);
				if (columnIndex === undefined) continue;

				const valueA = rowA[columnIndex];
				const valueB = rowB[columnIndex];

				const comparison = compareValues(valueA, valueB, rule.direction);
				if (comparison !== 0) {
					return comparison;
				}
			}
			return 0;
		});
	}, [data, sortState.rules, columns, compareValues]);

	const sortedRowIndices = useMemo(() => {
		if (sortState.rules.length === 0) {
			return Array.from({ length: data.length }, (_, i) => i);
		}

		const columnIndices = new Map<string, number>();
		columns.forEach((col, index) => {
			columnIndices.set(col.id, index);
		});

		return Array.from({ length: data.length }, (_, i) => i).sort(
			(indexA, indexB) => {
				for (const rule of sortState.rules) {
					const columnIndex = columnIndices.get(rule.columnId);
					if (columnIndex === undefined) continue;

					const valueA = data[indexA][columnIndex];
					const valueB = data[indexB][columnIndex];

					const comparison = compareValues(valueA, valueB, rule.direction);
					if (comparison !== 0) {
						return comparison;
					}
				}
				return 0;
			},
		);
	}, [data, sortState.rules, columns, compareValues]);

	return {
		sortState,
		toggleSort,
		clearSort,
		toggleMultiSort,
		getSortDirection,
		getSortIndex,
		sortedData,
		sortedRowIndices,
		hasSorting: sortState.rules.length > 0,
	};
}
