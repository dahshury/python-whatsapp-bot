'use client'

import { type RefObject, useEffect } from 'react'

type UseClickOutsideIgnoreProps = {
	showPicker: boolean
	wrapperRef: RefObject<HTMLDivElement | null>
	iconButtonRef: RefObject<HTMLButtonElement | null>
	portalRef: RefObject<HTMLDivElement | null>
}

export const useClickOutsideIgnore = ({
	showPicker,
	wrapperRef,
	iconButtonRef,
	portalRef,
}: UseClickOutsideIgnoreProps) => {
	useEffect(() => {
		if (!showPicker) {
			return
		}

		const markWidgetSafe = (w: HTMLElement) => {
			if (!w.classList.contains('click-outside-ignore')) {
				w.classList.add('click-outside-ignore')
				for (const el of w.querySelectorAll('*')) {
					;(el as HTMLElement).classList.add('click-outside-ignore')
				}
			}

			if (!(w as { _glideOutsidePatch?: boolean })._glideOutsidePatch) {
				const ensureIgnored = (node: HTMLElement) => {
					if (!node.classList.contains('click-outside-ignore')) {
						node.classList.add('click-outside-ignore')
					}
					for (const el of node.querySelectorAll('*')) {
						if (
							!(el as HTMLElement).classList.contains('click-outside-ignore')
						) {
							;(el as HTMLElement).classList.add('click-outside-ignore')
						}
					}
				}

				ensureIgnored(w)

				const mo = new MutationObserver((muts) => {
					for (const mut of muts) {
						for (const node of mut.addedNodes) {
							if (node instanceof HTMLElement) {
								ensureIgnored(node)
							}
						}
					}
				})
				mo.observe(w, { childList: true, subtree: true })

				;(
					w as {
						_glideOutsidePatch?: boolean
						_glideOutsideObserver?: MutationObserver
					}
				)._glideOutsidePatch = true
				;(
					w as {
						_glideOutsidePatch?: boolean
						_glideOutsideObserver?: MutationObserver
					}
				)._glideOutsideObserver = mo
			}
		}

		if (portalRef.current) {
			markWidgetSafe(portalRef.current)
		}

		if (wrapperRef.current) {
			markWidgetSafe(wrapperRef.current)
		}
		if (iconButtonRef.current) {
			markWidgetSafe(iconButtonRef.current)
		}

		const markTimekeeperElementsSafe = () => {
			const selectors = [
				'.react-timekeeper',
				'[class*="timekeeper"]',
				'[class*="TimeKeeper"]',
				'[class*="time-keeper"]',
				'[class*="time_keeper"]',
				'[data-timekeeper-portal]',
				'[class*="clock"]',
				'[class*="Clock"]',
				'[class*="time-display"]',
				'[class*="time_display"]',
				'[class*="hour"]',
				'[class*="minute"]',
				'[class*="meridiem"]',
				'[class*="am-pm"]',
			]

			for (const selector of selectors) {
				try {
					const elements = document.querySelectorAll(selector)
					for (const el of elements) {
						if (
							el instanceof HTMLElement &&
							portalRef.current &&
							(portalRef.current.contains(el) ||
								el.closest('[data-timekeeper]') ||
								el.getAttribute('role') === 'button' ||
								el.closest('[role="button"]'))
						) {
							markWidgetSafe(el)
						}
					}
				} catch (_error) {
					// Query selector failed; skip this selector
				}
			}
		}

		markTimekeeperElementsSafe()

		const globalObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node instanceof HTMLElement) {
						const classNameStr = node.className
						const isTimekeeperRelated =
							(classNameStr &&
								(classNameStr.includes('timekeeper') ||
									classNameStr.includes('TimeKeeper') ||
									classNameStr.includes('clock') ||
									classNameStr.includes('Clock') ||
									classNameStr.includes('hour') ||
									classNameStr.includes('minute') ||
									classNameStr.includes('meridiem'))) ||
							node.hasAttribute('data-timekeeper-portal') ||
							portalRef.current?.contains(node) ||
							node.closest('[data-timekeeper-portal]') ||
							(node.querySelector &&
								(node.querySelector('[class*="timekeeper"]') ||
									node.querySelector('[class*="clock"]') ||
									node.querySelector('[class*="hour"]') ||
									node.querySelector('[class*="minute"]') ||
									node.querySelector('[data-timekeeper-portal]')))

						if (isTimekeeperRelated) {
							markWidgetSafe(node)
							for (const child of node.querySelectorAll('*')) {
								if (child instanceof HTMLElement) {
									markWidgetSafe(child)
								}
							}
						}
					}
				}
			}
		})

		const SETUP_DELAY_MS = 10
		const CHECK_INTERVAL_MS = 100
		setTimeout(() => {
			globalObserver.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ['class'],
			})

			markTimekeeperElementsSafe()
		}, SETUP_DELAY_MS)

		const intervalId = setInterval(
			markTimekeeperElementsSafe,
			CHECK_INTERVAL_MS
		)

		return () => {
			clearInterval(intervalId)
			globalObserver.disconnect()

			if (portalRef.current) {
				const observer = (
					portalRef.current as { _glideOutsideObserver?: MutationObserver }
				)._glideOutsideObserver
				if (observer) {
					observer.disconnect()
				}
				;(
					portalRef.current as {
						_glideOutsidePatch?: boolean
						_glideOutsideObserver?: MutationObserver
					}
				)._glideOutsidePatch = false
				;(
					portalRef.current as {
						_glideOutsidePatch?: boolean
						_glideOutsideObserver?: MutationObserver | null
					}
				)._glideOutsideObserver = null
			}

			if (wrapperRef.current) {
				const observer = (
					wrapperRef.current as { _glideOutsideObserver?: MutationObserver }
				)._glideOutsideObserver
				if (observer) {
					observer.disconnect()
				}
				;(
					wrapperRef.current as {
						_glideOutsidePatch?: boolean
						_glideOutsideObserver?: MutationObserver
					}
				)._glideOutsidePatch = false
				;(
					wrapperRef.current as {
						_glideOutsidePatch?: boolean
						_glideOutsideObserver?: MutationObserver | null
					}
				)._glideOutsideObserver = null
			}

			if (iconButtonRef.current) {
				const observer = (
					iconButtonRef.current as { _glideOutsideObserver?: MutationObserver }
				)._glideOutsideObserver
				if (observer) {
					observer.disconnect()
				}
				;(
					iconButtonRef.current as {
						_glideOutsidePatch?: boolean
						_glideOutsideObserver?: MutationObserver
					}
				)._glideOutsidePatch = false
				;(
					iconButtonRef.current as {
						_glideOutsidePatch?: boolean
						_glideOutsideObserver?: MutationObserver | null
					}
				)._glideOutsideObserver = null
			}
		}
	}, [showPicker, portalRef, wrapperRef, iconButtonRef])
}
