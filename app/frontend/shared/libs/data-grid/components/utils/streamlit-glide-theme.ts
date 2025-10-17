import type { Theme } from "@glideapps/glide-data-grid";

// transparentize was previously used; retained import removed after switching to hexToRgba

// HSL color conversion constants
const HSL_PARTS_COUNT = 3;
const SATURATION_DIVIDER = 100;
const HUE_MAX = 60;
const HUE_MID_1 = 120;
const HUE_MID_2 = 180;
const HUE_MID_3 = 240;
const HUE_MID_4 = 300;
const RGB_MAX = 255;
const HEX_RADIX = 16;
const ALPHA_DEFAULT = 0.2;
const HEX_COLOR_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

/**
 * Gets computed CSS variable value from document
 */
function getCSSVariable(varName: string): string {
	// Check if we're in a browser environment
	if (typeof window === "undefined" || typeof document === "undefined") {
		return "";
	}
	const computed = getComputedStyle(document.documentElement);
	return computed.getPropertyValue(varName).trim();
}

/**
 * Determine RGB values based on hue angle (0-360)
 */
function getRGBFromHue(
	h: number,
	c: number,
	x: number
): [number, number, number] {
	if (h < HUE_MAX) {
		return [c, x, 0];
	}
	if (h < HUE_MID_1) {
		return [x, c, 0];
	}
	if (h < HUE_MID_2) {
		return [0, c, x];
	}
	if (h < HUE_MID_3) {
		return [0, x, c];
	}
	if (h < HUE_MID_4) {
		return [x, 0, c];
	}
	return [c, 0, x];
}

/**
 * Converts HSL CSS variable to hex color
 */
