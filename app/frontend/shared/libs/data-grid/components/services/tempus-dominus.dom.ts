/**
 * Tempus Dominus DOM helpers extracted for reuse and SoC
 */

const RAPID_ACTION_THRESHOLD_MS = 350
const SHOW_ANIMATION_DURATION_MS = 250
const HIDE_ANIMATION_DURATION_MS = 200

const isBrowserEnvironment = typeof document !== 'undefined'
const hasMutationObserver = typeof MutationObserver !== 'undefined'

const forceReflow = (element: HTMLElement): void => {
	if (!element) {
		return
	}

	if (typeof element.getBoundingClientRect === 'function') {
		element.getBoundingClientRect()
		return
	}

	if (element.offsetHeight >= 0) {
		// Accessing offsetHeight triggers a synchronous layout recalculation.
	}
}

/** Marks the widget and all descendants with a class so click-outside logic can ignore it. */
export function markWidgetSafe(widget: HTMLElement): void {
	if (!widget) {
		return
	}

	const ensureIgnored = (node: HTMLElement) => {
		if (!node.classList.contains('click-outside-ignore')) {
			node.classList.add('click-outside-ignore')
		}
		for (const el of Array.from(node.querySelectorAll('*'))) {
			const element = el as HTMLElement
			if (!element.classList.contains('click-outside-ignore')) {
				element.classList.add('click-outside-ignore')
			}
		}
	}

	ensureIgnored(widget)

	const patchState = widget as {
		_glideOutsidePatch?: boolean
		_glideOutsideObserver?: MutationObserver
	}

	if (patchState._glideOutsidePatch) {
		return
	}

	if (!hasMutationObserver) {
		patchState._glideOutsidePatch = true
		return
	}

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of Array.from(mutation.addedNodes)) {
				if (node instanceof HTMLElement) {
					ensureIgnored(node)
				}
			}
		}
	})

	observer.observe(widget, { childList: true, subtree: true })
	patchState._glideOutsidePatch = true
	patchState._glideOutsideObserver = observer
}

/** Ensures the widget is appended to document.body for consistent positioning/animation. */
export function ensureWidgetInBody(widget: HTMLElement): void {
	if (!(widget && isBrowserEnvironment && document.body)) {
		return
	}

	if (widget.parentElement !== document.body) {
		document.body.appendChild(widget)
	}
}

/**
 * Attempts to find an existing Tempus Dominus widget associated with an instance.
 * Falls back to querying visible widgets in the DOM.
 */
export function findOrQueryWidget(instance: unknown): HTMLElement | null {
	if (!isBrowserEnvironment) {
		return null
	}

	const candidate =
		instance && typeof instance === 'object'
			? (instance as {
					display?: { widget?: Element }
					popover?: { tip?: Element }
					_widget?: Element
				})
			: undefined

	const displayWidget = candidate?.display?.widget
	const popoverWidget = candidate?.popover?.tip
	const legacyWidget = candidate?._widget

	const directWidget = [displayWidget, popoverWidget, legacyWidget].find(
		(node): node is HTMLElement => node instanceof HTMLElement
	)

	if (directWidget) {
		return directWidget
	}

	if (!document.body) {
		return null
	}

	const bodyWidgets = Array.from(
		document.body.querySelectorAll(
			':scope > .tempus-dominus-widget, :scope > [class*="tempus-dominus"], :scope > .dropdown-menu[id*="tempus"]'
		)
	) as HTMLElement[]

	const allWidgets =
		bodyWidgets.length > 0
			? bodyWidgets
			: (Array.from(
					document.querySelectorAll(
						'.tempus-dominus-widget, .tempus-dominus-container, [class*="tempus-dominus"], .dropdown-menu[id*="tempus"]'
					)
				) as HTMLElement[])

	const hasGetComputedStyle =
		typeof window !== 'undefined' &&
		typeof window.getComputedStyle === 'function'

	if (hasGetComputedStyle) {
		const visibleWidget = allWidgets.find(
			(widget) => window.getComputedStyle(widget).display !== 'none'
		)
		if (visibleWidget) {
			return visibleWidget
		}
	}

	return allWidgets.at(-1) ?? null
}

