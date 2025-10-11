import type { IColumnType, IColumnTypeRegistry } from "../interfaces/IColumnType";
import type { ColumnDataType } from "../interfaces/IDataSource";

export class ColumnTypeRegistry implements IColumnTypeRegistry {
	private static instance: ColumnTypeRegistry;
	private columnTypes: Map<ColumnDataType, IColumnType> = new Map();

	private constructor() {}

	public static getInstance(): ColumnTypeRegistry {
		if (!ColumnTypeRegistry.instance) {
			ColumnTypeRegistry.instance = new ColumnTypeRegistry();
		}
		return ColumnTypeRegistry.instance;
	}

	public register(columnType: IColumnType): void {
		// Only register if not already registered to prevent warnings in development
		if (!this.columnTypes.has(columnType.dataType)) {
			this.columnTypes.set(columnType.dataType, columnType);
		}
	}

	public get(dataType: ColumnDataType): IColumnType | undefined {
		return this.columnTypes.get(dataType);
	}

	public getAll(): Map<ColumnDataType, IColumnType> {
		return new Map(this.columnTypes);
	}

	public hasType(dataType: ColumnDataType): boolean {
		return this.columnTypes.has(dataType);
	}

	public clear(): void {
		this.columnTypes.clear();
	}
}
