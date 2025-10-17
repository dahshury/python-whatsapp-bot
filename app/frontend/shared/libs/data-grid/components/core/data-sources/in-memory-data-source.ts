import {
	COLUMN_DATA_TYPE,
	type IColumnDefinition,
	type IDataSource,
} from "../interfaces/i-data-source";

// Regex patterns for data validation
const WHITESPACE_SPLIT = /\s+/;

// Constants for sample data generation
const SAMPLE_DATA_SEED_MULTIPLIER = 1000;
const RANDOM_SINE_SCALE = 10_000;
const DROPDOWN_OPTIONS_COUNT = 3;
const AMOUNT_SCALE_MIN = 100;
const AMOUNT_DECIMAL_PLACES = 100;
const DATE_YEAR_BASE = 2020;
const DATE_YEAR_RANGE = 4;
const MONTHS_IN_YEAR = 12;
const DAYS_IN_MONTH_MAX = 28;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const EPOCH_YEAR = 1970;
const PHONE_PREFIX = "+1";
const PHONE_BASE = 4_160_000_000;
const PHONE_RANGE = 1_000_000_000;

// Column indices for sample data
const COL_NAME = 0;
const COL_STATUS = 1;
const COL_AMOUNT = 2;
const COL_DATE = 3;
const COL_TIME = 4;
const COL_PHONE = 5;

export class InMemoryDataSource implements IDataSource {
	id = "in-memory";
	name = "In-Memory Data Source";

	private data: unknown[][] = [];
	private columns: IColumnDefinition[] = [];
	private readonly deletedRows: Set<number> = new Set();
	rowCount: number;
	columnCount: number;

