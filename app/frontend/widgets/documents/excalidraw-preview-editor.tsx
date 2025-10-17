"use client";

import type { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
	AppState,
	ExcalidrawImperativeAPI,
	ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import { Pencil, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import React, { useCallback, useRef, useState } from "react";
import { cn } from "@/shared/libs/utils";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

// Extend the ExcalidrawImperativeAPI type to include updateScene method
type ExcalidrawImperativeAPIExtended = ExcalidrawImperativeAPI & {
	updateScene: (options: { appState: Partial<AppState> }) => void;
};

// Dynamic import for Excalidraw to avoid SSR issues
const Excalidraw = dynamic<ExcalidrawProps>(
	async () => (await import("@excalidraw/excalidraw")).Excalidraw,
	{ ssr: false }
);

type ExcalidrawPreviewEditorProps = {
	value: unknown;
	onChange: (value: unknown) => void;
	theme?: "light" | "dark";
	className?: string;
	previewHeight?: number;
	editorHeight?: number;
};

// Color conversion constants
const SRGB_THRESHOLD = 0.039_28;
const SRGB_DIVISOR = 12.92;
const SRGB_OFFSET = 0.055;
const SRGB_DENOMINATOR = 1.055;
const SRGB_POWER = 2.4;
const LUMA_RED_FACTOR = 0.2126;
const LUMA_GREEN_FACTOR = 0.7152;
const LUMA_BLUE_FACTOR = 0.0722;
const CONTRAST_RATIO_OFFSET = 0.05;
const HEX_DIVISOR = 100;
const COLOR_MAX = 255;
const HSL_DEGREES_SECTION = 60;
const HSL_FULL_ROTATION = 360;
const HSL_PREFIX_LENGTH = 4; // "hsl(" length
const HSL_EXPECTED_PARTS = 3; // h, s, l
const HSL_MULTIPLIER_2 = 2;
const HSL_MULTIPLIER_3 = 3;
const HSL_MULTIPLIER_4 = 4;
const HSL_MULTIPLIER_5 = 5;
const HSL_SECTION_2 = HSL_MULTIPLIER_2 * HSL_DEGREES_SECTION; // 120
const HSL_SECTION_3 = HSL_MULTIPLIER_3 * HSL_DEGREES_SECTION; // 180
const HSL_SECTION_4 = HSL_MULTIPLIER_4 * HSL_DEGREES_SECTION; // 240
const HSL_SECTION_5 = HSL_MULTIPLIER_5 * HSL_DEGREES_SECTION; // 300
const HEX_RADIX = 16;
const HEX_SINGLE_DIGIT_LENGTH = 1;
const STROKE_WIDTH_DEFAULT = 4;
const EDITOR_POSITION_TOLERANCE = 0.5;
// Hex color regex: matches #RGB or #RRGGBB (case insensitive)
const HEX_COLOR_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
// Resize observer fit-to-content delays in milliseconds
const INITIAL_RESIZE_DELAY_MS = 0;
const SHORT_RESIZE_DELAY_MS = 50;
const MEDIUM_RESIZE_DELAY_MS = 150;
const LONG_RESIZE_DELAY_MS = 300;
const FIT_TO_CONTENT_DELAYS_MS = [
	INITIAL_RESIZE_DELAY_MS,
	SHORT_RESIZE_DELAY_MS,
	MEDIUM_RESIZE_DELAY_MS,
	LONG_RESIZE_DELAY_MS,
] as const;

/**
 * Parse SVG dimension attribute as a number
 */
function parseSvgDimension(value: string | null): number {
	return value ? Number.parseFloat(value) : Number.NaN;
}

/**
 * Check if a rectangle matches the full SVG size
 */
function isFullSizeRect(
	rectWidth: number,
	rectHeight: number,
	svgWidth: number,
	svgHeight: number
): boolean {
	return (
		Number.isFinite(rectWidth) &&
		Number.isFinite(rectHeight) &&
		Math.abs(rectWidth - svgWidth) < EDITOR_POSITION_TOLERANCE &&
		Math.abs(rectHeight - svgHeight) < EDITOR_POSITION_TOLERANCE
	);
}

/**
 * Remove full-size background rect from SVG if present
 */
function removeBackgroundRectFromSvg(svg: SVGSVGElement): void {
	try {
		const w = parseSvgDimension(svg.getAttribute("width"));
		const h = parseSvgDimension(svg.getAttribute("height"));
		if (Number.isFinite(w) && Number.isFinite(h)) {
			const rects = Array.from(svg.querySelectorAll("rect"));
			for (const r of rects) {
				const rw = parseSvgDimension(r.getAttribute("width"));
				const rh = parseSvgDimension(r.getAttribute("height"));
				if (isFullSizeRect(rw, rh, w, h)) {
					r.parentElement?.removeChild(r);
					break;
				}
			}
		}
	} catch {
		// Silently ignore errors
	}
}

/**
 * Recolor SVG strokes to specified color
 */
function recolorSvgStrokes(svg: SVGSVGElement, strokeColor: string): void {
	try {
		const nodes = Array.from(svg.querySelectorAll("*"));
		for (const n of nodes) {
			const hasStroke = n.getAttribute("stroke");
			if (hasStroke && hasStroke !== "none") {
				n.setAttribute("stroke", strokeColor);
			}
		}
		// Also inject a style override to force stroke color (beats presentation attrs)
		try {
			const style = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"style"
			);
			style.textContent = `* { stroke: ${strokeColor} !important; fill: ${strokeColor} !important; }`;
			svg.insertBefore(style, svg.firstChild);
		} catch {
			// Silently ignore errors
		}
	} catch {
		// Silently ignore SVG manipulation errors
	}
}

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

		// Strip any full-size background rect if present
		removeBackgroundRectFromSvg(svg);

		// Optionally recolor strokes for better contrast
		if (args.strokeColor) {
			recolorSvgStrokes(svg, args.strokeColor);
		}

		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svg);
		return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
	} catch {
		return null;
	}
}

