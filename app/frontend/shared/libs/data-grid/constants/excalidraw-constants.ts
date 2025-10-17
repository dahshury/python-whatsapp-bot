// SVG export constants
export const SVG_TOLERANCE_THRESHOLD = 0.5;
export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// Color conversion constants
export const HSL_PERCENT_DIVISOR = 100;
export const HSL_PARTS_COUNT = 3;
export const HUE_DEGREE_SEGMENT = 60;
export const HUE_SECOND_HALF = 180;
export const HUE_THIRD_SEGMENT = 120;
export const HUE_FOURTH_SEGMENT = 240;
export const HUE_FIFTH_SEGMENT = 300;

// RGB conversion constants
export const RGB_MAX_VALUE = 255;
export const RGB_HEX_DIVISOR = 16;
export const LINEAR_RGB_DIVISOR = 12.92;
export const CONTRAST_RATIO_OFFSET = 0.05;
export const LINEAR_RGB_THRESHOLD = 0.039_28;
export const LINEAR_RGB_LOWER = 1 / LINEAR_RGB_DIVISOR;
export const LINEAR_RGB_UPPER_FACTOR = 1.055;
export const LINEAR_RGB_OFFSET = 0.055;
export const LINEAR_RGB_EXPONENT = 2.4;
export const RELATIVE_LUMINANCE_R_COEFF = 0.2126;
export const RELATIVE_LUMINANCE_G_COEFF = 0.7152;
export const RELATIVE_LUMINANCE_B_COEFF = 0.0722;

// HSL parsing constants
export const HSL_START_INDEX = 4;
export const HEX_COLOR_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

// SVG preview dimensions
export const PREVIEW_MIN_WIDTH = 64;
export const PREVIEW_DEFAULT_WIDTH = 120;
export const PREVIEW_MAX_WIDTH = 240;
export const PREVIEW_MIN_HEIGHT = 40;
export const PREVIEW_DEFAULT_HEIGHT = 60;
export const PREVIEW_MAX_HEIGHT = 180;

// Stroke width constants
export const STROKE_WIDTH_THIN = 1;
export const STROKE_WIDTH_BOLD = 2;
export const STROKE_WIDTH_EXTRA_BOLD = 4;

// Excalidraw UI options - minimal hidden UI for cell editor
export const EXCALIDRAW_HIDDEN_UI_OPTIONS = {
	canvasActions: {
		toggleTheme: false,
		export: false,
		saveAsImage: false,
		clearCanvas: false,
		loadScene: false,
		saveToActiveFile: false,
	},
} as const;
