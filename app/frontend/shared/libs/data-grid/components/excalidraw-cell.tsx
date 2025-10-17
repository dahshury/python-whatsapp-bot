import type { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
	AppState,
	ExcalidrawImperativeAPI,
	ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import {
	type CustomCell,
	type CustomRenderer,
	drawTextCell,
	GridCellKind,
	type Rectangle,
} from "@glideapps/glide-data-grid";
import dynamic from "next/dynamic";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createGlideTheme } from "../components/utils/streamlit-glide-theme";
import type {
	ExcalidrawCell,
	ExcalidrawCellProps,
} from "./models/excalidraw-cell-types";

// Excalidraw dynamic import (client-only)
const Excalidraw = dynamic<ExcalidrawProps>(
	async () => (await import("@excalidraw/excalidraw")).Excalidraw,
	{ ssr: false }
);

// Constants for magic numbers
const SIZE_TOLERANCE = 0.5;
const TOOL_BUTTON_SIZE = 20;
const TOOL_BUTTON_RADIUS = 4;
const TOOL_GAP = 4;
const MARGIN_RIGHT = 4;
const MARGIN_TOP_OFFSET = "50%";
const POSITION_Z_INDEX = 3;
const HEX_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const SVG_PREVIEW_MIN_WIDTH = 64;
const SVG_PREVIEW_MAX_WIDTH = 240;
const SVG_PREVIEW_MIN_HEIGHT = 40;
const SVG_PREVIEW_MAX_HEIGHT = 180;
const SVG_DEFAULT_WIDTH = 120;
const SVG_DEFAULT_HEIGHT = 60;
const RGB_MAX_VALUE = 255;
const HEX_RADIX = 16;
const COLOR_BLACK = "#000000";
const COLOR_WHITE = "#ffffff";
const COLOR_DEFAULT_BG = "#ffffff";
const COLOR_DEFAULT_STROKE = "#111827";
const BUTTON_OPACITY_HOVER = "15";
const BUTTON_OPACITY_ACTIVE = "25";
const ANIMATION_DURATION = "0.15s";
const ANIMATION_EASE = "ease-out";
const ANIMATION_TRANSFORM_DISTANCE = "8px";
const HTML_SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PERCENT_DIVISOR = 100;
const HSL_STRING_SLICE_START = 4;
const HSL_STRING_SLICE_END = -1;
const SRGB_THRESHOLD = 0.039_28;
const SRGB_GAMMA_ENCODE_COEFF = 12.92;
const SRGB_GAMMA_DECODE_NUMERATOR = 0.055;
const SRGB_GAMMA_DECODE_DENOMINATOR = 1.055;
const SRGB_GAMMA_DECODE_EXPONENT = 2.4;
const STROKE_WIDTH_THIN = 1;
const STROKE_WIDTH_BOLD = 2;
const STROKE_WIDTH_EXTRA_BOLD = 4;

// Lazy load exportToSvg util when needed
async function exportElementsToSvgDataUrl(args: {
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

		stripSvgBackground(svg);
		recolorSvgStrokes(svg, args.strokeColor);

		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svg);
		return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
	} catch {
		return null;
	}
}

// Helper to get SVG dimensions as numbers
function getSvgDimensions(
	svg: SVGSVGElement
): { width: number; height: number } | null {
	const wAttr = svg.getAttribute("width");
	const hAttr = svg.getAttribute("height");
	const w = wAttr ? Number.parseFloat(wAttr) : Number.NaN;
	const h = hAttr ? Number.parseFloat(hAttr) : Number.NaN;
	return Number.isFinite(w) && Number.isFinite(h)
		? { width: w, height: h }
		: null;
}

