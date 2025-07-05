import { GridCellKind, type GridColumn } from "@glideapps/glide-data-grid";

export interface FilteredRowsResult {
	filteredRows: number[];
	filteredRowCount: number;
}

export interface SortState {
	columnId: string;
	direction: "asc" | "desc";
}

export class GridDataService {
	private extractCellValue(cell: any): any {
		if (cell.kind === GridCellKind.Number) return cell.data ?? 0;

		if (cell.kind === GridCellKind.Custom) {
			const k = cell.data?.kind;
			switch (k) {
				case "dropdown-cell":
					return cell.data.value ?? "";
				case "tempus-date-cell":
					return cell.data.date ?? null;
				case "phone-input-cell":
					return cell.data.phone ?? "";
				default:
					return cell.data ?? cell.displayData ?? "";
			}
		}

		return cell.data ?? cell.displayData ?? "";
	}

	private extractSearchableText(cell: any): string {
		return (cell.displayData ?? cell.data ?? "").toString().toLowerCase();
	}

	private compareValues(
		valA: any,
		valB: any,
		direction: "asc" | "desc",
	): number {
		const digitOnly = (s: string) => s.replace(/\D+/g, "");

		if (valA instanceof Date && valB instanceof Date) {
			const comp = valA.getTime() - valB.getTime();
			return direction === "asc" ? comp : -comp;
		}

		const numParse = (v: any) => {
			if (typeof v === "string" && /^[\d\s+()-]+$/.test(v)) {
				const digits = digitOnly(v);
				return digits.length ? Number(digits) : NaN;
			}
			return Number(v);
		};

		const numA = numParse(valA);
		const numB = numParse(valB);

		if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
			const comp = numA - numB;
			return direction === "asc" ? comp : -comp;
		}

		const strA = (valA ?? "").toString().toLowerCase();
		const strB = (valB ?? "").toString().toLowerCase();
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
		getRawCellContent: (col: number, row: number) => any,
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
				filteredRows.sort((a, b) => {
					const cellA = getRawCellContent(visibleColumnIndices[colIdx]!, a);
					const cellB = getRawCellContent(visibleColumnIndices[colIdx]!, b);

					const valA = this.extractCellValue(cellA);
					const valB = this.extractCellValue(cellB);

					return this.compareValues(valA, valB, sortState.direction);
				});
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
		getRawCellContent: (col: number, row: number) => any,
	): any[][] {
		return filteredRows.map((rowIdx) =>
			displayColumns.map((_, cIdx) => {
				const colIdx = visibleColumnIndices[cIdx];
				if (colIdx === undefined) return undefined;
				const cell = getRawCellContent(colIdx, rowIdx);
				return cell.data ?? cell.displayData;
			}),
		);
	}
}
