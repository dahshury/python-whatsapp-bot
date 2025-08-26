import {
	type GridCell,
	GridCellKind,
	type GridColumn,
} from "@glideapps/glide-data-grid";

export class ColumnService {
	private readonly MIN_COLUMN_WIDTH = 50;
	private readonly MAX_COLUMN_WIDTH = 400;
	private readonly HEADER_PADDING = 16;
	private readonly CELL_PADDING = 8;
	private readonly MAX_SAMPLE_SIZE = 100;
	private canvas: HTMLCanvasElement | null = null;
	private context: CanvasRenderingContext2D | null = null;

	private getCanvasContext(): CanvasRenderingContext2D | null {
		if (!this.canvas) {
			this.canvas = document.createElement("canvas");
			this.context = this.canvas.getContext("2d");
		}
		return this.context;
	}

	private measureTextWidth(
		text: string,
		font: string = "13px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
	): number {
		const ctx = this.getCanvasContext();
		if (!ctx) {
			return text.length * 7;
		}

		ctx.font = font;
		const metrics = ctx.measureText(text);
		return Math.ceil(metrics.width);
	}

	private extractDisplayText(cell: GridCell): string {
		type DropdownData = { kind: "dropdown-cell"; value?: unknown };
		type TempusDateData = { kind: "tempus-date-cell"; date?: Date };
		type PhoneInputData = { kind: "phone-input-cell"; phone?: string };
		type CustomData =
			| DropdownData
			| TempusDateData
			| PhoneInputData
			| { kind: string };
		if (cell.kind === GridCellKind.Text) {
			const disp = (cell as { displayData?: unknown }).displayData;
			const data = (cell as { data?: unknown }).data;
			return String(disp ?? data ?? "");
		}

		if (cell.kind === GridCellKind.Number) {
			return String((cell as { data?: unknown }).data ?? "");
		}

		if (cell.kind === GridCellKind.Custom) {
			const customData = (cell as { data?: unknown }).data as
				| CustomData
				| undefined;
			if (customData?.kind === "dropdown-cell") {
				return String((customData as DropdownData).value ?? "");
			}
			if (customData?.kind === "tempus-date-cell") {
				const d = (customData as TempusDateData).date;
				return d ? String(d.toLocaleDateString("en-GB")) : "";
			}
			if (customData?.kind === "phone-input-cell") {
				return String((customData as PhoneInputData).phone ?? "");
			}
			const disp = (cell as { displayData?: unknown }).displayData;
			const data = (cell as { data?: unknown }).data;
			return String(disp ?? data ?? "");
		}

		return "";
	}

	public calculateAutoSize(
		columnId: string,
		displayColumns: GridColumn[],
		visibleColumnIndices: (number | undefined)[],
		filteredRows: number[],
		getRawCellContent: (col: number, row: number) => GridCell,
	): number {
		const colIdx = displayColumns.findIndex((c) => c.id === columnId);
		if (colIdx < 0) return this.MIN_COLUMN_WIDTH;

		const actualColIndex = visibleColumnIndices[colIdx];
		if (actualColIndex === undefined) return this.MIN_COLUMN_WIDTH;

		// Measure header width with bold font (600 weight)
		const headerWidth =
			this.measureTextWidth(
				displayColumns[colIdx].title,
				"600 13px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
			) + this.HEADER_PADDING;

		// Measure cell content widths
		let maxCellWidth = 0;
		const sampleSize = Math.min(filteredRows.length, this.MAX_SAMPLE_SIZE);

		for (let i = 0; i < sampleSize; i++) {
			const row = filteredRows[i];
			const cell = getRawCellContent(actualColIndex, row);
			const text = this.extractDisplayText(cell);

			if (text) {
				const cellWidth = this.measureTextWidth(
					text,
					"13px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
				);
				maxCellWidth = Math.max(maxCellWidth, cellWidth);
			}
		}

		const contentWidth = maxCellWidth + this.CELL_PADDING;
		const finalWidth = Math.max(headerWidth, contentWidth);

		return Math.max(
			this.MIN_COLUMN_WIDTH,
			Math.min(finalWidth, this.MAX_COLUMN_WIDTH),
		);
	}

	public updateColumnWidth(
		columns: GridColumn[],
		columnIndex: number,
		newWidth: number,
	): GridColumn[] {
		return columns.map((c, idx) =>
			idx === columnIndex ? { ...c, width: newWidth } : c,
		);
	}

	public findColumnIndex(columns: GridColumn[], columnId: string): number {
		return columns.findIndex((c) => c.id === columnId);
	}
}
