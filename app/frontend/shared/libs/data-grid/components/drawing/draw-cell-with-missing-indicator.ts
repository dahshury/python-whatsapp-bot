import type {
	DrawCellCallback,
	GridColumn,
	Theme,
} from "@glideapps/glide-data-grid";
import { drawTextCell, GridCellKind } from "@glideapps/glide-data-grid";
import { drawAttentionIndicator } from "../utils/cell-draw-helpers";
import { messages } from "../utils/i18n";

/**
 * Checks if a cell has content based on its kind and data
 */
function checkCellHasContent(cell: {
	kind: string;
	data?: unknown;
	time?: Date;
}): boolean {
	if (cell.kind === GridCellKind.Custom) {
		const data = (cell as { data?: unknown }).data as
			| {
					kind?: string;
					date?: Date;
					time?: Date;
					value?: unknown;
			  }
			| undefined;
		if (data?.kind === "tempus-date-cell") {
			return !!(data.date || (data as { displayDate?: string }).displayDate);
		}
		if (data?.kind === "timekeeper-cell") {
			return !!(data as { time?: Date }).time;
		}
		if (
			data?.kind === "dropdown-cell" ||
			data?.kind === "phone-cell" ||
			data?.kind === "age-wheel-cell"
		) {
			return !!data.value;
		}
		return false;
	}

	if (cell.kind === GridCellKind.Text) {
		return !!(cell as { data?: unknown }).data;
	}
	if (cell.kind === GridCellKind.Number) {
		const cellData = (cell as { data?: unknown }).data;
		return cellData !== null && cellData !== undefined;
	}

	return false;
}

/**
 * Determines the text alignment based on contentAlign value
 */
function getTextAlignment(
	contentAlign: CanvasTextAlign | undefined
): "center" | "left" | "right" {
	if (contentAlign === "start") {
		return "left";
	}
	if (contentAlign === "end") {
		return "right";
	}
	if (
		contentAlign === "left" ||
		contentAlign === "right" ||
		contentAlign === "center"
	) {
		return contentAlign;
	}
	return "left";
}

/**
 * Creates a DrawCellCallback that draws a missing value indicator for required, editable cells
 * and renders a localized "none" placeholder when content is empty.
 */
export function createDrawCellWithMissingIndicator(
	orderedColumns: GridColumn[],
	theme: Theme
): DrawCellCallback {
	return (args, draw) => {
		const { cell, col, ctx, rect } = args;
		const column = orderedColumns[col];

		if ((cell as { isMissingValue?: boolean }).isMissingValue) {
			ctx.save();

			const hasContent = checkCellHasContent(cell as never);

			if (
				(column as { isRequired?: boolean; isEditable?: boolean })
					?.isRequired &&
				(column as { isRequired?: boolean; isEditable?: boolean })?.isEditable
			) {
				drawAttentionIndicator(ctx, rect, theme as Theme);
			}

			draw();

			if (!hasContent) {
				const contentAlign = (cell as { contentAlign?: CanvasTextAlign })
					.contentAlign;
				const align = getTextAlignment(contentAlign);
				drawTextCell(
					{
						...args,
						theme: {
							...(theme as Theme),
							textDark: (theme as Theme).textLight,
						},
					} as unknown as Parameters<typeof drawTextCell>[0],
					messages.grid.none(),
					align
				);
			}

			ctx.restore();
			return;
		}

		draw();
	};
}