// Helper to check if a rect matches SVG dimensions (for background removal)
function isFullSizeRect(
	rect: Element,
	svgWidth: number,
	svgHeight: number
): boolean {
	const rwAttr = rect.getAttribute("width");
	const rhAttr = rect.getAttribute("height");
	const rw = rwAttr ? Number.parseFloat(rwAttr) : Number.NaN;
	const rh = rhAttr ? Number.parseFloat(rhAttr) : Number.NaN;
	return (
		Number.isFinite(rw) &&
		Number.isFinite(rh) &&
		Math.abs(rw - svgWidth) < SIZE_TOLERANCE &&
		Math.abs(rh - svgHeight) < SIZE_TOLERANCE
	);
}

// Helper to strip full-size background rects from SVG
function stripSvgBackground(svg: SVGSVGElement): void {
	try {
		const dims = getSvgDimensions(svg);
		if (!dims) {
			return;
		}
		const rects = Array.from(svg.querySelectorAll("rect"));
		for (const r of rects) {
			if (isFullSizeRect(r, dims.width, dims.height)) {
				r.parentElement?.removeChild(r);
				break;
			}
		}
	} catch {
		// Silently ignore errors during SVG background cleanup
	}
}

// Extract HSL to RGB conversion into a focused helper
function hslToRgbChannels(
	h: number,
	s: number,
	l: number
): { r: number; g: number; b: number } {
	const S = s / PERCENT_DIVISOR;
	const L = l / PERCENT_DIVISOR;
	const c = (1 - Math.abs(2 * L - 1)) * S;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = L - c / 2;

	const HUE_RED_START = 0;
	const HUE_RED_END = 60;
	const HUE_YELLOW_END = 120;
	const HUE_GREEN_END = 180;
	const HUE_CYAN_END = 240;
	const HUE_BLUE_END = 300;
	const HUE_CIRCLE = 360;

	let r = 0;
	let g = 0;
	let b = 0;

	if (h >= HUE_RED_START && h < HUE_RED_END) {
		r = c;
		g = x;
		b = 0;
	} else if (h >= HUE_RED_END && h < HUE_YELLOW_END) {
		r = x;
		g = c;
		b = 0;
	} else if (h >= HUE_YELLOW_END && h < HUE_GREEN_END) {
		r = 0;
		g = c;
		b = x;
	} else if (h >= HUE_GREEN_END && h < HUE_CYAN_END) {
		r = 0;
		g = x;
		b = c;
	} else if (h >= HUE_CYAN_END && h < HUE_BLUE_END) {
		r = x;
		g = 0;
		b = c;
	} else if (h >= HUE_BLUE_END && h < HUE_CIRCLE) {
		r = c;
		g = 0;
		b = x;
	}

	return { r: r + m, g: g + m, b: b + m };
}

// Helper to convert RGB channels to hex
function rgbToHex(r: number, g: number, b: number): string {
	const toHexComponent = (n: number) => {
		const v255 = Math.round(n * RGB_MAX_VALUE);
		const hex = v255.toString(HEX_RADIX);
		return hex.length === 1 ? `0${hex}` : hex;
	};
	return `#${toHexComponent(r)}${toHexComponent(g)}${toHexComponent(b)}`;
}

// Helper to parse CSS variable as hex color
function resolveCssVarHex(varName: string, fallback: string): string {
	try {
		if (typeof window === "undefined" || typeof document === "undefined") {
			return fallback;
		}
		const cs = getComputedStyle(document.documentElement);
		const v = cs.getPropertyValue(varName).trim();
		if (!v) {
			return fallback;
		}
		if (v.startsWith("#")) {
			return v;
		}
		const hsl = v.startsWith("hsl(")
			? v.slice(HSL_STRING_SLICE_START, HSL_STRING_SLICE_END)
			: v;
		const parts = hsl.split(" ");
		const EXPECTED_HSL_PARTS = 3;
		if (parts.length !== EXPECTED_HSL_PARTS) {
			return fallback;
		}
		const h = Number.parseFloat(parts[0] ?? "0");
		const s = Number.parseFloat(parts[1] ?? "0");
		const l = Number.parseFloat(parts[2] ?? "0");
		if (!(Number.isFinite(h) && Number.isFinite(s) && Number.isFinite(l))) {
			return fallback;
		}
		const rgb = hslToRgbChannels(h, s, l);
		return rgbToHex(rgb.r, rgb.g, rgb.b);
	} catch {
		return fallback;
	}
}

