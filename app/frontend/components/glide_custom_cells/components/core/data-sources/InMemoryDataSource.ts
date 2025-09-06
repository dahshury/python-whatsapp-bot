import {
	ColumnDataType,
	type IColumnDefinition,
	type IDataSource,
} from "../interfaces/IDataSource";

export class InMemoryDataSource implements IDataSource {
	id = "in-memory";
	name = "In-Memory Data Source";

	private data: unknown[][] = [];
	private columns: IColumnDefinition[] = [];
	private deletedRows: Set<number> = new Set();
	public rowCount: number;

	constructor(
		initialRowCount: number,
		public columnCount: number,
		columns?: IColumnDefinition[],
		initialData?: unknown[][],
	) {
		this.rowCount = initialRowCount;
		if (columns) {
			this.columns = columns;
		} else {
			this.initializeDefaultColumns();
		}

		if (initialData) {
			this.data = initialData;
		} else {
			this.initializeDefaultData();
		}
	}

	private initializeDefaultColumns(): void {
		this.columns = [
			{
				id: "name",
				name: "Full Name",
				title: "Full Name",
				dataType: ColumnDataType.TEXT,
				isRequired: true,
				isEditable: true,
				validationRules: [
					{
						type: "custom",
						message: "Name must contain at least two words",
						validate: (value: string) => {
							const words = value.trim().split(/\s+/);
							return words.length >= 2 && words.every((w) => w.length >= 2);
						},
					},
				],
			},
			{
				id: "status",
				name: "Status",
				title: "Status",
				dataType: ColumnDataType.DROPDOWN,
				isEditable: true,
				metadata: {
					options: ["Option A", "Option B", "Option C"],
				},
			},
			{
				id: "amount",
				name: "Amount",
				title: "Amount",
				dataType: ColumnDataType.NUMBER,
				isEditable: true,
				formatting: {
					type: "currency",
					options: {
						currency: "USD",
					},
				},
			},
			{
				id: "date",
				name: "Date",
				title: "Date",
				dataType: ColumnDataType.DATE,
				isEditable: true,
				formatting: {
					pattern: "YYYY-MM-DD",
				},
			},
			{
				id: "time",
				name: "Time",
				title: "Time",
				dataType: ColumnDataType.TIME,
				isEditable: true,
			},
		];
	}

	private initializeDefaultData(): void {
		const sampleNames = [
			"John Smith",
			"Maria Garcia",
			"Ahmed Hassan",
			"Sarah Johnson",
			"Chen Wei",
			"Anna Kowalski",
			"David Brown",
			"Fatima Al-Zahra",
		];

		this.data = [];
		for (let row = 0; row < this.rowCount; row++) {
			const rowData = [];
			for (let col = 0; col < this.columnCount; col++) {
				rowData.push(this.generateSampleData(row, col, sampleNames));
			}
			this.data.push(rowData);
		}
	}

	private generateSampleData(
		row: number,
		col: number,
		sampleNames: string[],
	): unknown {
		const seed = row * 1000 + col;
		const random = () => {
			const x = Math.sin(seed) * 10000;
			return x - Math.floor(x);
		};

		// Intentionally leave some cells empty to test required validation
		// Only in row 2 for testing
		if (row === 2) {
			switch (col) {
				case 0:
					return ""; // Empty name
				case 1:
					return ""; // Empty dropdown
				case 2:
					return null; // Empty amount
			}
		}

		switch (col) {
			case 0:
				return sampleNames[row % sampleNames.length];
			case 1:
				return ["Option A", "Option B", "Option C"][Math.floor(random() * 3)];
			case 2:
				return Math.round((random() * 10000 + 100) * 100) / 100;
			case 3:
				return new Date(
					2020 + Math.floor(random() * 4),
					Math.floor(random() * 12),
					Math.floor(random() * 28) + 1,
				);
			case 4:
				return new Date(
					1970,
					0,
					1,
					Math.floor(random() * 24),
					Math.floor(random() * 60),
				);
			case 5:
				return `+1${Math.floor(4160000000 + random() * 1000000000)}`;
			default:
				return `Cell ${row},${col}`;
		}
	}

	getColumnDefinitions(): IColumnDefinition[] {
		return [...this.columns];
	}

	async getCellData(col: number, row: number): Promise<unknown> {
		if (
			row >= 0 &&
			row < this.rowCount &&
			col >= 0 &&
			col < this.columnCount &&
			!this.deletedRows.has(row)
		) {
			return this.data[row]?.[col] ?? null;
		}
		return null;
	}

	async setCellData(
		col: number,
		row: number,
		value: unknown,
	): Promise<boolean> {
		if (row >= 0 && row < this.rowCount && col >= 0 && col < this.columnCount) {
			if (!this.data[row]) {
				this.data[row] = new Array(this.columnCount).fill(null);
			}
			this.data[row][col] = value;
			return true;
		}
		return false;
	}

	async getRowData(row: number): Promise<unknown[]> {
		if (row >= 0 && row < this.rowCount) {
			return this.data[row] || new Array(this.columnCount).fill(null);
		}
		return [];
	}

	async getColumnData(col: number): Promise<unknown[]> {
		if (col >= 0 && col < this.columnCount) {
			return this.data.map((row) => row?.[col] ?? null);
		}
		return [];
	}

	async refresh(): Promise<void> {
		// In-memory data source doesn't need refresh
	}

	async addRow(): Promise<number> {
		const newRowIndex = this.rowCount;

		// Create empty/default row data for the new row (no samples/randoms)
		const newRowData: unknown[] = [];
		for (let col = 0; col < this.columnCount; col++) {
			const column = this.columns[col];
			if (column && column.defaultValue !== undefined) {
				newRowData.push(column.defaultValue);
				continue;
			}
			// Fallbacks by data type
			switch (column?.dataType) {
				case ColumnDataType.TEXT:
				case ColumnDataType.EMAIL:
				case ColumnDataType.URL:
				case ColumnDataType.JSON:
				case ColumnDataType.DROPDOWN:
				case ColumnDataType.PHONE:
					newRowData.push("");
					break;
				case ColumnDataType.DATE:
				case ColumnDataType.TIME:
				case ColumnDataType.DATETIME:
					newRowData.push(null);
					break;
				case ColumnDataType.NUMBER:
					newRowData.push(null);
					break;
				case ColumnDataType.BOOLEAN:
					newRowData.push(false);
					break;
				default:
					newRowData.push(null);
			}
		}

		this.data[newRowIndex] = newRowData;
		this.rowCount++;

		return newRowIndex;
	}

	async deleteRow(row: number): Promise<boolean> {
		if (row >= 0 && row < this.rowCount) {
			this.deletedRows.add(row);
			return true;
		}
		return false;
	}

	getDeletedRows(): Set<number> {
		return new Set(this.deletedRows);
	}
}