function hslToHex(hslVar: string, fallbackColor = "#000000"): string {
	const hslValue = getCSSVariable(hslVar);
	if (!hslValue) {
		return fallbackColor;
	}

	// Parse HSL values (format: "210 40% 98%")
	const parts = hslValue.split(" ");
	if (parts.length !== HSL_PARTS_COUNT) {
		return fallbackColor;
	}

	const h = parts[0] ? Number.parseFloat(parts[0]) : Number.NaN;
	const s = parts[1]
		? Number.parseFloat(parts[1]) / SATURATION_DIVIDER
		: Number.NaN;
	const l = parts[2]
		? Number.parseFloat(parts[2]) / SATURATION_DIVIDER
		: Number.NaN;

	if (!(Number.isFinite(h) && Number.isFinite(s) && Number.isFinite(l))) {
		return fallbackColor;
	}

	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / HUE_MAX) % 2) - 1));
	const m = l - c / 2;

	const [r, g, b] = getRGBFromHue(h, c, x);

	const toHex = (n: number) => {
		const v = Math.round((n + m) * RGB_MAX);
		if (!Number.isFinite(v)) {
			return "00";
		}
		const hex = v.toString(HEX_RADIX);
		return hex.length === 1 ? `0${hex}` : hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Default colors for SSR
const defaultColors = {
	light: {
		background: "#ffffff",
		foreground: "#0a0a0a",
		card: "#ffffff",
		cardForeground: "#0a0a0a",
		primary: "#171717",
		primaryForeground: "#fafafa",
		secondary: "#f5f5f5",
		secondaryForeground: "#171717",
		accent: "#f5f5f5",
		accentForeground: "#171717",
		muted: "#f5f5f5",
		mutedForeground: "#737373",
		border: "#e5e5e5",
		popover: "#ffffff",
		popoverForeground: "#0a0a0a",
	},
	dark: {
		background: "#0a0a0a",
		foreground: "#fafafa",
		card: "#0a0a0a",
		cardForeground: "#fafafa",
		primary: "#fafafa",
		primaryForeground: "#171717",
		secondary: "#262626",
		secondaryForeground: "#fafafa",
		accent: "#262626",
		accentForeground: "#fafafa",
		muted: "#262626",
		mutedForeground: "#a3a3a3",
		border: "#262626",
		popover: "#0a0a0a",
		popoverForeground: "#fafafa",
	},
};

/**
 * Converts shadcn color tokens into a Glide-Data-Grid Theme.
 * Now reads from CSS variables to adapt to the current theme.
 */
export function createGlideTheme(mode: "light" | "dark"): Partial<Theme> {
	// Use default colors if we're on the server
	const isServer = typeof window === "undefined";
	const defaults = defaultColors[mode];

	// Read current theme colors from CSS variables
	const foreground = isServer
		? defaults.foreground
		: hslToHex("--foreground", defaults.foreground);
	const card = isServer ? defaults.card : hslToHex("--card", defaults.card);
	const primary = isServer
		? defaults.primary
		: hslToHex("--primary", defaults.primary);
	const primaryForeground = isServer
		? defaults.primaryForeground
		: hslToHex("--primary-foreground", defaults.primaryForeground);
	const accent = isServer
		? defaults.accent
		: hslToHex("--accent", defaults.accent);
	const muted = isServer ? defaults.muted : hslToHex("--muted", defaults.muted);
	const mutedForeground = isServer
		? defaults.mutedForeground
		: hslToHex("--muted-foreground", defaults.mutedForeground);
	const border = isServer
		? defaults.border
		: hslToHex("--border", defaults.border);
	const popover = isServer
		? defaults.popover
		: hslToHex("--popover", defaults.popover);
	const popoverForeground = isServer
		? defaults.popoverForeground
		: hslToHex("--popover-foreground", defaults.popoverForeground);

	// Helper to safely convert a hex like #rrggbb to rgba(r,g,b,a)
	const hexToRgba = (hex: string, alpha: number): string => {
		try {
			const m = HEX_COLOR_REGEX.exec(hex);
			if (!(m?.[1] && m[2] && m[3])) {
				return `rgba(0,0,0,${alpha})`;
			}
			const r = Number.parseInt(m[1], HEX_RADIX);
			const g = Number.parseInt(m[2], HEX_RADIX);
			const b = Number.parseInt(m[3], HEX_RADIX);
			const a = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 0;
			return `rgba(${r}, ${g}, ${b}, ${a})`;
		} catch {
			return `rgba(0,0,0,${alpha})`;
		}
	};

	// Prefer robust rgba from hex over color2k when possible
	const safeAccentLight = hexToRgba(primary, ALPHA_DEFAULT);
	const safeBgSearch = hexToRgba(primary, ALPHA_DEFAULT);

	return {
		// Accent colors
		accentColor: primary,
		accentFg: primaryForeground,
		accentLight: safeAccentLight,

		// Text colors
		textDark: foreground,
		textMedium: mutedForeground,
		textLight: mutedForeground,
		textBubble: popoverForeground,
		textHeader: foreground,
		textGroupHeader: mutedForeground, // Using muted for group headers
		textHeaderSelected: primary,

		// Icon colors
		bgIconHeader: muted,
		fgIconHeader: mutedForeground,

		// Cell backgrounds
		bgCell: card,
		bgCellMedium: muted,

		// Header backgrounds - using muted for better distinction
		bgHeader: muted,
		bgHeaderHasFocus: accent,
		bgHeaderHovered: accent,

		// Bubble backgrounds
		bgBubble: popover,
		bgBubbleSelected: primary,

		// Search result background
		bgSearchResult: safeBgSearch,

		// Border colors
		borderColor: border,
		horizontalBorderColor: border, // Using same as vertical for consistency
		drilldownBorder: primary,

		// Link color
		linkColor: primary,

		// Padding
		cellHorizontalPadding: 8,
		cellVerticalPadding: 3,

		// Typography
		headerIconSize: 18,
		fontFamily: isServer
			? "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
			: getCSSVariable("--font-sans") ||
				"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
		baseFontStyle: "13px",
		headerFontStyle: "600 13px",
		editorFontSize: "13px",
		lineHeight: 1.4,
	};
}
