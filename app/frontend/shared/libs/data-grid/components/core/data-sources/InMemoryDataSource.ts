import {
  ColumnDataType,
  type IColumnDefinition,
  type IDataSource,
} from "../interfaces/IDataSource";

const WHITESPACE_REGEX = /\s+/;
const SEED_MULTIPLIER = 1000;
const RANDOM_SCALE = 10_000;
const TEST_ROW_INDEX = 2;
const MIN_COL = 0;
const MAX_COL_NAME = 1;
const MAX_COL_AMOUNT = 2;
const DROPDOWN_OPTIONS_COUNT = 3;
const AMOUNT_SCALE = 10_000;
const AMOUNT_BASE = 100;
const AMOUNT_PRECISION = 100;
const DATE_START_YEAR = 2020;
const DATE_YEAR_RANGE = 4;
const MONTHS_IN_YEAR = 12;
const DAYS_IN_MONTH = 28;
const EPOCH_YEAR = 1970;
const EPOCH_MONTH = 0;
const EPOCH_DAY = 1;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const PHONE_COUNTRY_CODE = "+1";
const PHONE_BASE = 4_160_000_000;
const PHONE_RANGE = 1_000_000_000;
const DATE_COL_INDEX = 3;
const TIME_COL_INDEX = 4;
const PHONE_COL_INDEX = 5;

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
    this.columnCount = columnCount;
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
        dataType: ColumnDataType.TEXT,
        isRequired: true,
        isEditable: true,
        validationRules: [
          {
            type: "custom",
            message: "Name must contain at least two words",
            validate: (value: string) => {
              const words = value.trim().split(WHITESPACE_REGEX);
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
    for (let row = 0; row < this.rowCount; row += 1) {
      const rowData: unknown[] = [];
      for (let col = 0; col < this.columnCount; col += 1) {
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
    const seed = row * SEED_MULTIPLIER + col;
    const random = () => {
      const x = Math.sin(seed) * RANDOM_SCALE;
      return x - Math.floor(x);
    };

    // Intentionally leave some cells empty to test required validation
    // Only in row 2 for testing
    if (row === TEST_ROW_INDEX) {
      switch (col) {
        case MIN_COL:
          return ""; // Empty name
        case MAX_COL_NAME:
          return ""; // Empty dropdown
        case MAX_COL_AMOUNT:
          return null; // Empty amount
        default:
          break;
      }
    }

    switch (col) {
      case MIN_COL:
        return sampleNames[row % sampleNames.length];
      case MAX_COL_NAME:
        return ["Option A", "Option B", "Option C"][
          Math.floor(random() * DROPDOWN_OPTIONS_COUNT)
        ];
      case MAX_COL_AMOUNT:
        return (
          Math.round(
            (random() * AMOUNT_SCALE + AMOUNT_BASE) * AMOUNT_PRECISION
          ) / AMOUNT_PRECISION
        );
      case DATE_COL_INDEX: {
        const DAY_OFFSET = 1;
        return new Date(
          DATE_START_YEAR + Math.floor(random() * DATE_YEAR_RANGE),
          Math.floor(random() * MONTHS_IN_YEAR),
          Math.floor(random() * DAYS_IN_MONTH) + DAY_OFFSET
        );
      }
      case TIME_COL_INDEX:
        return new Date(
          EPOCH_YEAR,
          EPOCH_MONTH,
          EPOCH_DAY,
          Math.floor(random() * HOURS_IN_DAY),
          Math.floor(random() * MINUTES_IN_HOUR)
        );
      case PHONE_COL_INDEX:
        return `${PHONE_COUNTRY_CODE}${Math.floor(PHONE_BASE + random() * PHONE_RANGE)}`;
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
    for (let col = 0; col < this.columnCount; col += 1) {
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
    this.rowCount += 1;

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
