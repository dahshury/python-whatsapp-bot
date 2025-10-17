import {
	CONTRAST_RATIO_OFFSET,
	HEX_COLOR_REGEX,
	HSL_PARTS_COUNT,
	HSL_PERCENT_DIVISOR,
	HSL_START_INDEX,
	HUE_DEGREE_SEGMENT,
	HUE_FIFTH_SEGMENT,
	HUE_FOURTH_SEGMENT,
	HUE_SECOND_HALF,
	HUE_THIRD_SEGMENT,
	LINEAR_RGB_EXPONENT,
	LINEAR_RGB_LOWER,
	LINEAR_RGB_OFFSET,
	LINEAR_RGB_THRESHOLD,
	LINEAR_RGB_UPPER_FACTOR,
	RELATIVE_LUMINANCE_B_COEFF,
	RELATIVE_LUMINANCE_G_COEFF,
	RELATIVE_LUMINANCE_R_COEFF,
	RGB_HEX_DIVISOR,
	RGB_MAX_VALUE,
} from "../../constants/excalidraw-constants";

export type RGB = { r: number; g: number; b: number };

// Helper function to get RGB values from hex color
export function hexToRgb(hex: string): RGB | null {
	try {
		const m = HEX_COLOR_REGEX.exec(hex);
		if (!m) {
			return null;
		}
		const rr = m[1] ?? "00";
		const gg = m[2] ?? "00";
		const bb = m[3] ?? "00";
		return {
			r: Number.parseInt(rr, RGB_HEX_DIVISOR),
			g: Number.parseInt(gg, RGB_HEX_DIVISOR),
			b: Number.parseInt(bb, RGB_HEX_DIVISOR),
		};
	} catch {
		// Failed to parse hex color
		return null;
	}
}

// Helper function to calculate relative luminance using WCAG formula
export function calculateRelativeLuminance(hex: string): number {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return 0;
	}

	const toLinear = (value: number): number => {
		const normalized = value / RGB_MAX_VALUE;
		return normalized <= LINEAR_RGB_THRESHOLD
			? normalized * LINEAR_RGB_LOWER
			: ((normalized + LINEAR_RGB_OFFSET) / LINEAR_RGB_UPPER_FACTOR) **
					LINEAR_RGB_EXPONENT;
	};

	const R = toLinear(rgb.r);
	const G = toLinear(rgb.g);
	const B = toLinear(rgb.b);

	return (
		RELATIVE_LUMINANCE_R_COEFF * R +
		RELATIVE_LUMINANCE_G_COEFF * G +
		RELATIVE_LUMINANCE_B_COEFF * B
	);
}

// Helper function to calculate WCAG contrast ratio
export function calculateContrastRatio(color1: string, color2: string): number {
	const L1 = calculateRelativeLuminance(color1);
	const L2 = calculateRelativeLuminance(color2);
	const light = Math.max(L1, L2);
	const dark = Math.min(L1, L2);
	return (light + CONTRAST_RATIO_OFFSET) / (dark + CONTRAST_RATIO_OFFSET);
}

// Helper function to get RGB components from hue
function getRgbComponentsFromHue(
	h: number,
	c: number,
	x: number
): [number, number, number] {
	if (h < HUE_DEGREE_SEGMENT) {
		return [c, x, 0];
	}
	if (h < HUE_THIRD_SEGMENT) {
		return [x, c, 0];
	}
	if (h < HUE_SECOND_HALF) {
		return [0, c, x];
	}
	if (h < HUE_FOURTH_SEGMENT) {
		return [0, x, c];
	}
	if (h < HUE_FIFTH_SEGMENT) {
		return [x, 0, c];
	}
	return [c, 0, x];
}

// Helper function to convert HSL string to hex color
export function hslToHex(hslValue: string): string | null {
	try {
		const hsl = hslValue.startsWith("hsl(")
			? hslValue.slice(HSL_START_INDEX, -1)
			: hslValue;
		const parts = hsl.split(" ");

		if (parts.length !== HSL_PARTS_COUNT) {
			return null;
		}

		const h = Number.parseFloat(parts[0] ?? "0");
		const s = Number.parseFloat(parts[1] ?? "0");
		const l = Number.parseFloat(parts[2] ?? "0");

		if (!(Number.isFinite(h) && Number.isFinite(s) && Number.isFinite(l))) {
			return null;
		}

		const S = s / HSL_PERCENT_DIVISOR;
		const L = l / HSL_PERCENT_DIVISOR;
		const c = (1 - Math.abs(2 * L - 1)) * S;
		const x = c * (1 - Math.abs(((h / HUE_DEGREE_SEGMENT) % 2) - 1));
		const m = L - c / 2;

		const [r, g, b] = getRgbComponentsFromHue(h, c, x);

		const toHexComponent = (n: number): string => {
			const v255 = Math.round((n + m) * RGB_MAX_VALUE);
			const hex = v255.toString(RGB_HEX_DIVISOR);
			return hex.length === 1 ? `0${hex}` : hex;
		};

		return `#${toHexComponent(r)}${toHexComponent(g)}${toHexComponent(b)}`;
	} catch {
		// Failed to convert HSL to hex
		return null;
	}
}

// Helper function to resolve CSS variable to hex color
export function resolveCssVariableToHex(
	varName: string,
	fallback: string
): string {
	try {
		if (typeof window === "undefined" || typeof document === "undefined") {
			return fallback;
		}

		const cs = getComputedStyle(document.documentElement);
		const value = cs.getPropertyValue(varName).trim();

		if (!value) {
			return fallback;
		}

		if (value.startsWith("#")) {
			return value;
		}

		const hexValue = hslToHex(value);
		return hexValue ?? fallback;
	} catch {
		// Failed to resolve CSS variable
		return fallback;
	}
}
