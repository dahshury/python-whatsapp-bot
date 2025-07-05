import { type GridCell, GridCellKind } from "@glideapps/glide-data-grid";

/**
 * Extracts the display text from a cell for width calculation purposes.
 * This handles all custom cell types and returns the actual visible text.
 */
export function extractCellDisplayText(cell: GridCell): string {
	if (!cell) return "";

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
			const customData = (cell as any).data;
			if (!customData) return "";

			switch (customData.kind) {
				case "dropdown-cell":
					return customData.value || "";

				case "tempus-date-cell":
					return customData.displayDate || "";

				case "phone-input-cell":
					return customData.displayPhone || customData.phone || "";

				default:
					// Fallback for unknown custom cell types
					return (
						customData.displayData ||
						customData.value ||
						String(customData.data || "")
					);
			}
		}

		default:
			// Fallback for any other cell types
			return (cell as any).displayData || (cell as any).data || "";
	}
}

/**
 * Extracts display text from multiple cells for autosize calculations.
 */
export function extractCellsDisplayText(cells: GridCell[]): string[] {
	return cells.map(extractCellDisplayText);
}