// Simple per-widget animation state using WeakMap to avoid leaks
const widgetState = new WeakMap<
	HTMLElement,
	{ last?: { action: 'show' | 'hide'; at: number }; visible: boolean }
>()

/** Animates the Tempus Dominus widget in or out with throttling and visibility guards. */
export function animateWidget(
	widget: HTMLElement,
	action: 'show' | 'hide'
): void {
	if (!(widget && isBrowserEnvironment)) {
		return
	}

	const now =
		typeof performance !== 'undefined' && typeof performance.now === 'function'
			? performance.now()
			: Date.now()

	const existingState = widgetState.get(widget) ?? { visible: false }
	if (
		existingState.last &&
		existingState.last.action === action &&
		now - existingState.last.at < RAPID_ACTION_THRESHOLD_MS
	) {
		return
	}
	if (action === 'show' && existingState.visible) {
		return
	}
	if (action === 'hide' && !existingState.visible) {
		return
	}

	const nextState = { ...existingState, last: { action, at: now } }
	widgetState.set(widget, nextState)

	markWidgetSafe(widget)
	ensureWidgetInBody(widget)

	const schedule =
		typeof requestAnimationFrame === 'function'
			? requestAnimationFrame
			: undefined

	if (action === 'show') {
		const runShow = () => {
			widget.classList.remove(
				'tempus-dominus-widget-animated-out',
				'tempus-dominus-widget-hidden'
			)
			widget.style.animation = 'none'
			forceReflow(widget)
			widget.classList.add(
				'tempus-dominus-widget-animated-in',
				'tempus-dominus-widget-transition'
			)
			widget.style.opacity = '0'
			widget.style.transition = 'none'
			forceReflow(widget)
			const finalizeShow = () => {
				widget.style.transition = `opacity ${SHOW_ANIMATION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
				widget.style.opacity = '1'
				widget.classList.add('tempus-dominus-widget-visible')
				widgetState.set(widget, { ...nextState, visible: true })
			}
			if (schedule) {
				schedule(finalizeShow)
			} else {
				finalizeShow()
			}
		}
		if (schedule) {
			schedule(runShow)
		} else {
			runShow()
		}
		return
	}

	widget.classList.remove(
		'tempus-dominus-widget-animated-in',
		'tempus-dominus-widget-visible'
	)
	widget.classList.add(
		'tempus-dominus-widget-animated-out',
		'tempus-dominus-widget-transition',
		'tempus-dominus-widget-hidden'
	)
	widget.style.transition = `opacity ${HIDE_ANIMATION_DURATION_MS}ms cubic-bezier(0.4, 0, 1, 1)`
	widget.style.opacity = '0'
	widgetState.set(widget, { ...nextState, visible: false })
}

/** Observe creation of TD widgets and invoke callback; returns a disconnect function. */
export function observeWidgetCreation(
	onCreate: (widget: HTMLElement) => void
): () => void {
	if (!(isBrowserEnvironment && hasMutationObserver && document.body)) {
		return () => {
			// No-op: listeners are only needed in environments with DOM access.
		}
	}

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of Array.from(mutation.addedNodes)) {
				if (!(node instanceof HTMLElement)) {
					continue
				}
				const isWidget =
					node.classList.contains('tempus-dominus-widget') ||
					node.classList.contains('dropdown-menu') ||
					node.querySelector('.tempus-dominus-widget') ||
					node.id?.includes('tempus')
				if (!isWidget) {
					continue
				}
				const widget = node.classList.contains('tempus-dominus-widget')
					? (node as HTMLElement)
					: (node.querySelector('.tempus-dominus-widget') as HTMLElement) ||
						(node as HTMLElement)
				onCreate(widget)
			}
		}
	})

	observer.observe(document.body, { childList: true, subtree: true })

	return () => {
		observer.disconnect()
	}
}