/**
 * Parse HSL string and extract h, s, l values
 */
function parseHslString(
	hslStr: string
): { h: number; s: number; l: number } | null {
	const parts = hslStr.split(" ");
	if (parts.length !== HSL_EXPECTED_PARTS) {
		return null;
	}
	const h = Number.parseFloat(parts[0] ?? "0");
	const s = Number.parseFloat(parts[1] ?? "0");
	const l = Number.parseFloat(parts[2] ?? "0");
	if (!(Number.isFinite(h) && Number.isFinite(s) && Number.isFinite(l))) {
		return null;
	}
	return { h, s, l };
}

/**
 * Calculate RGB components from HSL values
 */
function hslToRgbComponents(
	h: number,
	s: number,
	l: number
): { r: number; g: number; b: number } {
	const S = s / HEX_DIVISOR;
	const L = l / HEX_DIVISOR;
	const c = (1 - Math.abs(2 * L - 1)) * S;
	const x = c * (1 - Math.abs(((h / HSL_DEGREES_SECTION) % 2) - 1));
	const m = L - c / 2;

	let r = 0;
	let g = 0;
	let b = 0;

	if (0 <= h && h < HSL_DEGREES_SECTION) {
		r = c;
		g = x;
		b = 0;
	} else if (HSL_DEGREES_SECTION <= h && h < HSL_SECTION_2) {
		r = x;
		g = c;
		b = 0;
	} else if (HSL_SECTION_2 <= h && h < HSL_SECTION_3) {
		r = 0;
		g = c;
		b = x;
	} else if (HSL_SECTION_3 <= h && h < HSL_SECTION_4) {
		r = 0;
		g = x;
		b = c;
	} else if (HSL_SECTION_4 <= h && h < HSL_SECTION_5) {
		r = x;
		g = 0;
		b = c;
	} else if (HSL_SECTION_5 <= h && h < HSL_FULL_ROTATION) {
		r = c;
		g = 0;
		b = x;
	}

	return { r: r + m, g: g + m, b: b + m };
}

