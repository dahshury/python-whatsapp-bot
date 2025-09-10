import {
	type GridCell,
	GridCellKind,
	type GridColumn,
} from "@glideapps/glide-data-grid";

export interface FilteredRowsResult {
	filteredRows: number[];
	filteredRowCount: number;
}

export interface SortState {
	columnId: string;
	direction: "asc" | "desc";
}

export class GridDataService {
	private extractCellValue(cell: GridCell): unknown {
		if (cell.kind === GridCellKind.Number)
			return (cell as { data?: unknown }).data ?? 0;

		if (cell.kind === GridCellKind.Custom) {
			const data = (cell as { data?: unknown }).data as
				| { kind?: string; value?: unknown; date?: Date }
				| undefined;
			switch (data?.kind) {
				case "dropdown-cell":
					return data.value ?? "";
				case "tempus-date-cell":
					return data.date ?? null;
				case "phone-cell":
					// Sort by the underlying phone value
					return data.value ?? "";
				default:
					return (
						(cell as { displayData?: unknown }).displayData ??
						(cell as { data?: unknown }).data ??
						""
					);
			}
		}

		return (
			(cell as { data?: unknown }).data ??
			(cell as { displayData?: unknown }).displayData ??
			""
		);
	}

	private extractSearchableText(cell: GridCell): string {
		if (cell.kind === GridCellKind.Custom) {
			const data = (cell as { data?: unknown }).data as
				| { kind?: string; value?: unknown; date?: Date }
				| undefined;
			if (data?.kind === "phone-cell") {
				return String(data.value ?? "").toLowerCase();
			}
		}
		const disp = (cell as { displayData?: unknown }).displayData;
		const data = (cell as { data?: unknown }).data;
		return String(disp ?? data ?? "").toLowerCase();
	}

	private compareValues(
		valA: unknown,
		valB: unknown,
		direction: "asc" | "desc",
	): number {
		const digitOnly = (s: string) => s.replace(/\D+/g, "");

		if (valA instanceof Date && valB instanceof Date) {
			const comp = valA.getTime() - valB.getTime();
			return direction === "asc" ? comp : -comp;
		}

		const numParse = (v: unknown) => {
			if (typeof v === "string" && /^[\d\s+()-]+$/.test(v)) {
				const digits = digitOnly(v);
				return digits.length ? Number(digits) : Number.NaN;
			}
			return Number(v);
		};

		const numA = numParse(valA);
		const numB = numParse(valB);

		if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
			const comp = numA - numB;
			return direction === "asc" ? comp : -comp;
		}

		const strA = String(valA ?? "").toLowerCase();
		const strB = String(valB ?? "").toLowerCase();
		if (strA < strB) return direction === "asc" ? -1 : 1;
		if (strA > strB) return direction === "asc" ? 1 : -1;
		return 0;
	}

	public filterAndSortRows(
		searchValue: string,
		deletedRows: Set<number>,
		numRows: number,
		displayColumns: GridColumn[],
		visibleColumnIndices: (number | undefined)[],
		getRawCellContent: (col: number, row: number) => GridCell,
		sortState: SortState | null,
	): FilteredRowsResult {
		const filteredRows: number[] = [];
		const query = searchValue.toLowerCase();

		for (let row = 0; row < numRows; row++) {
			if (deletedRows.has(row)) continue;

			if (!query) {
				filteredRows.push(row);
				continue;
			}

			for (let c = 0; c < displayColumns.length; c++) {
				const colIdx = visibleColumnIndices[c];
				if (colIdx === undefined) continue;

				const cell = getRawCellContent(colIdx, row);
				const txt = this.extractSearchableText(cell);

				if (txt.includes(query)) {
					filteredRows.push(row);
					break;
				}
			}
		}

		if (sortState) {
			const colIdx = displayColumns.findIndex(
				(c) => c.id === sortState.columnId,
			);
			if (colIdx >= 0) {
				const actualColIndex = visibleColumnIndices[colIdx];
				if (actualColIndex !== undefined) {
					filteredRows.sort((a, b) => {
						const cellA = getRawCellContent(actualColIndex, a);
						const cellB = getRawCellContent(actualColIndex, b);

						const valA = this.extractCellValue(cellA);
						const valB = this.extractCellValue(cellB);

						return this.compareValues(valA, valB, sortState.direction);
					});
				}
			}
		}

		return {
			filteredRows,
			filteredRowCount: filteredRows.length,
		};
	}

	public createTooltipMatrix(
		filteredRows: number[],
		displayColumns: GridColumn[],
		visibleColumnIndices: (number | undefined)[],
		getRawCellContent: (col: number, row: number) => GridCell,
	): unknown[][] {
		return filteredRows.map((rowIdx) =>
			displayColumns.map((_, cIdx) => {
				const colIdx = visibleColumnIndices[cIdx];
				if (colIdx === undefined) return undefined;
				const cell = getRawCellContent(colIdx, rowIdx);
				const disp = (cell as { displayData?: unknown }).displayData;
				const data = (cell as { data?: unknown }).data;
				return disp ?? data;
			}),
		);
	}
}
