export class OriginalValuesStore {
	private readonly values: Map<number, Map<number, unknown>> = new Map();

	store(row: number, col: number, value: unknown): void {
		if (!this.values.has(row)) {
			this.values.set(row, new Map());
		}
		const rowMap = this.values.get(row) ?? new Map();
		const existing = rowMap.get(col);
		if (existing === undefined || existing === null || existing === "") {
			rowMap.set(col, value);
		}
	}

	get(row: number, col: number): unknown {
		return this.values.get(row)?.get(col);
	}

	clear(): void {
		this.values.clear();
	}
}
