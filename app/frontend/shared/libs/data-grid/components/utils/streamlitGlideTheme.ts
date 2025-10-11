import type { Theme } from "@glideapps/glide-data-grid";

// transparentize was previously used; retained import removed after switching to hexToRgba

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
 * Converts HSL CSS variable to hex color
 */
function hslToHex(hslVar: string, fallbackColor = "#000000"): string {
	const hslValue = getCSSVariable(hslVar);
	if (!hslValue) return fallbackColor;

	// Parse HSL values (format: "210 40% 98%")
	const parts = hslValue.split(" ");
	if (parts.length !== 3) return fallbackColor;

	const h = parts[0] ? Number.parseFloat(parts[0]) : Number.NaN;
	const s = parts[1] ? Number.parseFloat(parts[1]) / 100 : Number.NaN;
	const l = parts[2] ? Number.parseFloat(parts[2]) / 100 : Number.NaN;

	if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) {
		return fallbackColor;
	}

	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;

	let r = 0;
	let g = 0;
	let b = 0;

	if (0 <= h && h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (60 <= h && h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (120 <= h && h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (180 <= h && h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (240 <= h && h < 300) {
		r = x;
		g = 0;
		b = c;
	} else if (300 <= h && h < 360) {
		r = c;
		g = 0;
		b = x;
	}

	const toHex = (n: number) => {
		const v = Math.round((n + m) * 255);
		if (!Number.isFinite(v)) return "00";
		const hex = v.toString(16);
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
	const foreground = isServer ? defaults.foreground : hslToHex("--foreground", defaults.foreground);
	const card = isServer ? defaults.card : hslToHex("--card", defaults.card);
	const primary = isServer ? defaults.primary : hslToHex("--primary", defaults.primary);
	const primaryForeground = isServer
		? defaults.primaryForeground
		: hslToHex("--primary-foreground", defaults.primaryForeground);
	const accent = isServer ? defaults.accent : hslToHex("--accent", defaults.accent);
	const muted = isServer ? defaults.muted : hslToHex("--muted", defaults.muted);
	const mutedForeground = isServer
		? defaults.mutedForeground
		: hslToHex("--muted-foreground", defaults.mutedForeground);
	const border = isServer ? defaults.border : hslToHex("--border", defaults.border);
	const popover = isServer ? defaults.popover : hslToHex("--popover", defaults.popover);
	const popoverForeground = isServer
		? defaults.popoverForeground
		: hslToHex("--popover-foreground", defaults.popoverForeground);

	// Helper to safely convert a hex like #rrggbb to rgba(r,g,b,a)
	const hexToRgba = (hex: string, alpha: number): string => {
		try {
			const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			if (!m || !m[1] || !m[2] || !m[3]) return `rgba(0,0,0,${alpha})`;
			const r = Number.parseInt(m[1], 16);
			const g = Number.parseInt(m[2], 16);
			const b = Number.parseInt(m[3], 16);
			const a = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 0;
			return `rgba(${r}, ${g}, ${b}, ${a})`;
		} catch {
			return `rgba(0,0,0,${alpha})`;
		}
	};

	// Prefer robust rgba from hex over color2k when possible
	const safeAccentLight = hexToRgba(primary, 0.2);
	const safeBgSearch = hexToRgba(primary, 0.2);

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
