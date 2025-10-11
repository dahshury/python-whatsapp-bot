import { InMemoryDataSource } from "../core/data-sources/InMemoryDataSource";
import type { IColumnDefinition, IDataSource } from "../core/interfaces/IDataSource";
import { ColumnTypeRegistry } from "../core/services/ColumnTypeRegistry";

export interface MappingConfig<T> {
	/**
	 * Extract value for a specific column from source data
	 */
	getValue: (item: T, columnId: string) => unknown; // Fixed any type

	/**
	 * Filter items before mapping
	 */
	filter?: (item: T) => boolean;

	/**
	 * Sort items after filtering
	 */
	sort?: (a: T, b: T) => number;

	/**
	 * Transform the entire dataset before mapping
	 */
	preTransform?: (items: T[]) => T[];

	/**
	 * Post-process mapped row data
	 */
	postProcessRow?: (rowData: unknown[], item: T, rowIndex: number) => unknown[];
}

export interface DataSourceMapperOptions {
	/**
	 * Minimum number of rows to display (will add empty rows if needed)
	 */
	minRows?: number;

	/**
	 * Whether to create default values for empty rows
	 */
	createDefaultsForEmpty?: boolean;
}

/**
 * Generic service for mapping external data sources to grid data
 */
export class DataSourceMapper<T = unknown> {
	private columnTypeRegistry = ColumnTypeRegistry.getInstance();

	/**
	 * Map an array of items to a grid data source
	 */
	mapToDataSource(
		items: T[],
		columns: IColumnDefinition[],
		mappingConfig: MappingConfig<T>,
		options: DataSourceMapperOptions = {}
	): IDataSource {
		const { minRows = 1, createDefaultsForEmpty = true } = options;

		// Apply pre-transform if provided
		let processedItems = mappingConfig.preTransform ? mappingConfig.preTransform(items) : items;

		// Apply filter
		if (mappingConfig.filter) {
			processedItems = processedItems.filter(mappingConfig.filter);
		}

		// Apply sort
		if (mappingConfig.sort) {
			processedItems = [...processedItems].sort(mappingConfig.sort);
		}

		// Map items to grid data
		const gridData: unknown[][] = processedItems.map((item, index) => {
			const rowData = columns.map((column) => {
				const value = mappingConfig.getValue(item, column.id);
				return this.normalizeValue(value, column);
			});

			// Apply post-processing if provided
			return mappingConfig.postProcessRow ? mappingConfig.postProcessRow(rowData, item, index) : rowData;
		});

		// Ensure minimum rows
		const rowCount = Math.max(gridData.length, minRows);

		// Add empty rows if needed
		if (gridData.length < rowCount && createDefaultsForEmpty) {
			const defaultRow = this.createDefaultRow(columns);
			while (gridData.length < rowCount) {
				gridData.push([...defaultRow]);
			}
		}

		return new InMemoryDataSource(rowCount, columns.length, columns, gridData);
	}

	/**
	 * Create a mapping function for simple object mapping
	 */
	createObjectMapper<T extends Record<string, unknown>>(
		fieldMap: Record<string, keyof T | ((item: T) => unknown)>
	): MappingConfig<T>["getValue"] {
		return (item: T, columnId: string) => {
			const mapping = fieldMap[columnId];
			if (!mapping) return null;

			if (typeof mapping === "function") {
				return mapping(item);
			}

			return item[mapping];
		};
	}

	/**
	 * Create a date range filter
	 */
	createDateRangeFilter<T>(
		getDate: (item: T) => Date | string,
		startDate: Date | string,
		endDate: Date | string
	): MappingConfig<T>["filter"] {
		const start = new Date(startDate);
		const end = new Date(endDate);

		return (item: T) => {
			const itemDate = new Date(getDate(item));
			return itemDate >= start && itemDate <= end;
		};
	}

	/**
	 * Create a multi-field sorter
	 */
	createMultiFieldSorter<T>(
		...sortFields: Array<{
			field: (item: T) => unknown;
			direction?: "asc" | "desc";
		}>
	): MappingConfig<T>["sort"] {
		return (a: T, b: T) => {
			for (const { field, direction = "asc" } of sortFields) {
				const aValue = field(a);
				const bValue = field(b);

				const aStr = String(aValue);
				const bStr = String(bValue);
				if (aStr < bStr) return direction === "asc" ? -1 : 1;
				if (aStr > bStr) return direction === "asc" ? 1 : -1;
			}
			return 0;
		};
	}

	/**
	 * Create a row index tracker that maps grid rows to original items
	 */
	createRowIndexMap<T>(items: T[]): Map<number, T> {
		const map = new Map<number, T>();
		items.forEach((item, index) => {
			map.set(index, item);
		});
		return map;
	}

	private normalizeValue(value: unknown, column: IColumnDefinition): unknown {
		const columnType = this.columnTypeRegistry.get(column.dataType);
		if (!columnType) return value;

		// Let the column type parse and normalize the value
		let input: string | number | Date | null = null;
		// For text-like columns ensure string input; for number ensure number; for date/time leave as-is
		switch (column.dataType) {
			case "text":
			case "dropdown":
				input = value == null ? "" : String(value);
				break;
			case "number":
				input = value == null ? 0 : Number(value);
				break;
			default:
				if (value instanceof Date) input = value;
				else if (typeof value === "string" || typeof value === "number") input = value;
				else input = null;
		}
		return columnType.parseValue(input as unknown, column);
	}

	private createDefaultRow(columns: IColumnDefinition[]): unknown[] {
		return columns.map((column) => {
			const columnType = this.columnTypeRegistry.get(column.dataType);
			return columnType ? columnType.getDefaultValue(column) : "";
		});
	}
}

/**
 * Factory function for creating typed data source mappers
 */
export function createDataSourceMapper<T>(): DataSourceMapper<T> {
	return new DataSourceMapper<T>();
}
