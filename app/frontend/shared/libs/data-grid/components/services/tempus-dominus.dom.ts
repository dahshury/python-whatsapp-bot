/**
 * Tempus Dominus DOM helpers extracted for reuse and SoC
 */

/** Marks the widget and all descendants with a class so click-outside logic can ignore it. */
export function markWidgetSafe(widget: HTMLElement): void {
	if (!widget) return;
	try {
		if (!widget.classList.contains("click-outside-ignore")) {
			widget.classList.add("click-outside-ignore");
			for (const el of Array.from(widget.querySelectorAll("*"))) {
				(el as HTMLElement).classList.add("click-outside-ignore");
			}
		}

		// Continuously ensure any new children are marked so overlay's click-outside logic ignores them.
		if (!(widget as { _glideOutsidePatch?: boolean })._glideOutsidePatch) {
			const ensureIgnored = (node: HTMLElement) => {
				if (!node.classList.contains("click-outside-ignore")) {
					node.classList.add("click-outside-ignore");
				}
				for (const el of Array.from(node.querySelectorAll("*"))) {
					if (!(el as HTMLElement).classList.contains("click-outside-ignore")) {
						(el as HTMLElement).classList.add("click-outside-ignore");
					}
				}
			};

			// Initial pass
			ensureIgnored(widget);

			// Observe for dynamically created descendants (e.g., time-arrow buttons)
			const mo = new MutationObserver((muts) => {
				for (const mut of muts) {
					for (const node of Array.from(mut.addedNodes)) {
						if (node instanceof HTMLElement) {
							ensureIgnored(node);
						}
					}
				}
			});
			mo.observe(widget, { childList: true, subtree: true });

			(
				widget as {
					_glideOutsidePatch?: boolean;
					_glideOutsideObserver?: MutationObserver;
				}
			)._glideOutsidePatch = true;
			(
				widget as {
					_glideOutsidePatch?: boolean;
					_glideOutsideObserver?: MutationObserver;
				}
			)._glideOutsideObserver = mo;
		}
	} catch {}
}

/** Ensures the widget is appended to document.body for consistent positioning/animation. */
export function ensureWidgetInBody(widget: HTMLElement): void {
	try {
		if (!widget) return;
		if (widget.parentElement !== document.body) {
			document.body.appendChild(widget);
		}
	} catch {}
}

/**
 * Attempts to find an existing Tempus Dominus widget associated with an instance.
 * Falls back to querying visible widgets in the DOM.
 */
export function findOrQueryWidget(instance: unknown): HTMLElement | null {
	let widget: HTMLElement | null = null;
	try {
		const byDisplay = (instance as { display?: { widget?: Element } }).display?.widget;
		if (byDisplay) widget = byDisplay as HTMLElement;
		else {
			const byPopover = (instance as { popover?: { tip?: Element } }).popover?.tip;
			if (byPopover) widget = byPopover as HTMLElement;
			else {
				const legacy = (instance as { _widget?: Element })._widget;
				if (legacy) widget = legacy as HTMLElement;
			}
		}
	} catch {}

	if (!widget) {
		// Prefer body-level widgets
		const bodyWidgets = Array.from(
			document.body.querySelectorAll(
				':scope > .tempus-dominus-widget, :scope > [class*="tempus-dominus"], :scope > .dropdown-menu[id*="tempus"]'
			)
		) as HTMLElement[];

		const allWidgets =
			bodyWidgets.length > 0
				? bodyWidgets
				: (Array.from(
						document.querySelectorAll(
							'.tempus-dominus-widget, .tempus-dominus-container, [class*="tempus-dominus"], .dropdown-menu[id*="tempus"]'
						)
					) as HTMLElement[]);

		widget =
			allWidgets.find((w) => window.getComputedStyle(w).display !== "none") ||
			allWidgets[allWidgets.length - 1] ||
			null;
	}

	return widget;
}

// Simple per-widget animation state using WeakMap to avoid leaks
const widgetState = new WeakMap<HTMLElement, { last?: { action: "show" | "hide"; at: number }; visible: boolean }>();

/** Animates the Tempus Dominus widget in or out with throttling and visibility guards. */
export function animateWidget(widget: HTMLElement, action: "show" | "hide"): void {
	try {
		if (!widget) return;
		const now = typeof performance !== "undefined" ? performance.now() : Date.now();
		const state = widgetState.get(widget) || { visible: false };
		if (state.last && state.last.action === action && now - state.last.at < 350) {
			return;
		}
		if (action === "show" && state.visible) return;
		if (action === "hide" && !state.visible) return;

		state.last = { action, at: now };

		markWidgetSafe(widget);
		ensureWidgetInBody(widget);

		if (action === "show") {
			requestAnimationFrame(() => {
				widget.classList.remove("tempus-dominus-widget-animated-out", "tempus-dominus-widget-hidden");
				widget.style.animation = "none";
				void (widget as HTMLElement).offsetHeight;
				widget.classList.add("tempus-dominus-widget-animated-in");
				widget.classList.add("tempus-dominus-widget-transition");
				widget.style.opacity = "0";
				widget.style.transition = "none";
				void (widget as HTMLElement).offsetHeight;
				requestAnimationFrame(() => {
					widget.style.transition = "opacity 250ms cubic-bezier(0.16, 1, 0.3, 1)";
					widget.style.opacity = "1";
					widget.classList.add("tempus-dominus-widget-visible");
					widgetState.set(widget, { ...state, visible: true });
				});
			});
		} else {
			widget.classList.remove("tempus-dominus-widget-animated-in", "tempus-dominus-widget-visible");
			widget.classList.add("tempus-dominus-widget-animated-out");
			widget.classList.add("tempus-dominus-widget-transition");
			widget.classList.add("tempus-dominus-widget-hidden");
			widget.style.transition = "opacity 200ms cubic-bezier(0.4, 0, 1, 1)";
			widget.style.opacity = "0";
			widgetState.set(widget, { ...state, visible: false });
		}
	} catch {}
}

/** Observe creation of TD widgets and invoke callback; returns a disconnect function. */
export function observeWidgetCreation(onCreate: (widget: HTMLElement) => void): () => void {
	let mo: MutationObserver | undefined;
	try {
		mo = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (node instanceof HTMLElement) {
						const isWidget =
							node.classList.contains("tempus-dominus-widget") ||
							node.classList.contains("dropdown-menu") ||
							node.querySelector(".tempus-dominus-widget") ||
							node.id?.includes("tempus");
						if (isWidget) {
							const widget = node.classList.contains("tempus-dominus-widget")
								? (node as HTMLElement)
								: (node.querySelector(".tempus-dominus-widget") as HTMLElement) || (node as HTMLElement);
							onCreate(widget);
						}
					}
				}
			}
		});
		mo.observe(document.body, { childList: true, subtree: true });
	} catch {}
	return () => {
		try {
			mo?.disconnect();
		} catch {}
	};
}
