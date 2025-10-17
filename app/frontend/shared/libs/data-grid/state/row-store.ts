export class RowStore {
	private baseRowCount: number;
	private addedRowsCount = 0; // we only track count here; actual rows live in EditingState
	private deletedRows: number[] = [];

	constructor(baseRowCount: number) {
		this.baseRowCount = baseRowCount;
	}

	setBaseRowCount(count: number): void {
		if (typeof count !== "number" || Number.isNaN(count) || count < 0) {
			return;
		}
		this.baseRowCount = count;
	}

	setAddedRowsCount(count: number): void {
		this.addedRowsCount = Math.max(0, Math.floor(count));
	}

	addDeletedRow(row: number): void {
		if (row < 0) {
			return;
		}
		if (!this.deletedRows.includes(row)) {
			this.deletedRows.push(row);
			this.deletedRows.sort((a, b) => a - b);
		}
	}

	removeDeletedRow(row: number): void {
		this.deletedRows = this.deletedRows.filter((r) => r !== row);
	}

	getDeletedRows(): number[] {
		return [...this.deletedRows];
	}

	getOriginalRowIndex(viewRow: number): number {
		if (viewRow < this.baseRowCount) {
			let originalIndex = viewRow;
			for (const deletedRow of this.deletedRows) {
				if (deletedRow > originalIndex) {
					break;
				}
				originalIndex += 1;
			}
			return originalIndex;
		}
		return -1;
	}

	isAddedRow(viewRow: number): boolean {
		return viewRow >= this.baseRowCount;
	}

	getNumRows(): number {
		return this.baseRowCount + this.addedRowsCount - this.deletedRows.length;
	}
}