// Helper to parse hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	try {
		const m = HEX_REGEX.exec(hex);
		if (!m) {
			return null;
		}
		const rr = m[1] ?? "00";
		const gg = m[2] ?? "00";
		const bb = m[3] ?? "00";
		return {
			r: Number.parseInt(rr, HEX_RADIX),
			g: Number.parseInt(gg, HEX_RADIX),
			b: Number.parseInt(bb, HEX_RADIX),
		};
	} catch {
		return null;
	}
}

// Helper to calculate relative luminance
function relLuma(hex: string): number {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return 0;
	}
	const toLinear = (v: number) => {
		const s = v / RGB_MAX_VALUE;
		return s <= SRGB_THRESHOLD
			? s / SRGB_GAMMA_ENCODE_COEFF
			: ((s + SRGB_GAMMA_DECODE_NUMERATOR) / SRGB_GAMMA_DECODE_DENOMINATOR) **
					SRGB_GAMMA_DECODE_EXPONENT;
	};
	const R = toLinear(rgb.r);
	const G = toLinear(rgb.g);
	const B = toLinear(rgb.b);
	const LUMA_R_WEIGHT = 0.2126;
	const LUMA_G_WEIGHT = 0.7152;
	const LUMA_B_WEIGHT = 0.0722;
	return LUMA_R_WEIGHT * R + LUMA_G_WEIGHT * G + LUMA_B_WEIGHT * B;
}

// Helper to calculate contrast ratio
function contrastRatio(a: string, b: string): number {
	const L1 = relLuma(a);
	const L2 = relLuma(b);
	const light = Math.max(L1, L2);
	const dark = Math.min(L1, L2);
	const CONTRAST_OFFSET = 0.05;
	return (light + CONTRAST_OFFSET) / (dark + CONTRAST_OFFSET);
}

// Helper to inject style override for SVG stroke colors
function injectStrokeStyleOverride(
	svg: SVGSVGElement,
	strokeColor: string
): void {
	try {
		const style = document.createElementNS(HTML_SVG_NAMESPACE, "style");
		style.textContent = `* { stroke: ${strokeColor} !important; fill: ${strokeColor} !important; }`;
		svg.insertBefore(style, svg.firstChild);
	} catch {
		// Silently ignore style injection errors
	}
}

// Helper to recolor SVG strokes for contrast
function recolorSvgStrokes(svg: SVGSVGElement, strokeColor?: string): void {
	try {
		if (!strokeColor) {
			return;
		}
		const nodes = Array.from(svg.querySelectorAll("*"));
		for (const n of nodes) {
			const hasStroke = n.getAttribute("stroke");
			if (hasStroke && hasStroke !== "none") {
				n.setAttribute("stroke", strokeColor);
			}
		}
		// Also inject a style override to force stroke color (beats presentation attrs)
		injectStrokeStyleOverride(svg, strokeColor);
	} catch {
		// Silently ignore stroke recoloring errors
	}
}

// Helper to get the best contrast color (black or white)
function getBestContrastColor(backgroundColor: string): string {
	const blackContrast = contrastRatio(backgroundColor, COLOR_BLACK);
	const whiteContrast = contrastRatio(backgroundColor, COLOR_WHITE);
	return blackContrast >= whiteContrast ? COLOR_BLACK : COLOR_WHITE;
}

// Helper to get grid theme colors
function getGridThemeColors(isDark: boolean): {
	bgCell: string;
	stroke: string;
} {
	try {
		const t = createGlideTheme(isDark ? "dark" : "light");
		const bg = resolveCssVarHex(
			"--gdg-bg-cell",
			String(((t as { bgCell?: unknown }).bgCell as string) || COLOR_DEFAULT_BG)
		);
		const best = getBestContrastColor(bg);
		return { bgCell: bg, stroke: best };
	} catch {
		return { bgCell: COLOR_DEFAULT_BG, stroke: COLOR_DEFAULT_STROKE };
	}
}

