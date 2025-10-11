import { type BaseDrawArgs, drawTextCell, type Rectangle, type Theme } from "@glideapps/glide-data-grid";
import { messages } from "../utils/i18n";

export const NULL_VALUE_TOKEN = "None";

/**
 * Draw a gradient background and indicator in the top right corner of the cell
 * to indicate an issue with the cell (e.g. required or error).
 * Uses theme-aware CSS variables for colors.
 */
export function drawAttentionIndicator(ctx: CanvasRenderingContext2D, rect: Rectangle, theme: Theme): void {
	ctx.save();

	// Draw gradient background first (bottom to top: destructive color to transparent)
	const gradient = ctx.createLinearGradient(0, rect.y + rect.height, 0, rect.y);

	// Get CSS variable colors - these are defined in glide-grid.css
	const startColor =
		getComputedStyle(document.documentElement).getPropertyValue("--gdg-validation-error-start")?.trim() ||
		"rgba(239, 68, 68, 0.15)";
	const endColor =
		getComputedStyle(document.documentElement).getPropertyValue("--gdg-validation-error-end")?.trim() ||
		"rgba(255, 255, 255, 0)";

	gradient.addColorStop(0, startColor);
	gradient.addColorStop(1, endColor);

	ctx.fillStyle = gradient;
	ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

	// Draw subtle dashed border
	const borderColor =
		getComputedStyle(document.documentElement).getPropertyValue("--gdg-validation-error-border")?.trim() ||
		"rgba(239, 68, 68, 0.3)";
	ctx.strokeStyle = borderColor;
	ctx.lineWidth = 1;
	ctx.setLineDash([3, 3]);
	ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);
	ctx.setLineDash([]); // Reset line dash

	// Draw triangle indicator in top right corner
	const indicatorColor =
		getComputedStyle(document.documentElement).getPropertyValue("--gdg-validation-error-indicator")?.trim() ||
		theme.accentColor;
	ctx.beginPath();
	ctx.moveTo(rect.x + rect.width - 8, rect.y + 1);
	ctx.lineTo(rect.x + rect.width, rect.y + 1);
	ctx.lineTo(rect.x + rect.width, rect.y + 9);
	ctx.fillStyle = indicatorColor;
	ctx.fill();

	ctx.restore();
}

/**
 * If a cell is marked as missing, we draw a placeholder symbol with a faded text color.
 */
export const drawMissingPlaceholder = (args: BaseDrawArgs): void => {
	const { cell, theme, ctx } = args;
	drawTextCell(
		{
			...args,
			theme: {
				...theme,
				textDark: theme.textLight,
				headerFontFull: `${theme.headerFontStyle} ${theme.fontFamily}`,
				baseFontFull: `${theme.baseFontStyle} ${theme.fontFamily}`,
				markerFontFull: `${theme.markerFontStyle} ${theme.fontFamily}`,
			},
			// The following props are just added for technical reasons:
			spriteManager: {} as unknown as Parameters<typeof drawTextCell>[0]["spriteManager"],
			hyperWrapping: false,
		} as unknown as Parameters<typeof drawTextCell>[0],
		messages.grid.none(),
		(cell as { contentAlign?: "left" | "right" | "center" | undefined }).contentAlign
	);
	ctx.fillStyle = theme.textDark;
};
