import {
	SVG_NAMESPACE,
	SVG_TOLERANCE_THRESHOLD,
} from "../../constants/excalidraw-constants";

// Helper function to remove background rectangles from SVG
export function stripSvgBackgroundRects(svg: SVGSVGElement): void {
	try {
		const wAttr = svg.getAttribute("width");
		const hAttr = svg.getAttribute("height");
		const w = wAttr ? Number.parseFloat(wAttr) : Number.NaN;
		const h = hAttr ? Number.parseFloat(hAttr) : Number.NaN;

		if (!(Number.isFinite(w) && Number.isFinite(h))) {
			return;
		}

		const rects = Array.from(svg.querySelectorAll("rect"));
		for (const rect of rects) {
			const rwAttr = rect.getAttribute("width");
			const rhAttr = rect.getAttribute("height");
			const rw = rwAttr ? Number.parseFloat(rwAttr) : Number.NaN;
			const rh = rhAttr ? Number.parseFloat(rhAttr) : Number.NaN;

			if (
				Number.isFinite(rw) &&
				Number.isFinite(rh) &&
				Math.abs(rw - w) < SVG_TOLERANCE_THRESHOLD &&
				Math.abs(rh - h) < SVG_TOLERANCE_THRESHOLD
			) {
				rect.parentElement?.removeChild(rect);
				break;
			}
		}
	} catch {
		// Failed to strip background rects
	}
}

// Helper function to recolor SVG strokes
export function recolorSvgStrokes(
	svg: SVGSVGElement,
	strokeColor: string
): void {
	try {
		const nodes = Array.from(svg.querySelectorAll("*"));
		for (const node of nodes) {
			const hasStroke = node.getAttribute("stroke");
			if (hasStroke && hasStroke !== "none") {
				node.setAttribute("stroke", strokeColor);
			}
		}

		// Inject style override to force stroke color
		try {
			const style = document.createElementNS(SVG_NAMESPACE, "style");
			style.textContent = `* { stroke: ${strokeColor} !important; fill: ${strokeColor} !important; }`;
			svg.insertBefore(style, svg.firstChild);
		} catch {
			// Failed to inject style
		}
	} catch {
		// Failed to recolor strokes
	}
}
