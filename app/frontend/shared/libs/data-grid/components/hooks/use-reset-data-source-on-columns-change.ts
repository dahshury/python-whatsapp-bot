import { useEffect } from "react";
import type { InMemoryDataSource } from "@/shared/libs/data-grid/components/core/data-sources/in-memory-data-source";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";

export function useResetDataSourceOnColumnsChange(
	ds: InMemoryDataSource,
	columns: IColumnDefinition[],
	rowIndex = 0
): void {
	useEffect(() => {
		const resetData = async () => {
			try {
				const existing = await ds.getRowData(rowIndex);
				ds.reset(columns, [existing]);
			} catch (_error) {
				// Silently ignore errors in data source reset
			}
		};

		resetData();
	}, [columns, ds, rowIndex]);
}
