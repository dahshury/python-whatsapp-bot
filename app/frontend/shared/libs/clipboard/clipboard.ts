'use client'

import {
	read as polyfillRead,
	readText as polyfillReadText,
	write as polyfillWrite,
	writeText as polyfillWriteText,
} from 'clipboard-polyfill'

/**
 * Clipboard utility helpers powered by clipboard-polyfill.
 * Provides full clipboard API support across all browsers and devices,
 * including proper handling of images, SVGs, and rich content on mobile.
 *
 * The clipboard-polyfill library handles all fallbacks automatically,
 * so no manual prompt-based fallbacks are needed.
 */

/**
 * Write text to the clipboard.
 * Works on all devices including mobile browsers.
 */
export async function writeClipboardText(text: string): Promise<void> {
	if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text)
			return
		} catch (_error) {
			// Try the polyfill if native API fails
			try {
				await polyfillWriteText(text)
				return
			} catch {
				throw new Error('Failed to write to clipboard')
			}
		}
	}

	// Use polyfill if native API is not available
	await polyfillWriteText(text)
}

/**
 * Read text from the clipboard.
 * Works on all devices including mobile browsers.
 */
export async function readClipboardText(): Promise<string> {
	if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
		try {
			const text = await navigator.clipboard.readText()
			if (typeof text === 'string') {
				return text
			}
		} catch (_error) {
			// Try the polyfill if native API fails
			try {
				return await polyfillReadText()
			} catch {
				throw new Error('Failed to read from clipboard')
			}
		}
	}

	// Use polyfill if native API is not available
	return polyfillReadText()
}

/**
 * Write rich content (images, HTML, etc.) to the clipboard.
 * Works on all devices including mobile browsers.
 */
export async function writeClipboard(items: ClipboardItem[]): Promise<void> {
	if (typeof navigator !== 'undefined' && navigator.clipboard?.write) {
		try {
			await navigator.clipboard.write(items)
			return
		} catch (_error) {
			// Try the polyfill if native API fails
			try {
				await polyfillWrite(items)
				return
			} catch {
				throw new Error('Failed to write to clipboard')
			}
		}
	}

	// Use polyfill if native API is not available
	await polyfillWrite(items)
}

/**
 * Read rich content (images, HTML, etc.) from the clipboard.
 * Works on all devices including mobile browsers.
 */
export async function readClipboard(): Promise<ClipboardItem[]> {
	if (typeof navigator !== 'undefined' && navigator.clipboard?.read) {
		try {
			return await navigator.clipboard.read()
		} catch (_error) {
			// Try the polyfill if native API fails
			try {
				const items = await polyfillRead()
				// Cast to ClipboardItem[] for type compatibility
				return items as unknown as ClipboardItem[]
			} catch {
				throw new Error('Failed to read from clipboard')
			}
		}
	}

	// Use polyfill if native API is not available
	const items = await polyfillRead()
	// Cast to ClipboardItem[] for type compatibility
	return items as unknown as ClipboardItem[]
}

export type ClipboardWriteFn = typeof writeClipboardText
export type ClipboardReadFn = typeof readClipboardText
