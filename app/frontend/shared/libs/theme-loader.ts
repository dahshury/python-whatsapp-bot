/**
 * Dynamic Theme Loader
 * Loads theme CSS files on demand when a theme is selected
 *
 * Note: Theme CSS files are served from the public folder or bundled CSS
 * In Next.js, we need to reference them correctly based on how they're built
 */

import {
	isSupportedThemeName,
	THEME_NAMES,
	type ThemeName,
} from '@/shared/constants/theme-names'

const loadedThemes = new Set<string>()
const loadingThemes = new Map<string, Promise<void>>()
const THEME_LINK_ID_PREFIX = 'theme-loader-link-'
const THEME_BASE_PATH = '/themes'
const THEME_STYLESHEET_VERSION =
	typeof process !== 'undefined'
		? (process.env.NEXT_PUBLIC_THEME_MANIFEST_VERSION ?? '')
		: ''

const THEME_FILES: Record<ThemeName, string> = THEME_NAMES.reduce(
	(acc, themeName) => {
		const versionSuffix = THEME_STYLESHEET_VERSION
			? `?v=${encodeURIComponent(THEME_STYLESHEET_VERSION)}`
			: ''
		acc[themeName] = `${THEME_BASE_PATH}/${themeName}.css${versionSuffix}`
		return acc
	},
	{} as Record<ThemeName, string>
)

const isKnownTheme = (themeName: string): themeName is ThemeName =>
	isSupportedThemeName(themeName)

/**
 * Loads a theme CSS file dynamically by attaching a scoped <link> element.
 * Stylesheets are streamed from the `/themes/[theme].css` endpoint to keep
 * large themes out of the initial bundle while remaining cache-friendly.
 */
async function loadThemeStylesheet(themeName: ThemeName): Promise<void> {
	if (themeName === 'theme-default') {
		return
	}

	if (typeof document === 'undefined') {
		return
	}

	const href = THEME_FILES[themeName]
	if (!href) {
		return
	}

	const linkId = `${THEME_LINK_ID_PREFIX}${themeName}`
	const existingLink = document.getElementById(linkId) as HTMLLinkElement | null

	if (existingLink?.dataset.loaded === 'true') {
		return
	}

	await new Promise<void>((resolve, reject) => {
		const linkElement = existingLink ?? document.createElement('link')

		const cleanup = () => {
			linkElement.removeEventListener('load', handleLoad)
			linkElement.removeEventListener('error', handleError)
		}

		const handleLoad = () => {
			cleanup()
			linkElement.dataset.loaded = 'true'
			resolve()
		}

		const handleError = () => {
			cleanup()
			if (!existingLink) {
				linkElement.remove()
			}
			const error = new Error(
				`Failed to load theme stylesheet "${themeName}" from "${href}".`
			)
			reject(error)
		}

		linkElement.addEventListener('load', handleLoad, { once: true })
		linkElement.addEventListener('error', handleError, { once: true })

		linkElement.rel = 'stylesheet'
		linkElement.href = href
		linkElement.id = linkId
		linkElement.dataset.themeName = themeName

		if (!existingLink) {
			document.head.append(linkElement)
		}
	})
}

/**
 * Loads a theme CSS file dynamically
 * @param themeName - The theme class name (e.g., "theme-claude")
 * @returns Promise that resolves when the theme is loaded
 */
export function loadTheme(themeName: string): Promise<void> {
	// Default theme is already loaded via core-minimal.css, skip it
	if (themeName === 'theme-default') {
		return Promise.resolve()
	}

	if (!isKnownTheme(themeName)) {
		return Promise.resolve()
	}

	// If already loaded, return immediately
	if (loadedThemes.has(themeName)) {
		return Promise.resolve()
	}

	// If currently loading, return the existing promise
	const existingPromise = loadingThemes.get(themeName)
	if (existingPromise) {
		return existingPromise
	}

	// Use dynamic import for Next.js compatibility
	const loadPromise = loadThemeStylesheet(themeName)
		.then(() => {
			loadedThemes.add(themeName)
			loadingThemes.delete(themeName)
		})
		.catch((error) => {
			loadingThemes.delete(themeName)
			throw error
		})

	loadingThemes.set(themeName, loadPromise)
	return loadPromise
}

/**
 * Preloads a theme CSS file (for hover/focus scenarios)
 * @param themeName - The theme class name
 */
export function preloadTheme(themeName: string): void {
	if (themeName === 'theme-default' || loadedThemes.has(themeName)) {
		return
	}

	if (!isKnownTheme(themeName)) {
		return
	}

	// Check if already preloading
	if (loadingThemes.has(themeName)) {
		return
	}

	// Start loading it
	loadTheme(themeName).catch(() => {
		// Silently handle errors during preload
	})
}

/**
 * Checks if a theme is already loaded
 * @param themeName - The theme class name
 * @returns true if the theme is loaded
 */
export function isThemeLoaded(themeName: string): boolean {
	return loadedThemes.has(themeName)
}