// Minimal UI options: hide everything; pen by default handled via appState tweak
const hiddenUiOptions: ExcalidrawProps["UIOptions"] = {
	canvasActions: {
		toggleTheme: false,
		export: false,
		saveAsImage: false,
		clearCanvas: false,
		loadScene: false,
		saveToActiveFile: false,
	},
};

// Utility to build initialData for Excalidraw from cell scene, forcing pen tool
function buildInitialData(
	scene?: ExcalidrawCellProps["scene"],
	opts?: { viewBg?: string; stroke?: string }
): Record<string, unknown> {
	const appState: Partial<AppState> = {
		// Prefer pen tool on start
		activeTool: {
			type: "freedraw",
			customType: null,
			lastActiveTool: null,
			locked: false,
		},
		// Hide UI bits defensively; renderer also uses UIOptions
		frameRendering: {
			enabled: false,
			name: false,
			outline: false,
			clip: false,
		},
		viewModeEnabled: false,
		zenModeEnabled: false,
		...(opts?.stroke ? { currentItemStrokeColor: opts.stroke } : {}),
		...(opts?.viewBg ? { viewBackgroundColor: opts.viewBg } : {}),
	};
	return {
		...(scene || {}),
		appState: { ...(scene?.appState || {}), ...appState },
	};
}

