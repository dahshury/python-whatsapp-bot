import type { Theme } from "@glideapps/glide-data-grid";

const HSL_COMPONENT_COUNT = 3;
const PERCENT_DENOMINATOR = 100;
const HUE_SEGMENT_DEGREES = 60;
const HUE_SEGMENT_COUNT = 6;
const RGB_MAX_VALUE = 255;
const HEX_RADIX = 16;
const HEX_DIGITS_PER_CHANNEL = 2;
const DEFAULT_ACCENT_ALPHA = 0.2;
const MIN_ALPHA = 0;
const MAX_ALPHA = 1;
const RGBA_FALLBACK_CHANNEL = 0;
const HEX_COLOR_PATTERN = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const HUE_SEGMENTS = {
  RED_GREEN: 0,
  GREEN_YELLOW: 1,
  YELLOW_CYAN: 2,
  CYAN_BLUE: 3,
  BLUE_MAGENTA: 4,
  MAGENTA_RED: 5,
} as const;

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
  if (!hslValue) {
    return fallbackColor;
  }

  // Parse HSL values (format: "210 40% 98%")
  const parts = hslValue.split(" ");
  if (parts.length !== HSL_COMPONENT_COUNT) {
    return fallbackColor;
  }

  const hue = parts[0] ? Number.parseFloat(parts[0]) : Number.NaN;
  const saturation = parts[1]
    ? Number.parseFloat(parts[1]) / PERCENT_DENOMINATOR
    : Number.NaN;
  const lightness = parts[2]
    ? Number.parseFloat(parts[2]) / PERCENT_DENOMINATOR
    : Number.NaN;

  if (
    !(
      Number.isFinite(hue) &&
      Number.isFinite(saturation) &&
      Number.isFinite(lightness)
    )
  ) {
    return fallbackColor;
  }

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const intermediate =
    chroma * (1 - Math.abs(((hue / HUE_SEGMENT_DEGREES) % 2) - 1));
  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  const hueSegment = Math.floor(hue / HUE_SEGMENT_DEGREES) % HUE_SEGMENT_COUNT;

  switch (hueSegment) {
    case HUE_SEGMENTS.RED_GREEN:
      red = chroma;
      green = intermediate;
      break;
    case HUE_SEGMENTS.GREEN_YELLOW:
      red = intermediate;
      green = chroma;
      break;
    case HUE_SEGMENTS.YELLOW_CYAN:
      green = chroma;
      blue = intermediate;
      break;
    case HUE_SEGMENTS.CYAN_BLUE:
      green = intermediate;
      blue = chroma;
      break;
    case HUE_SEGMENTS.BLUE_MAGENTA:
      red = intermediate;
      blue = chroma;
      break;
    case HUE_SEGMENTS.MAGENTA_RED:
      red = chroma;
      blue = intermediate;
      break;
    default:
      break;
  }

  const toHex = (value: number) => {
    const channel = Math.round((value + match) * RGB_MAX_VALUE);
    if (!Number.isFinite(channel)) {
      return "00";
    }
    return channel.toString(HEX_RADIX).padStart(HEX_DIGITS_PER_CHANNEL, "0");
  };

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
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
    const clampAlpha = (value: number) =>
      Number.isFinite(value)
        ? Math.max(MIN_ALPHA, Math.min(MAX_ALPHA, value))
        : MIN_ALPHA;
    const fallback = (value: number) =>
      `rgba(${RGBA_FALLBACK_CHANNEL},${RGBA_FALLBACK_CHANNEL},${RGBA_FALLBACK_CHANNEL},${value})`;
    const normalizedAlpha = clampAlpha(alpha);
    try {
      const match = HEX_COLOR_PATTERN.exec(hex);
      if (!(match?.[1] && match[2] && match[3])) {
        return fallback(normalizedAlpha);
      }
      const r = Number.parseInt(match[1], HEX_RADIX);
      const g = Number.parseInt(match[2], HEX_RADIX);
      const b = Number.parseInt(match[3], HEX_RADIX);
      return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
    } catch {
      return fallback(normalizedAlpha);
    }
  };

  // Prefer robust rgba from hex over color2k when possible
  const safeAccentLight = hexToRgba(primary, DEFAULT_ACCENT_ALPHA);
  const safeBgSearch = hexToRgba(primary, DEFAULT_ACCENT_ALPHA);

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
