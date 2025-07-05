export class PhoneInputService {
	private static readonly DEBOUNCE_DELAY = 50;
	private static readonly COUNTRY_CHANGE_DELAY = 0;

	static getDebounceDelay(): number {
		return PhoneInputService.DEBOUNCE_DELAY;
	}

	static getCountryChangeDelay(): number {
		return PhoneInputService.COUNTRY_CHANGE_DELAY;
	}

	static getPopoverAnimationConfig() {
		return {
			duration: 200,
			easing: "cubic-bezier(0.16, 1, 0.3, 1)",
			willChange: "transform, opacity",
		};
	}

	static getCommandPaletteConfig() {
		return {
			maxHeight: 300,
			scrollBehavior: "smooth" as const,
			overscrollBehavior: "contain" as const,
		};
	}

	static getEditorStyles(_isDarkTheme: boolean) {
		return {
			wrapperClassName: "phone-input-wrapper",
			innerClassName: "phone-input-inner",
		};
	}

	static getPerformanceConfig() {
		return {
			useRequestAnimationFrame: true,
			enableDebouncing: true,
			memoizeComponents: true,
			optimizeDOMQueries: true,
		};
	}
}