const ExcalidrawCellEditor: React.FC<{
	value: ExcalidrawCell;
	onChange: (next: ExcalidrawCell) => void;
	onFinishedEditing: (
		next?: ExcalidrawCell,
		movement?: readonly [-1 | 0 | 1, -1 | 0 | 1]
	) => void;
	target: Rectangle;
}> = ({ value, onChange, onFinishedEditing: _onFinishedEditing, target }) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [mounted, setMounted] = useState(false);
	const initialDataRef = useRef<Record<string, unknown> | null>(null);
	const rafRef = useRef<number | null>(null);
	const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
	const initialSceneRef = useRef<ExcalidrawCellProps["scene"] | undefined>(
		value.data.scene
	);
	const [showStrokeSelector, setShowStrokeSelector] = useState(false);
	const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(1); // thin by default
	const [activeTool, setActiveTool] = useState<"freedraw" | "eraser">(
		"freedraw"
	);

	// Derive grid theme colors for background and stroke contrast
	const { bgCell, stroke } = useMemo(() => {
		const isDark =
			typeof document !== "undefined" &&
			document?.documentElement?.classList?.contains?.("dark") === true;
		return getGridThemeColors(isDark);
	}, []);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) {
			return;
		}
		const { width, height } = el.getBoundingClientRect();
		if (width > 1 && height > 1) {
			setMounted(true);
			return;
		}
		let resolved = false;
		const ro = new ResizeObserver((entries) => {
			const r = entries[0]?.target as HTMLElement | undefined;
			const rect = r?.getBoundingClientRect?.();
			if (rect && rect.width > 1 && rect.height > 1 && !resolved) {
				resolved = true;
				setMounted(true);
				try {
					ro.disconnect();
				} catch {
					// Silently ignore ResizeObserver disconnect errors
				}
			}
		});
		try {
			ro.observe(el as Element);
		} catch {
			// Silently ignore ResizeObserver observe errors
		}
		return () => {
			try {
				ro.disconnect();
			} catch {
				// Silently ignore ResizeObserver cleanup errors
			}
		};
	}, []);

	// Seed initial data only once to avoid reinitializing Excalidraw on each edit update
	useEffect(() => {
		if (mounted && initialDataRef.current === null) {
			initialDataRef.current = buildInitialData(initialSceneRef.current, {
				viewBg: bgCell as string,
				stroke: stroke as string,
			});
		}
	}, [mounted, bgCell, stroke]);

	// Note: onFinishedEditing is intentionally not used; editing persists live into cell value.
	return (
		<div
			ref={containerRef}
			style={{
				width: Math.max(1, target?.width ?? 1),
				height: Math.max(1, target?.height ?? 1),
				// Ensure Excalidraw fills exactly the cell area
				display: "block",
				position: "relative",
				overflow: "hidden",
				backgroundColor: bgCell,
			}}
		>
			{mounted ? (
				<Excalidraw
					excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
						apiRef.current = api;
					}}
					initialData={() =>
						initialDataRef.current as unknown as Record<string, unknown> | null
					}
					onChange={(elements, appState, files) => {
						// Coalesce rapid Excalidraw changes into a single grid update per frame
						if (rafRef.current != null) {
							return;
						}
						rafRef.current = requestAnimationFrame(async () => {
							rafRef.current = null;
							const next: ExcalidrawCell = {
								...value,
								data: {
									...value.data,
									scene: { elements, appState, files },
								},
								copyData: value.data.display ?? "",
							};
							// Generate a small SVG preview for display (avoid heavy canvas in-cell)
							try {
								const maxW = Math.min(
									Math.max(
										SVG_PREVIEW_MIN_WIDTH,
										target?.width ?? SVG_DEFAULT_WIDTH
									),
									SVG_PREVIEW_MAX_WIDTH
								);
								const maxH = Math.min(
									Math.max(
										SVG_PREVIEW_MIN_HEIGHT,
										target?.height ?? SVG_DEFAULT_HEIGHT
									),
									SVG_PREVIEW_MAX_HEIGHT
								);
								const dataUrl = await exportElementsToSvgDataUrl({
									elements: elements as unknown as readonly unknown[],
									appState: appState as unknown as Partial<AppState>,
									files: files as unknown as Record<string, unknown>,
									width: maxW,
									height: maxH,
									strokeColor: stroke as string,
								});
								if (dataUrl) {
									const nextWithPreview: ExcalidrawCell = {
										...next,
										data: {
											...(next.data as unknown as ExcalidrawCellProps),
											preview: dataUrl,
										} as unknown as ExcalidrawCellProps,
									};
									onChange(nextWithPreview);
									return;
								}
							} catch {
								// Silently ignore SVG preview generation errors
							}
							onChange(next);
						});
					}}
					UIOptions={hiddenUiOptions}
					// Obtain imperative API for tool switching via excalidrawAPI prop
					viewModeEnabled={false}
					zenModeEnabled={false}
					// Hide all built-in UI via CSS in addition to UIOptions
				>
					{/* Hide UI and align editor surface background to cell bg */}
					<style>
						{`.excalidraw .App-toolbar, .excalidraw .App-toolbar-content, .excalidraw .layer-ui__wrapper, .excalidraw .help-icon, .excalidraw .zen-mode-transition.App-menu_bottom, .excalidraw .library-menu, .excalidraw .mobile-misc-tools-container { display: none !important; }
                        .excalidraw, .excalidraw .layer-ui__wrapper__top, .excalidraw .layer-ui__wrapper__footer { background: ${bgCell} !important; }
                        .excalidraw .HintViewer { display: none !important; }`}
					</style>
				</Excalidraw>
			) : null}
			{/* Mini toolbar: pen and eraser on the right */}
			{mounted ? (
				<div
					style={{
						position: "absolute",
						right: MARGIN_RIGHT,
						top: MARGIN_TOP_OFFSET,
						transform: "translateY(-50%)",
						display: "flex",
						flexDirection: "column",
						gap: TOOL_GAP,
						zIndex: POSITION_Z_INDEX,
						pointerEvents: "auto",
					}}
				>
					{/* Stroke width selector - positioned absolutely to the left of pen button */}
					{showStrokeSelector && (
						<div
							style={{
								position: "absolute",
								right: TOOL_BUTTON_SIZE + TOOL_GAP, // Position to the left of the pen button (20px button + 8px gap)
								top: 0,
								display: "flex",
								flexDirection: "row",
								gap: TOOL_GAP,
								animation: `slideInLeft ${ANIMATION_DURATION} ${ANIMATION_EASE}`,
							}}
						>
							<style>
								{`@keyframes slideInLeft {
								from {
									opacity: 0;
									transform: translateX(${ANIMATION_TRANSFORM_DISTANCE});
								}
								to {
									opacity: 1;
									transform: translateX(0);
								}
							}`}
							</style>
							{/* Thin */}
							<button
								aria-label="Thin stroke"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									try {
										const api = apiRef.current;
										if (api) {
											const apiAny = api as unknown as Record<string, unknown>;
											(
												apiAny.updateScene as (
													opts: Record<string, unknown>
												) => void
											)?.({
												appState: { currentItemStrokeWidth: STROKE_WIDTH_THIN },
											});
											setCurrentStrokeWidth(STROKE_WIDTH_THIN);
											setShowStrokeSelector(false);
										}
									} catch {
										// Silently ignore stroke width update errors
									}
								}}
								style={{
									width: TOOL_BUTTON_SIZE,
									height: TOOL_BUTTON_SIZE,
									borderRadius: TOOL_BUTTON_RADIUS,
									border: `1px solid ${stroke}`,
									backgroundColor:
										currentStrokeWidth === STROKE_WIDTH_THIN
											? `${stroke}${BUTTON_OPACITY_ACTIVE}`
											: "transparent",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									padding: 0,
									cursor: "pointer",
									color: stroke,
									transition: `background-color ${ANIMATION_DURATION} ${ANIMATION_EASE}`,
								}}
								title="Thin"
								type="button"
							>
								<svg
									aria-hidden="true"
									fill="none"
									focusable="false"
									height="12"
									role="img"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									viewBox="0 0 20 20"
									width="12"
								>
									<path d="M4.167 10h11.666" strokeWidth="1.25" />
								</svg>
							</button>
							{/* Bold */}
							<button
								aria-label="Bold stroke"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									try {
										const api = apiRef.current;
										if (api) {
											const apiAny = api as unknown as Record<string, unknown>;
											(
												apiAny.updateScene as (
													opts: Record<string, unknown>
												) => void
											)?.({
												appState: { currentItemStrokeWidth: STROKE_WIDTH_BOLD },
											});
											setCurrentStrokeWidth(STROKE_WIDTH_BOLD);
											setShowStrokeSelector(false);
										}
									} catch {
										// Silently ignore stroke width update errors
									}
								}}
								style={{
									width: TOOL_BUTTON_SIZE,
									height: TOOL_BUTTON_SIZE,
									borderRadius: TOOL_BUTTON_RADIUS,
									border: `1px solid ${stroke}`,
									backgroundColor:
										currentStrokeWidth === STROKE_WIDTH_BOLD
											? `${stroke}${BUTTON_OPACITY_ACTIVE}`
											: "transparent",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									padding: 0,
									cursor: "pointer",
									color: stroke,
									transition: `background-color ${ANIMATION_DURATION} ${ANIMATION_EASE}`,
								}}
								title="Bold"
								type="button"
							>
								<svg
									aria-hidden="true"
									fill="none"
									focusable="false"
									height="12"
									role="img"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									viewBox="0 0 20 20"
									width="12"
								>
									<path d="M5 10h10" strokeWidth="2.5" />
								</svg>
							</button>
							{/* Extra Bold */}
							<button
								aria-label="Extra bold stroke"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									try {
										const api = apiRef.current;
										if (api) {
											const apiAny = api as unknown as Record<string, unknown>;
											(
												apiAny.updateScene as (
													opts: Record<string, unknown>
												) => void
											)?.({
												appState: {
													currentItemStrokeWidth: STROKE_WIDTH_EXTRA_BOLD,
												},
											});
											setCurrentStrokeWidth(STROKE_WIDTH_EXTRA_BOLD);
											setShowStrokeSelector(false);
										}
									} catch {
										// Silently ignore stroke width update errors
									}
								}}
								style={{
									width: TOOL_BUTTON_SIZE,
									height: TOOL_BUTTON_SIZE,
									borderRadius: TOOL_BUTTON_RADIUS,
									border: `1px solid ${stroke}`,
									backgroundColor:
										currentStrokeWidth === STROKE_WIDTH_EXTRA_BOLD
											? `${stroke}${BUTTON_OPACITY_ACTIVE}`
											: "transparent",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									padding: 0,
									cursor: "pointer",
									color: stroke,
									transition: `background-color ${ANIMATION_DURATION} ${ANIMATION_EASE}`,
								}}
								title="Extra Bold"
								type="button"
							>
								<svg
									aria-hidden="true"
									fill="none"
									focusable="false"
									height="12"
									role="img"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									viewBox="0 0 20 20"
									width="12"
								>
									<path d="M5 10h10" strokeWidth="3.75" />
								</svg>
							</button>
						</div>
					)}
					<button
						aria-label="Pen"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							try {
								const api = apiRef.current;
								if (api) {
									// If pen is already active, toggle the stroke selector
									if (activeTool === "freedraw") {
										setShowStrokeSelector((prev) => !prev);
									} else {
										// Otherwise, switch to pen tool
										api.setActiveTool({ type: "freedraw" });
										setActiveTool("freedraw");
										setShowStrokeSelector(false);
									}
								}
							} catch {
								// Silently ignore tool activation errors
							}
						}}
						onMouseEnter={(e) => {
							if (activeTool !== "freedraw") {
								e.currentTarget.style.backgroundColor = `${stroke}${BUTTON_OPACITY_HOVER}`;
							}
						}}
						onMouseLeave={(e) => {
							if (activeTool !== "freedraw") {
								e.currentTarget.style.backgroundColor = "transparent";
							}
						}}
						style={{
							width: TOOL_BUTTON_SIZE,
							height: TOOL_BUTTON_SIZE,
							borderRadius: TOOL_BUTTON_RADIUS,
							border: `1px solid ${stroke}`,
							backgroundColor:
								activeTool === "freedraw"
									? `${stroke}${BUTTON_OPACITY_ACTIVE}`
									: "transparent",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							padding: 0,
							cursor: "pointer",
							color: stroke,
							transition: `background-color ${ANIMATION_DURATION} ${ANIMATION_EASE}`,
						}}
						title="Pen Tool"
						type="button"
					>
						{/* Excalidraw-like pen icon */}
						<svg
							aria-hidden="true"
							fill="none"
							focusable="false"
							height="12"
							role="img"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							viewBox="0 0 20 20"
							width="12"
						>
							<g strokeWidth="1.25">
								<path
									clipRule="evenodd"
									d="m7.643 15.69 7.774-7.773a2.357 2.357 0 1 0-3.334-3.334L4.31 12.357a3.333 3.333 0 0 0-.977 2.357v1.953h1.953c.884 0 1.732-.352 2.357-.977Z"
								/>
								<path d="m11.25 5.417 3.333 3.333" />
							</g>
						</svg>
					</button>
					<button
						aria-label="Eraser"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							try {
								const api = apiRef.current;
								if (api) {
									api.setActiveTool({ type: "eraser" });
									setActiveTool("eraser");
									// Close stroke selector when switching to eraser
									setShowStrokeSelector(false);
								}
							} catch {
								// Silently ignore tool activation errors
							}
						}}
						onMouseEnter={(e) => {
							if (activeTool !== "eraser") {
								e.currentTarget.style.backgroundColor = `${stroke}${BUTTON_OPACITY_HOVER}`;
							}
						}}
						onMouseLeave={(e) => {
							if (activeTool !== "eraser") {
								e.currentTarget.style.backgroundColor = "transparent";
							}
						}}
						style={{
							width: TOOL_BUTTON_SIZE,
							height: TOOL_BUTTON_SIZE,
							borderRadius: TOOL_BUTTON_RADIUS,
							border: `1px solid ${stroke}`,
							backgroundColor:
								activeTool === "eraser"
									? `${stroke}${BUTTON_OPACITY_ACTIVE}`
									: "transparent",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							padding: 0,
							cursor: "pointer",
							color: stroke,
							transition: `background-color ${ANIMATION_DURATION} ${ANIMATION_EASE}`,
						}}
						title="Eraser Tool"
						type="button"
					>
						{/* Excalidraw-like eraser icon */}
						<svg
							aria-hidden="true"
							fill="none"
							focusable="false"
							height="12"
							role="img"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="12"
						>
							<g strokeWidth="1.5">
								<path d="M0 0h24v24H0z" fill="none" stroke="none" />
								<path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3" />
								<path d="M18 13.3l-6.3 -6.3" />
							</g>
						</svg>
					</button>
				</div>
			) : null}
		</div>
	);
};

