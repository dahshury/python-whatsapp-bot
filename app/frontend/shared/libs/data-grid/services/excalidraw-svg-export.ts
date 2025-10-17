import type { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";
import {
	recolorSvgStrokes,
	stripSvgBackgroundRects,
} from "../components/utils/svg-utils";

// Lazy load exportToSvg util when needed
export async function exportElementsToSvgDataUrl(args: {
	elements: readonly unknown[];
	appState: Partial<AppState>;
	files: Record<string, unknown>;
	width: number;
	height: number;
	strokeColor?: string;
}): Promise<string | null> {
	try {
		const mod = await import("@excalidraw/excalidraw");
		const svg = await (
			mod as unknown as {
				exportToSvg: (opts: {
					elements: readonly NonDeletedExcalidrawElement[];
					appState: Partial<AppState> & { width?: number; height?: number };
					files: Record<string, unknown>;
				}) => Promise<SVGSVGElement>;
			}
		).exportToSvg({
			elements:
				args.elements as unknown as readonly NonDeletedExcalidrawElement[],
			// Force transparent background so only strokes are visible
			appState: {
				...args.appState,
				width: args.width,
				height: args.height,
				viewBackgroundColor: "transparent",
			},
			files: args.files,
		});

		// Strip any full-size background rect if present
		stripSvgBackgroundRects(svg);

		// Optionally recolor strokes for better contrast
		if (args.strokeColor) {
			recolorSvgStrokes(svg, args.strokeColor);
		}

		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svg);
		return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
	} catch {
		// Failed to export elements to SVG
		return null;
	}
}
