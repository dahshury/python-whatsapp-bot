import { type GridCell, GridCellKind } from "@glideapps/glide-data-grid";

/**
 * Extract text from custom cell data
 */
function extractCustomCellText(customData: {
	kind?: string;
	value?: unknown;
	displayDate?: string;
	data?: unknown;
	displayData?: unknown;
	display?: unknown;
}): string {
	if (!customData) {
		return "";
	}

	switch (customData.kind) {
		case "dropdown-cell":
			return String(customData.value ?? "");
		case "tempus-date-cell":
			return String(customData.displayDate ?? "");
		case "phone-cell":
			return String(customData.value ?? "");
		case "excalidraw-cell":
			return String(customData.display ?? "");
		default:
			return String(
				customData.displayData ?? customData.value ?? customData.data ?? ""
			);
	}
}

/**
 * Extracts the display text from a cell for width calculation purposes.
 * This handles all custom cell types and returns the actual visible text.
 */
export function extractCellDisplayText(cell: GridCell): string {
	if (!cell) {
		return "";
	}

	switch (cell.kind) {
		case GridCellKind.Text:
			return cell.displayData || cell.data || "";

		case GridCellKind.Number:
			return cell.displayData || String(cell.data || "");

		case GridCellKind.Boolean:
			return cell.data ? "✓" : "";

		case GridCellKind.Image:
			return ""; // Images don't contribute to text width

		case GridCellKind.Uri:
			return cell.data || "";

		case GridCellKind.Markdown:
			return cell.data || "";

		case GridCellKind.Custom: {
			const customData = (cell as { data?: unknown }).data as
				| {
						kind?: string;
						value?: unknown;
						displayDate?: string;
						data?: unknown;
						displayData?: unknown;
						display?: unknown;
				  }
				| undefined;
			return extractCustomCellText(customData ?? {});
		}

		default:
			return String(
				(cell as { displayData?: unknown; data?: unknown }).displayData ??
					(cell as { displayData?: unknown; data?: unknown }).data ??
					""
			);
	}
}

/**
 * Extracts display text from multiple cells for autosize calculations.
 */
export function extractCellsDisplayText(cells: GridCell[]): string[] {
	return cells.map(extractCellDisplayText);
}