/**
 * Convert a color component value to 2-digit hex string
 */
function componentToHex(n: number): string {
	const v255 = Math.round(n * COLOR_MAX);
	const hex = v255.toString(HEX_RADIX);
	return hex.length === HEX_SINGLE_DIGIT_LENGTH ? `0${hex}` : hex;
}

// Utility to resolve CSS variables for theme colors
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
		const hsl = v.startsWith("hsl(") ? v.slice(HSL_PREFIX_LENGTH, -1) : v;
		const parsed = parseHslString(hsl);
		if (!parsed) {
			return fallback;
		}
		const { r, g, b } = hslToRgbComponents(parsed.h, parsed.s, parsed.l);
		return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
	} catch {
		return fallback;
	}
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	try {
		const m = HEX_COLOR_REGEX.exec(hex);
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

function relLuma(hex: string): number {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return 0;
	}
	const toLinear = (v: number) => {
		const s = v / COLOR_MAX;
		return s <= SRGB_THRESHOLD
			? s / SRGB_DIVISOR
			: ((s + SRGB_OFFSET) / SRGB_DENOMINATOR) ** SRGB_POWER;
	};
	const R = toLinear(rgb.r);
	const G = toLinear(rgb.g);
	const B = toLinear(rgb.b);
	return LUMA_RED_FACTOR * R + LUMA_GREEN_FACTOR * G + LUMA_BLUE_FACTOR * B;
}

function contrastRatio(a: string, b: string): number {
	const L1 = relLuma(a);
	const L2 = relLuma(b);
	const light = Math.max(L1, L2);
	const dark = Math.min(L1, L2);
	return (light + CONTRAST_RATIO_OFFSET) / (dark + CONTRAST_RATIO_OFFSET);
}

export function ExcalidrawPreviewEditor({
	value,
	onChange,
	className,
	previewHeight = 200,
	editorHeight = 400,
}: ExcalidrawPreviewEditorProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [previewSvg] = useState<string | null>(null);
	const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
	const [mounted, setMounted] = useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	const handleExcalidrawChange = useCallback(
		(elements: unknown, appState: unknown, files: unknown) => {
			const updatedValue = {
				data: {
					scene: { elements, appState, files },
				},
			};
			onChange(updatedValue);
			// Live preview disabled - preview updates only on initial load
		},
		[onChange]
	);

	const handleClose = useCallback(() => {
		setIsEditing(false);
	}, []);

	if (!mounted) {
		return <div className="h-32 rounded-md bg-muted/50" />;
	}

	if (isEditing) {
		return (
			<div
				className={cn(
					"relative w-full rounded-md border border-border",
					className
				)}
			>
				{/* Close button */}
				<button
					aria-label="Close editor"
					className="absolute top-2 right-2 z-50 rounded-md p-2 transition-colors hover:bg-muted"
					onClick={handleClose}
					type="button"
				>
					<X className="h-5 w-5" />
				</button>

				{/* Excalidraw Editor */}
				<div style={{ height: `${editorHeight}px`, width: "100%" }}>
					<Excalidraw
						excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
							apiRef.current = api;
						}}
						initialData={() => {
							if (value && typeof value === "object" && "data" in value) {
								const sceneData = (
									value as {
										data?: { scene?: unknown };
									}
								).data?.scene;
								if (sceneData) {
									return sceneData as Record<string, unknown>;
								}
							}
							return null;
						}}
						onChange={(elements, appState, files) => {
							handleExcalidrawChange(elements, appState, files);
						}}
						UIOptions={{
							canvasActions: {
								toggleTheme: false,
								export: false,
								saveAsImage: false,
								clearCanvas: false,
								loadScene: false,
								saveToActiveFile: false,
							},
						}}
						viewModeEnabled={false}
						zenModeEnabled={false}
					>
						<style>
							{
								".excalidraw .App-toolbar, .excalidraw .App-toolbar-content, .excalidraw .layer-ui__wrapper, .excalidraw .help-icon, .excalidraw .zen-mode-transition.App-menu_bottom, .excalidraw .library-menu { display: none !important; }"
							}
						</style>
					</Excalidraw>
				</div>
			</div>
		);
	}

	// Preview mode
	return (
		<button
			aria-label="Click to edit sketch"
			className={cn(
				"group relative w-full overflow-hidden rounded-md border border-border bg-muted/50 transition-colors hover:bg-muted/70",
				"cursor-pointer text-left",
				className
			)}
			onClick={() => {
				setIsEditing(true);
			}}
			style={{ height: `${previewHeight}px` }}
			type="button"
		>
			{/* Edit overlay on hover */}
			<div className="absolute inset-0 z-40 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
				<Button
					className="opacity-0 transition-opacity group-hover:opacity-100"
					onClick={(e) => {
						e.stopPropagation();
						setIsEditing(true);
					}}
					size="sm"
					type="button"
					variant="secondary"
				>
					<Pencil className="mr-2 h-4 w-4" />
					Edit
				</Button>
			</div>

			{/* Preview content */}
			{previewSvg ? (
				<Image
					alt="Sketch preview"
					height={300}
					src={previewSvg}
					style={{
						height: "100%",
						width: "100%",
						objectFit: "contain",
						pointerEvents: "none",
					}}
					width={400}
				/>
			) : (
				<div className="flex h-full w-full items-center justify-center text-muted-foreground">
					<div className="text-center">
						<Pencil className="mx-auto mb-2 h-8 w-8 opacity-50" />
						<p className="text-sm">Click to add a sketch</p>
					</div>
				</div>
			)}
		</button>
	);
}

