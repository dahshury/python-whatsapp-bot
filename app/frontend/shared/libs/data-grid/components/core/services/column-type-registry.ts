import type {
	IColumnType,
	IColumnTypeRegistry,
} from "../interfaces/i-column-type";
import type { ColumnDataType } from "../interfaces/i-data-source";

export class ColumnTypeRegistry implements IColumnTypeRegistry {
	private static instance: ColumnTypeRegistry;
	private readonly columnTypes: Map<ColumnDataType, IColumnType> = new Map();

	private constructor() {}

	static getInstance(): ColumnTypeRegistry {
		if (!ColumnTypeRegistry.instance) {
			ColumnTypeRegistry.instance = new ColumnTypeRegistry();
		}
		return ColumnTypeRegistry.instance;
	}

	register(columnType: IColumnType): void {
		// Only register if not already registered to prevent warnings in development
		if (!this.columnTypes.has(columnType.dataType)) {
			this.columnTypes.set(columnType.dataType, columnType);
		}
	}

	get(dataType: ColumnDataType): IColumnType | undefined {
		return this.columnTypes.get(dataType);
	}

	getAll(): Map<ColumnDataType, IColumnType> {
		return new Map(this.columnTypes);
	}

	hasType(dataType: ColumnDataType): boolean {
		return this.columnTypes.has(dataType);
	}

	clear(): void {
		this.columnTypes.clear();
	}
}
