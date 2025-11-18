'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type UseFitTextScaleOptions = {
	minScale?: number // minimum scale factor
	maxScale?: number // maximum scale factor
	paddingPx?: number // horizontal padding to reserve inside container
}

import type { RefObject } from 'react'

type UseFitTextScaleResult = {
	containerRef: RefObject<HTMLDivElement | null>
	contentRef: RefObject<HTMLSpanElement | null>
	scale: number
	fontSizePx: number
}

// Threshold for considering scale approximately 1 (within 2% tolerance)
const APPROXIMATE_ONE_THRESHOLD = 0.02

// Measures the width of the content and scales it down to fit within the container.
// Works with single-line text and respects container's available width.
export function useFitTextScale({
	minScale = 0.6,
	maxScale = 1,
	paddingPx: _paddingPx = 8,
}: UseFitTextScaleOptions = {}): UseFitTextScaleResult {
	const containerRef = useRef<HTMLDivElement>(null)
	const contentRef = useRef<HTMLSpanElement>(null)
	const [scale, setScale] = useState(1)
	const [fontSizePx, setFontSizePx] = useState(0)

	const compute = useCallback(() => {
		try {
			const container = containerRef.current
			const content = contentRef.current
			if (!(container && content)) {
				return
			}

			// Measure available width minus actual computed paddings
			const containerRect = container.getBoundingClientRect()
			const cs = getComputedStyle(container)
			const padL = Number.parseFloat(cs.paddingLeft || '0')
			const padR = Number.parseFloat(cs.paddingRight || '0')
			const available = Math.max(0, containerRect.width - (padL + padR))

			// Temporarily clear inline fontSize to measure at CSS-defined size
			const prevFontSize = content.style.fontSize
			content.style.fontSize = ''

			// Use scrollWidth for raw text width
			const needed = content.scrollWidth
			if (needed <= 0 || available <= 0) {
				return
			}

			const raw = available / needed
			const target = Math.min(maxScale, Math.max(minScale, raw))

			setScale(target)
			// Apply scaled font size for both downscale and upscale cases so text can grow to fill width.
			const computed = getComputedStyle(content)
			const baseFont = Number.parseFloat(computed.fontSize || '16')
			if (Number.isFinite(baseFont)) {
				// If target is approximately 1, avoid unnecessary inline style to let CSS control size.
				if (Math.abs(target - 1) < APPROXIMATE_ONE_THRESHOLD) {
					setFontSizePx(0)
				} else {
					setFontSizePx(baseFont * target)
				}
			}
			// Restore
			content.style.fontSize = prevFontSize
		} catch {
			// Ignore errors during measurement - component will re-render on next compute
		}
	}, [minScale, maxScale])

	useEffect(() => {
		compute()
		const onResize = () => compute()
		const onOrientation = () => compute()
		window.addEventListener('resize', onResize)
		window.addEventListener('orientationchange', onOrientation)
		return () => {
			window.removeEventListener('resize', onResize)
			window.removeEventListener('orientationchange', onOrientation)
		}
	}, [compute])

	// Recompute when content text changes, sizes change, or theme/fonts change
	useEffect(() => {
		const el = contentRef.current
		const container = containerRef.current
		if (!el) {
			return
		}
		let mo: MutationObserver | null = null
		let roContent: ResizeObserver | null = null
		let roContainer: ResizeObserver | null = null
		let htmlObserver: MutationObserver | null = null
		let fontLoadingHandler: (() => void) | null = null
		let fontDoneHandler: (() => void) | null = null
		try {
			mo = new MutationObserver(() => compute())
			mo.observe(el, { characterData: true, subtree: true, childList: true })
		} catch {
			// MutationObserver not supported - fallback to manual recomputation
		}
		try {
			if ('ResizeObserver' in window) {
				// Use requestAnimationFrame to prevent ResizeObserver loop errors
				roContent = new ResizeObserver(() => {
					requestAnimationFrame(() => {
						compute()
					})
				})
				roContent.observe(el)
				if (container) {
					roContainer = new ResizeObserver(() => {
						requestAnimationFrame(() => {
							compute()
						})
					})
					roContainer.observe(container)
				}
			}
		} catch {
			// ResizeObserver not supported - fallback to window resize events
		}
		try {
			htmlObserver = new MutationObserver(() => compute())
			htmlObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class'],
			})
		} catch {
			// HTML observer setup failed - theme changes may not trigger recomputation
		}
		try {
			const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts
			if (fonts?.addEventListener) {
				fontLoadingHandler = () => compute()
				fontDoneHandler = () => compute()
				fonts.addEventListener('loading', fontLoadingHandler as EventListener)
				fonts.addEventListener('loadingdone', fontDoneHandler as EventListener)
			}
		} catch {
			// Font loading API not available - fonts will trigger recomputation on load
		}
		return () => {
			mo?.disconnect()
			roContent?.disconnect()
			roContainer?.disconnect()
			htmlObserver?.disconnect()
			try {
				const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts
				if (fonts?.removeEventListener) {
					if (fontLoadingHandler) {
						fonts.removeEventListener(
							'loading',
							fontLoadingHandler as EventListener
						)
					}
					if (fontDoneHandler) {
						fonts.removeEventListener(
							'loadingdone',
							fontDoneHandler as EventListener
						)
					}
				}
			} catch {
				// Font removal failed - cleanup continues
			}
		}
	}, [compute])

	return { containerRef, contentRef, scale, fontSizePx }
}