export function ExcalidrawPopoverEditor({
	value,
	onChange,
	className,
}: ExcalidrawPreviewEditorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [previewSvg] = useState<string | null>(null);
	const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
	const [mounted, setMounted] = useState(false);
	const rafRef = useRef<number | null>(null);
	const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(1);
	const [activeTool, setActiveTool] = useState<"freedraw" | "eraser">(
		"freedraw"
	);
	const [showStrokeSelector, setShowStrokeSelector] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const lastSceneRef = useRef<{
		elements: unknown;
		appState: unknown;
		files: unknown;
	} | null>(null);

	// (moved below generatePreviewSvg declaration)

	// Derive grid theme colors for background and stroke contrast
	const { bgCell, stroke } = React.useMemo(() => {
		try {
			const isDark =
				typeof document !== "undefined" &&
				document?.documentElement?.classList?.contains?.("dark") === true;
			const bg = resolveCssVarHex(
				"--gdg-bg-cell",
				isDark ? "#1a1a1a" : "#ffffff"
			);
			// Force a black/white stroke for maximum contrast, independent of theme tokens
			const black = "#000000";
			const white = "#ffffff";
			const best =
				contrastRatio(bg, black) >= contrastRatio(bg, white) ? black : white;
			return { bgCell: bg, stroke: best };
		} catch {
			return { bgCell: "#ffffff", stroke: "#111827" };
		}
	}, []);

	const generatePreviewSvg = useCallback(
		async (sceneData: unknown) => {
			try {
				const scene = sceneData as {
					data?: {
						scene?: {
							elements?: unknown[];
							appState?: unknown;
							files?: unknown;
						};
					};
				};
				const sceneObject = scene.data?.scene;
				if (!sceneObject) {
					return;
				}

				const maxW = 64;
				const maxH = 40;
				await exportElementsToSvgDataUrl({
					elements: (sceneObject.elements ||
						[]) as unknown as readonly unknown[],
					appState: (sceneObject.appState ||
						{}) as unknown as Partial<AppState>,
					files: (sceneObject.files || {}) as Record<string, unknown>,
					width: maxW,
					height: maxH,
					strokeColor: stroke as string,
				});
				// Preview generation disabled - update only on demand
			} catch {
				// SVG generation failed, continue without preview
			}
		},
		[stroke]
	);

	// Regenerate preview when the popover closes (isOpen -> false)
	React.useEffect(() => {
		if (!isOpen) {
			if (lastSceneRef.current) {
				const local = lastSceneRef.current;
				generatePreviewSvg({
					data: {
						scene: {
							elements: local.elements,
							appState: local.appState,
							files: local.files,
						},
					},
				}).catch(() => {
					// Silently ignore preview generation errors
				});
				return;
			}
			if (value && typeof value === "object" && "data" in value) {
				generatePreviewSvg(value).catch(() => {
					// Silently ignore preview generation errors
				});
			}
		}
	}, [isOpen, value, generatePreviewSvg]);

	React.useEffect(() => {
		setMounted(true);
		// Do not update preview while editor is open (prevents live updates)
		if (isOpen) {
			return;
		}
		if (value && typeof value === "object" && "data" in value) {
			generatePreviewSvg(value).catch(() => {
				// Error handled in generatePreviewSvg
			});
		}
	}, [value, generatePreviewSvg, isOpen]);

	const handleExcalidrawChange = useCallback(
		(elements: unknown, appState: unknown, files: unknown) => {
			// Coalesce rapid Excalidraw changes into a single update per frame to prevent infinite loops
			if (rafRef.current != null) {
				return;
			}
			rafRef.current = requestAnimationFrame(() => {
				lastSceneRef.current = { elements, appState, files };
				const updatedValue = {
					data: {
						scene: { elements, appState, files },
					},
				};
				onChange(updatedValue);
				rafRef.current = null;

				// Fit canvas to content after render with small delay
				const CONTENT_FIT_DELAY_MS = 16;
				setTimeout(() => {
					try {
						// Force Excalidraw to recalc canvas size
						window.dispatchEvent(new Event("resize"));
						// Canvas resizing handled by Excalidraw internally
					} catch {
						// Ignore individual attempt failures
					}
				}, CONTENT_FIT_DELAY_MS);
			});
		},
		[onChange]
	);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		// Preview will be regenerated by the effect that runs when isOpen becomes false
	}, []);

	// Fit canvas to content when popover opens
	React.useEffect(() => {
		if (!isOpen) {
			return;
		}

		// Run several resize + fit passes to account for layout stabilization
		const timers: number[] = [];

		for (const delay of FIT_TO_CONTENT_DELAYS_MS) {
			const id = setTimeout(() => {
				try {
					// Force Excalidraw to recalc canvas size
					window.dispatchEvent(new Event("resize"));
					// Canvas resizing handled by Excalidraw internally
				} catch {
					// Ignore individual attempt failures
				}
			}, delay) as unknown as number;
			timers.push(id);
		}

		return () => {
			for (const t of timers) {
				clearTimeout(t);
			}
		};
	}, [isOpen]);

	// Ensure canvas fills container on size changes while editor is open
	React.useEffect(() => {
		if (!isOpen) {
			return;
		}
		const node = containerRef.current as unknown as Element | null;
		if (!node) {
			return;
		}

		const t1: number | null = null;
		const t2: number | null = null;
		const fitToContent = () => {
			try {
				window.dispatchEvent(new Event("resize"));
			} catch {
				// Silently ignore errors
			}
			if (t1) {
				clearTimeout(t1);
			}
			if (t2) {
				clearTimeout(t2);
			}
			// Canvas resizing handled by Excalidraw internally
		};

		const ro = new ResizeObserver(() => fitToContent());
		try {
			ro.observe(node);
		} catch {
			// Silently ignore errors
		}

		return () => {
			try {
				ro.disconnect();
			} catch {
				// Silently ignore errors
			}
			if (t1) {
				clearTimeout(t1);
			}
			if (t2) {
				clearTimeout(t2);
			}
		};
	}, [isOpen]);

	if (!mounted) {
		return (
			<button
				className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
				disabled
				type="button"
			>
				Loading...
			</button>
		);
	}

	// Editor mode: render in popover
	return (
		<Popover
			onOpenChange={(open) => {
				setIsOpen(open);
			}}
			open={isOpen}
		>
			<PopoverTrigger asChild>
				<button
					className={cn(
						"h-44 w-full rounded-md border border-input px-2 py-1 text-left text-sm",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						"transition-colors hover:bg-accent hover:text-accent-foreground",
						"relative flex items-center overflow-hidden",
						previewSvg ? "bg-muted/30" : "bg-background",
						className
					)}
					type="button"
				>
					{previewSvg ? (
						<Image
							alt="Sketch preview"
							height={300}
							src={previewSvg}
							style={{
								height: "100%",
								width: "100%",
								objectFit: "contain",
								pointerEvents: "none",
							}}
							width={400}
						/>
					) : (
						<span className="text-muted-foreground text-xs">
							Click to add sketch
						</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="center"
				className="w-screen max-w-none p-4"
				side="top"
			>
				<div
					className="relative rounded-md border border-border"
					ref={containerRef}
					style={{
						width: "calc(100vw - 2rem)",
						height: 500,
						backgroundColor: bgCell,
					}}
				>
					{/* Close button */}
					<button
						aria-label="Close editor"
						className="absolute top-2 right-2 z-50 rounded-md p-2 transition-colors hover:bg-muted"
						onClick={handleClose}
						type="button"
					>
						<X className="h-5 w-5" />
					</button>

					{/* Excalidraw Editor */}
					<Excalidraw
						excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
							apiRef.current = api;
						}}
						initialData={() => {
							if (value && typeof value === "object" && "data" in value) {
								const sceneData = (
									value as {
										data?: { scene?: unknown };
									}
								).data?.scene;
								if (sceneData) {
									const appState: Partial<AppState> = {
										activeTool: {
											type: "freedraw",
											customType: null,
											lastActiveTool: null,
											locked: false,
										},
										frameRendering: {
											enabled: false,
											name: false,
											outline: false,
											clip: false,
										},
										viewModeEnabled: false,
										zenModeEnabled: false,
										currentItemStrokeColor: stroke,
										viewBackgroundColor: bgCell,
									};
									return {
										...(sceneData as Record<string, unknown>),
										appState: {
											...((sceneData as { appState?: unknown }).appState || {}),
											...appState,
										},
									};
								}
							}
							// Fallback: return minimal valid state even without value
							return {
								elements: [],
								appState: {
									activeTool: {
										type: "freedraw",
										customType: null,
										lastActiveTool: null,
										locked: false,
									},
									frameRendering: {
										enabled: false,
										name: false,
										outline: false,
										clip: false,
									},
									viewModeEnabled: false,
									zenModeEnabled: false,
									currentItemStrokeColor: stroke,
									viewBackgroundColor: bgCell,
								} as Partial<AppState>,
								files: {},
							};
						}}
						onChange={(elements, appState, files) => {
							handleExcalidrawChange(elements, appState, files);
						}}
						UIOptions={{
							canvasActions: {
								toggleTheme: false,
								export: false,
								saveAsImage: false,
								clearCanvas: false,
								loadScene: false,
								saveToActiveFile: false,
							},
						}}
						viewModeEnabled={false}
						zenModeEnabled={false}
					>
						<style>
							{`.excalidraw .help-icon, .excalidraw .zen-mode-transition.App-menu_bottom, .excalidraw .library-menu, .excalidraw .mobile-misc-tools-container { display: none !important; }
                        .excalidraw, .excalidraw .layer-ui__wrapper__top, .excalidraw .layer-ui__wrapper__footer { background: ${bgCell} !important; }
                        .excalidraw .HintViewer { display: none !important; }
                        .excalidraw .App-toolbar, .excalidraw .App-toolbar-content { display: flex !important; }`}
						</style>

						{/* Mini toolbar: pen and eraser - HIDDEN, using full toolbar instead */}
						<div
							style={{
								display: "none",
							}}
						>
							{/* Stroke width selector */}
							{showStrokeSelector && (
								<div
									style={{
										position: "absolute",
										right: 28,
										top: 0,
										display: "flex",
										flexDirection: "row",
										gap: 4,
										animation: "slideInLeft 0.15s ease-out",
									}}
								>
									<style>
										{`@keyframes slideInLeft {
									from {
										opacity: 0;
										transform: translateX(8px);
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
													(api as ExcalidrawImperativeAPIExtended).updateScene({
														appState: { currentItemStrokeWidth: 1 },
													});
													setCurrentStrokeWidth(1);
													setShowStrokeSelector(false);
												}
											} catch {
												// Silently ignore errors
											}
										}}
										style={{
											width: 20,
											height: 20,
											borderRadius: 4,
											border: `1px solid ${stroke}`,
											backgroundColor:
												currentStrokeWidth === 1
													? `${stroke}25`
													: "transparent",
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
											padding: 0,
											cursor: "pointer",
											color: stroke,
											transition: "background-color 0.15s ease",
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
													(api as ExcalidrawImperativeAPIExtended).updateScene({
														appState: { currentItemStrokeWidth: 2 },
													});
													setCurrentStrokeWidth(2);
													setShowStrokeSelector(false);
												}
											} catch {
												// Silently ignore errors
											}
										}}
										style={{
											width: 20,
											height: 20,
											borderRadius: 4,
											border: `1px solid ${stroke}`,
											backgroundColor:
												currentStrokeWidth === 2
													? `${stroke}25`
													: "transparent",
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
											padding: 0,
											cursor: "pointer",
											color: stroke,
											transition: "background-color 0.15s ease",
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
													(api as ExcalidrawImperativeAPIExtended).updateScene({
														appState: {
															currentItemStrokeWidth: STROKE_WIDTH_DEFAULT,
														},
													});
													setCurrentStrokeWidth(STROKE_WIDTH_DEFAULT);
													setShowStrokeSelector(false);
												}
											} catch {
												// Silently ignore errors
											}
										}}
										style={{
											width: 20,
											height: 20,
											borderRadius: 4,
											border: `1px solid ${stroke}`,
											backgroundColor:
												currentStrokeWidth === STROKE_WIDTH_DEFAULT
													? `${stroke}25`
													: "transparent",
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
											padding: 0,
											cursor: "pointer",
											color: stroke,
											transition: "background-color 0.15s ease",
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
										// Silently ignore errors
									}
								}}
								onMouseEnter={(e) => {
									if (activeTool !== "freedraw") {
										e.currentTarget.style.backgroundColor = `${stroke}15`;
									}
								}}
								onMouseLeave={(e) => {
									if (activeTool !== "freedraw") {
										e.currentTarget.style.backgroundColor = "transparent";
									}
								}}
								style={{
									width: 20,
									height: 20,
									borderRadius: 4,
									border: `1px solid ${stroke}`,
									backgroundColor:
										activeTool === "freedraw" ? `${stroke}25` : "transparent",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									padding: 0,
									cursor: "pointer",
									color: stroke,
									transition: "background-color 0.15s ease",
								}}
								title="Pen Tool"
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
											setShowStrokeSelector(false);
										}
									} catch {
										// Silently ignore errors
									}
								}}
								onMouseEnter={(e) => {
									if (activeTool !== "eraser") {
										e.currentTarget.style.backgroundColor = `${stroke}15`;
									}
								}}
								onMouseLeave={(e) => {
									if (activeTool !== "eraser") {
										e.currentTarget.style.backgroundColor = "transparent";
									}
								}}
								style={{
									width: 20,
									height: 20,
									borderRadius: 4,
									border: `1px solid ${stroke}`,
									backgroundColor:
										activeTool === "eraser" ? `${stroke}25` : "transparent",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									padding: 0,
									cursor: "pointer",
									color: stroke,
									transition: "background-color 0.15s ease",
								}}
								title="Eraser Tool"
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
					</Excalidraw>

					{/* Mini toolbar: pen and eraser - HIDDEN, using full toolbar instead */}
					<div
						style={{
							display: "none",
						}}
					>
						{/* Stroke width selector */}
						{showStrokeSelector && (
							<div
								style={{
									position: "absolute",
									right: 28,
									top: 0,
									display: "flex",
									flexDirection: "row",
									gap: 4,
									animation: "slideInLeft 0.15s ease-out",
								}}
							>
								<style>
									{`@keyframes slideInLeft {
									from {
										opacity: 0;
										transform: translateX(8px);
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
												(api as ExcalidrawImperativeAPIExtended).updateScene({
													appState: { currentItemStrokeWidth: 1 },
												});
												setCurrentStrokeWidth(1);
												setShowStrokeSelector(false);
											}
										} catch {
											// Silently ignore errors
										}
									}}
									style={{
										width: 20,
										height: 20,
										borderRadius: 4,
										border: `1px solid ${stroke}`,
										backgroundColor:
											currentStrokeWidth === 1 ? `${stroke}25` : "transparent",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										padding: 0,
										cursor: "pointer",
										color: stroke,
										transition: "background-color 0.15s ease",
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
												(api as ExcalidrawImperativeAPIExtended).updateScene({
													appState: { currentItemStrokeWidth: 2 },
												});
												setCurrentStrokeWidth(2);
												setShowStrokeSelector(false);
											}
										} catch {
											// Silently ignore errors
										}
									}}
									style={{
										width: 20,
										height: 20,
										borderRadius: 4,
										border: `1px solid ${stroke}`,
										backgroundColor:
											currentStrokeWidth === 2 ? `${stroke}25` : "transparent",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										padding: 0,
										cursor: "pointer",
										color: stroke,
										transition: "background-color 0.15s ease",
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
												(api as ExcalidrawImperativeAPIExtended).updateScene({
													appState: {
														currentItemStrokeWidth: STROKE_WIDTH_DEFAULT,
													},
												});
												setCurrentStrokeWidth(STROKE_WIDTH_DEFAULT);
												setShowStrokeSelector(false);
											}
										} catch {
											// Silently ignore errors
										}
									}}
									style={{
										width: 20,
										height: 20,
										borderRadius: 4,
										border: `1px solid ${stroke}`,
										backgroundColor:
											currentStrokeWidth === STROKE_WIDTH_DEFAULT
												? `${stroke}25`
												: "transparent",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										padding: 0,
										cursor: "pointer",
										color: stroke,
										transition: "background-color 0.15s ease",
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
									// Silently ignore errors
								}
							}}
							onMouseEnter={(e) => {
								if (activeTool !== "freedraw") {
									e.currentTarget.style.backgroundColor = `${stroke}15`;
								}
							}}
							onMouseLeave={(e) => {
								if (activeTool !== "freedraw") {
									e.currentTarget.style.backgroundColor = "transparent";
								}
							}}
							style={{
								width: 20,
								height: 20,
								borderRadius: 4,
								border: `1px solid ${stroke}`,
								backgroundColor:
									activeTool === "freedraw" ? `${stroke}25` : "transparent",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								padding: 0,
								cursor: "pointer",
								color: stroke,
								transition: "background-color 0.15s ease",
							}}
							title="Pen Tool"
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
										setShowStrokeSelector(false);
									}
								} catch {
									// Silently ignore errors
								}
							}}
							onMouseEnter={(e) => {
								if (activeTool !== "eraser") {
									e.currentTarget.style.backgroundColor = `${stroke}15`;
								}
							}}
							onMouseLeave={(e) => {
								if (activeTool !== "eraser") {
									e.currentTarget.style.backgroundColor = "transparent";
								}
							}}
							style={{
								width: 20,
								height: 20,
								borderRadius: 4,
								border: `1px solid ${stroke}`,
								backgroundColor:
									activeTool === "eraser" ? `${stroke}25` : "transparent",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								padding: 0,
								cursor: "pointer",
								color: stroke,
								transition: "background-color 0.15s ease",
							}}
							title="Eraser Tool"
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
				</div>
			</PopoverContent>
		</Popover>
	);
}
