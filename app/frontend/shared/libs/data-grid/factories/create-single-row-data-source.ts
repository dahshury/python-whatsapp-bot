import { InMemoryDataSource } from "@/shared/libs/data-grid/components/core/data-sources/in-memory-data-source";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";

export function createSingleRowDataSource(
	columns: IColumnDefinition[],
	initialRow: unknown[]
): InMemoryDataSource {
	return new InMemoryDataSource(1, columns.length, columns, [initialRow]);
}
