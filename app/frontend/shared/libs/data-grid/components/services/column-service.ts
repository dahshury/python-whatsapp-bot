import {
	type GridCell,
	GridCellKind,
	type GridColumn,
} from "@glideapps/glide-data-grid";

// Constants for magic numbers
const CANVAS_FONT_SIZE_PX = 13;
const SAMPLE_TEXT_CHAR_WIDTH = 7; // Fallback estimate when canvas unavailable
const BOLD_FONT_WEIGHT = "600";

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
		font = `${CANVAS_FONT_SIZE_PX}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
	): number {
		const ctx = this.getCanvasContext();
		if (!ctx) {
			return text.length * SAMPLE_TEXT_CHAR_WIDTH;
		}

		ctx.font = font;
		const metrics = ctx.measureText(text);
		return Math.ceil(metrics.width);
	}

	private extractDisplayText(cell: GridCell): string {
		if (cell.kind === GridCellKind.Text) {
			return this.extractTextCellDisplay(cell);
		}

		if (cell.kind === GridCellKind.Number) {
			return String((cell as { data?: unknown }).data ?? "");
		}

		if (cell.kind === GridCellKind.Custom) {
			return this.extractCustomCellDisplay(cell);
		}

		return "";
	}

	private extractTextCellDisplay(cell: GridCell): string {
		const disp = (cell as { displayData?: unknown }).displayData;
		const data = (cell as { data?: unknown }).data;
		return String(disp ?? data ?? "");
	}

	private extractCustomCellDisplay(cell: GridCell): string {
		type DropdownData = { kind: "dropdown-cell"; value?: unknown };
		type TempusDateData = { kind: "tempus-date-cell"; date?: Date };
		type CustomData = DropdownData | TempusDateData | { kind: string };

		const customData = (cell as { data?: unknown }).data as
			| (CustomData & { value?: unknown; display?: string })
			| undefined;

		if (customData?.kind === "dropdown-cell") {
			return String((customData as DropdownData).value ?? "");
		}
		if (customData?.kind === "tempus-date-cell") {
			const d = (customData as TempusDateData).date;
			return d ? String(d.toLocaleDateString("en-GB")) : "";
		}
		if (customData?.kind === "age-wheel-cell") {
			return customData.display ?? String(customData.value ?? "");
		}

		// Fallback for other custom cell types
		const disp = (cell as { displayData?: unknown }).displayData;
		const data = (cell as { data?: unknown }).data;
		return String(disp ?? data ?? "");
	}

	calculateAutoSize(options: {
		columnId: string;
		displayColumns: GridColumn[];
		visibleColumnIndices: (number | undefined)[];
		filteredRows: number[];
		getRawCellContent: (col: number, row: number) => GridCell;
	}): number {
		const {
			columnId,
			displayColumns,
			visibleColumnIndices,
			filteredRows,
			getRawCellContent,
		} = options;

		const colIdx = displayColumns.findIndex((c) => c.id === columnId);
		if (colIdx < 0) {
			return this.MIN_COLUMN_WIDTH;
		}

		const actualColIndex = visibleColumnIndices[colIdx];
		if (actualColIndex === undefined) {
			return this.MIN_COLUMN_WIDTH;
		}

		// Measure header width with bold font (600 weight)
		const columnTitle = displayColumns[colIdx]?.title || "Column";
		const headerWidth =
			this.measureTextWidth(
				columnTitle,
				`${BOLD_FONT_WEIGHT} ${CANVAS_FONT_SIZE_PX}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
			) + this.HEADER_PADDING;

		// Measure cell content widths
		let maxCellWidth = 0;
		const sampleSize = Math.min(filteredRows.length, this.MAX_SAMPLE_SIZE);

		for (let i = 0; i < sampleSize; i++) {
			const row = filteredRows[i];
			if (row !== undefined) {
				const cell = getRawCellContent(actualColIndex, row);
				const text = this.extractDisplayText(cell);

				if (text) {
					const cellWidth = this.measureTextWidth(
						text,
						`${CANVAS_FONT_SIZE_PX}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
					);
					maxCellWidth = Math.max(maxCellWidth, cellWidth);
				}
			}
		}

		const contentWidth = maxCellWidth + this.CELL_PADDING;
		const finalWidth = Math.max(headerWidth, contentWidth);

		return Math.max(
			this.MIN_COLUMN_WIDTH,
			Math.min(finalWidth, this.MAX_COLUMN_WIDTH)
		);
	}

	updateColumnWidth(
		columns: GridColumn[],
		columnIndex: number,
		newWidth: number
	): GridColumn[] {
		return columns.map((c, idx) =>
			idx === columnIndex ? { ...c, width: newWidth } : c
		);
	}

	findColumnIndex(columns: GridColumn[], columnId: string): number {
		return columns.findIndex((c) => c.id === columnId);
	}
}
