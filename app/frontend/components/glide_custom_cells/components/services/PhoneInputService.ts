// Configuration constants
const DEBOUNCE_DELAY = 50;
const COUNTRY_CHANGE_DELAY = 0;

/**
 * Get the debounce delay for phone input
 */
export function getDebounceDelay(): number {
	return DEBOUNCE_DELAY;
}

/**
 * Get the country change delay for phone input
 */
export function getCountryChangeDelay(): number {
	return COUNTRY_CHANGE_DELAY;
}

/**
 * Get the popover animation configuration
 */
export function getPopoverAnimationConfig() {
	return {
		duration: 200,
		easing: "cubic-bezier(0.16, 1, 0.3, 1)",
		willChange: "transform, opacity",
	};
}

/**
 * Get the command palette configuration
 */
export function getCommandPaletteConfig() {
	return {
		maxHeight: 300,
		scrollBehavior: "smooth" as const,
		overscrollBehavior: "contain" as const,
	};
}

/**
 * Get the editor styles for phone input
 */
export function getEditorStyles(_isDarkTheme: boolean) {
	return {
		wrapperClassName: "phone-input-wrapper",
		innerClassName: "phone-input-inner",
	};
}

/**
 * Get the performance configuration for phone input
 */
export function getPerformanceConfig() {
	return {
		useRequestAnimationFrame: true,
		enableDebouncing: true,
		memoizeComponents: true,
		optimizeDOMQueries: true,
	};
}

export const PhoneInputService = {
	getDebounceDelay,
	getCountryChangeDelay,
	getPopoverAnimationConfig,
	getCommandPaletteConfig,
	getEditorStyles,
	getPerformanceConfig,
};