const ExcalidrawCellRenderer: CustomRenderer<ExcalidrawCell> = {
	kind: GridCellKind.Custom,
	isMatch: (cell): cell is ExcalidrawCell =>
		cell.kind === GridCellKind.Custom &&
		typeof (cell as CustomCell<ExcalidrawCellProps>).data === "object" &&
		(cell as CustomCell<ExcalidrawCellProps>).data?.kind === "excalidraw-cell",

	draw: (args, cell) => {
		// Draw cached SVG preview if available for performance
		const { ctx, rect } = args;
		const preview = (cell.data as { preview?: string }).preview;
		if (preview && typeof Image !== "undefined") {
			try {
				const loader = (
					args as unknown as {
						imageLoader?: {
							loadOrGetImage: (
								src: string,
								c: number,
								r: number
							) => HTMLImageElement | ImageBitmap | undefined;
						};
						col?: number;
						row?: number;
					}
				).imageLoader;
				const col = (args as unknown as { col?: number }).col ?? 0;
				const row = (args as unknown as { row?: number }).row ?? 0;
				const img = loader?.loadOrGetImage?.(preview, col, row);
				if (img) {
					ctx.save();
					ctx.beginPath();
					ctx.rect(rect.x, rect.y, rect.width, rect.height);
					ctx.clip();
					const iw =
						(img as HTMLImageElement).width ??
						(img as ImageBitmap).width ??
						rect.width;
					const ih =
						(img as HTMLImageElement).height ??
						(img as ImageBitmap).height ??
						rect.height;
					const scale = Math.min(rect.width / iw, rect.height / ih);
					const dw = iw * scale;
					const dh = ih * scale;
					const dx = rect.x + (rect.width - dw) / 2;
					const dy = rect.y + (rect.height - dh) / 2;
					ctx.imageSmoothingEnabled = true;
					ctx.imageSmoothingQuality =
						"high" as unknown as ImageSmoothingQuality;
					ctx.drawImage(img as unknown as CanvasImageSource, dx, dy, dw, dh);
					ctx.restore();
					return true;
				}
			} catch {
				// Silently ignore SVG drawing errors
			}
		}
		const display = cell.data.display ?? "";
		drawTextCell(args, display, cell.contentAlign);
		return true;
	},

	measure: (ctx, cell, theme) => {
		const display = cell.data.display ?? "";
		return ctx.measureText(display).width + theme.cellHorizontalPadding * 2;
	},

	provideEditor: () => ({
		editor: (props) => (
			<ExcalidrawCellEditor
				{...(props as React.ComponentProps<typeof ExcalidrawCellEditor>)}
			/>
		),
		disablePadding: true,
	}),
};

export default ExcalidrawCellRenderer;