	constructor(
		initialRowCount: number,
		columnCount: number,
		columns?: IColumnDefinition[],
		initialData?: unknown[][]
	) {
		this.rowCount = initialRowCount;
		this.columnCount = columnCount;
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

	/**
	 * Replace the entire dataset and columns in-place without changing the instance.
	 * This is used to keep grid instances stable across context changes (e.g., customer switch).
	 */
	reset(columns: IColumnDefinition[], rows: unknown[][]): void {
		this.columns = columns ? [...columns] : [];
		this.columnCount = this.columns.length;
		this.data = Array.isArray(rows) ? rows.map((r) => [...r]) : [];
		this.rowCount = this.data.length;
		this.deletedRows.clear();
	}

	private initializeDefaultColumns(): void {
		this.columns = [
			{
				id: "name",
				name: "Full Name",
				title: "Full Name",
				dataType: COLUMN_DATA_TYPE.TEXT,
				isRequired: true,
				isEditable: true,
				validationRules: [
					{
						type: "custom",
						message: "Name must contain at least two words",
						validate: (value: string) => {
							const words = value.trim().split(WHITESPACE_SPLIT);
							return words.length >= 2 && words.every((w) => w.length >= 2);
						},
					},
				],
			},
			{
				id: "status",
				name: "Status",
				title: "Status",
				dataType: COLUMN_DATA_TYPE.DROPDOWN,
				isEditable: true,
				metadata: {
					options: ["Option A", "Option B", "Option C"],
				},
			},
			{
				id: "amount",
				name: "Amount",
				title: "Amount",
				dataType: COLUMN_DATA_TYPE.NUMBER,
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
				dataType: COLUMN_DATA_TYPE.DATE,
				isEditable: true,
				formatting: {
					pattern: "YYYY-MM-DD",
				},
			},
			{
				id: "time",
				name: "Time",
				title: "Time",
				dataType: COLUMN_DATA_TYPE.TIME,
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
			const rowData: unknown[] = [];
			for (let col = 0; col < this.columnCount; col++) {
				rowData.push(this.generateSampleData(row, col, sampleNames));
			}
			this.data.push(rowData);
		}
	}

	private generateSampleData(
		row: number,
		col: number,
		sampleNames: string[]
	): unknown {
		const seed = row * SAMPLE_DATA_SEED_MULTIPLIER + col;
		const random = () => {
			const x = Math.sin(seed) * RANDOM_SINE_SCALE;
			return x - Math.floor(x);
		};

		// Intentionally leave some cells empty to test required validation
		// Only in row 2 for testing
		if (row === 2) {
			switch (col) {
				case COL_NAME:
					return ""; // Empty name
				case COL_STATUS:
					return ""; // Empty dropdown
				case COL_AMOUNT:
					return null; // Empty amount
				default:
					break;
			}
		}

		switch (col) {
			case COL_NAME:
				return sampleNames[row % sampleNames.length];
			case COL_STATUS:
				return ["Option A", "Option B", "Option C"][
					Math.floor(random() * DROPDOWN_OPTIONS_COUNT)
				];
			case COL_AMOUNT:
				return (
					Math.round(
						(random() * RANDOM_SINE_SCALE + AMOUNT_SCALE_MIN) *
							AMOUNT_DECIMAL_PLACES
					) / AMOUNT_DECIMAL_PLACES
				);
			case COL_DATE:
				return new Date(
					DATE_YEAR_BASE + Math.floor(random() * DATE_YEAR_RANGE),
					Math.floor(random() * MONTHS_IN_YEAR),
					Math.floor(random() * DAYS_IN_MONTH_MAX) + 1
				);
			case COL_TIME:
				return new Date(
					EPOCH_YEAR,
					0,
					1,
					Math.floor(random() * HOURS_IN_DAY),
					Math.floor(random() * MINUTES_IN_HOUR)
				);
			case COL_PHONE:
				return `${PHONE_PREFIX}${Math.floor(PHONE_BASE + random() * PHONE_RANGE)}`;
			default:
				return `Cell ${row},${col}`;
		}
	}

	getColumnDefinitions(): IColumnDefinition[] {
		return [...this.columns];
	}

	getCellData(col: number, row: number): Promise<unknown> {
		if (
			row >= 0 &&
			row < this.rowCount &&
			col >= 0 &&
			col < this.columnCount &&
			!this.deletedRows.has(row)
		) {
			return Promise.resolve(this.data[row]?.[col] ?? null);
		}
		return Promise.resolve(null);
	}

	setCellData(col: number, row: number, value: unknown): Promise<boolean> {
		if (row >= 0 && row < this.rowCount && col >= 0 && col < this.columnCount) {
			if (!this.data[row]) {
				this.data[row] = new Array(this.columnCount).fill(null);
			}
			this.data[row][col] = value;
			return Promise.resolve(true);
		}
		return Promise.resolve(false);
	}

	getRowData(row: number): Promise<unknown[]> {
		if (row >= 0 && row < this.rowCount) {
			return Promise.resolve(
				this.data[row] || new Array(this.columnCount).fill(null)
			);
		}
		return Promise.resolve([]);
	}

	getColumnData(col: number): Promise<unknown[]> {
		if (col >= 0 && col < this.columnCount) {
			return Promise.resolve(this.data.map((row) => row?.[col] ?? null));
		}
		return Promise.resolve([]);
	}

	refresh(): Promise<void> {
		// In-memory data source doesn't need refresh
		return Promise.resolve();
	}

	addRow(): Promise<number> {
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
				case COLUMN_DATA_TYPE.TEXT:
				case COLUMN_DATA_TYPE.EMAIL:
				case COLUMN_DATA_TYPE.URL:
				case COLUMN_DATA_TYPE.JSON:
				case COLUMN_DATA_TYPE.DROPDOWN:
				case COLUMN_DATA_TYPE.PHONE:
					newRowData.push("");
					break;
				case COLUMN_DATA_TYPE.DATE:
				case COLUMN_DATA_TYPE.TIME:
				case COLUMN_DATA_TYPE.DATETIME:
					newRowData.push(null);
					break;
				case COLUMN_DATA_TYPE.NUMBER:
					newRowData.push(null);
					break;
				case COLUMN_DATA_TYPE.BOOLEAN:
					newRowData.push(false);
					break;
				default:
					newRowData.push(null);
			}
		}

		this.data[newRowIndex] = newRowData;
		this.rowCount++;

		return Promise.resolve(newRowIndex);
	}

	deleteRow(row: number): Promise<boolean> {
		if (row >= 0 && row < this.rowCount) {
			this.deletedRows.add(row);
			return Promise.resolve(true);
		}
		return Promise.resolve(false);
	}

	getDeletedRows(): Set<number> {
		return new Set(this.deletedRows);
	}
}
