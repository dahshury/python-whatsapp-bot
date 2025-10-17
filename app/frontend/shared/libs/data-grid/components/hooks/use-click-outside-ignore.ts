import { type RefObject, useEffect } from "react";

// Timing constants for outside-click detection
const TIMEOUT_MARK_SAFE_MS = 10; // Initial timeout to mark elements as safe
const RECHECK_INTERVAL_MS = 100; // Interval to recheck and mark new elements as safe

// Helper to add click-outside-ignore class to element and all descendants
const addIgnoreClassToElement = (element: HTMLElement) => {
	if (!element.classList.contains("click-outside-ignore")) {
		element.classList.add("click-outside-ignore");
	}
	for (const el of element.querySelectorAll("*")) {
		if (!(el as HTMLElement).classList.contains("click-outside-ignore")) {
			(el as HTMLElement).classList.add("click-outside-ignore");
		}
	}
};

// Helper to set up observer and patches on widget
const setupWidgetPatch = (
	w: HTMLElement,
	ensureIgnored: (node: HTMLElement) => void
) => {
	if ((w as { _glideOutsidePatch?: boolean })._glideOutsidePatch) {
		return;
	}

	const mo = new MutationObserver((muts) => {
		for (const mut of muts) {
			for (const node of mut.addedNodes) {
				if (node instanceof HTMLElement) {
					ensureIgnored(node);
				}
			}
		}
	});
	mo.observe(w, { childList: true, subtree: true });

	(
		w as {
			_glideOutsidePatch?: boolean;
			_glideOutsideObserver?: MutationObserver;
		}
	)._glideOutsidePatch = true;
	(
		w as {
			_glideOutsidePatch?: boolean;
			_glideOutsideObserver?: MutationObserver;
		}
	)._glideOutsideObserver = mo;
};

type UseClickOutsideIgnoreProps = {
	showPicker: boolean;
	wrapperRef: RefObject<HTMLDivElement | null>;
	iconButtonRef: RefObject<HTMLButtonElement | null>;
	portalRef: RefObject<HTMLDivElement | null>;
};

// Timekeeper selectors for efficient detection
const TIMEKEEPER_SELECTORS = [
	".react-timekeeper",
	'[class*="timekeeper"]',
	'[class*="TimeKeeper"]',
	'[class*="time-keeper"]',
	'[class*="time_keeper"]',
	"[data-timekeeper-portal]",
	'[class*="clock"]',
	'[class*="Clock"]',
	'[class*="time-display"]',
	'[class*="time_display"]',
	'[class*="hour"]',
	'[class*="minute"]',
	'[class*="meridiem"]',
	'[class*="am-pm"]',
];

function isTimekeeperElement(
	node: HTMLElement,
	portalRef: RefObject<HTMLDivElement | null>
): boolean {
	const className = node.className || "";
	const hasTimekeeperClass =
		className.includes("timekeeper") ||
		className.includes("TimeKeeper") ||
		className.includes("clock") ||
		className.includes("Clock") ||
		className.includes("hour") ||
		className.includes("minute") ||
		className.includes("meridiem");

	const hasTimekeeperAttribute = node.hasAttribute("data-timekeeper-portal");
	const isInPortal = portalRef.current?.contains(node) ?? false;
	const hasTimekeeperParent = !!node.closest("[data-timekeeper-portal]");
	const hasTimekeeperChild =
		node.querySelector &&
		(!!node.querySelector('[class*="timekeeper"]') ||
			!!node.querySelector('[class*="clock"]') ||
			!!node.querySelector('[class*="hour"]') ||
			!!node.querySelector('[class*="minute"]') ||
			!!node.querySelector("[data-timekeeper-portal]"));

	return (
		hasTimekeeperClass ||
		hasTimekeeperAttribute ||
		isInPortal ||
		hasTimekeeperParent ||
		hasTimekeeperChild
	);
}

function markNodeAndChildren(
	node: HTMLElement,
	markWidgetSafe: (el: HTMLElement) => void
) {
	markWidgetSafe(node);
	for (const child of node.querySelectorAll("*")) {
		if (child instanceof HTMLElement) {
			markWidgetSafe(child);
		}
	}
}

function handleMutationObserverCallback(
	mutations: MutationRecord[],
	markWidgetSafe: (el: HTMLElement) => void,
	portalRef: RefObject<HTMLDivElement | null>
) {
	for (const mutation of mutations) {
		for (const node of mutation.addedNodes) {
			if (node instanceof HTMLElement && isTimekeeperElement(node, portalRef)) {
				markNodeAndChildren(node, markWidgetSafe);
			}
		}
	}
}

function markTimekeeperElementsSafe(
	markWidgetSafe: (el: HTMLElement) => void,
	portalRef: RefObject<HTMLDivElement | null>
) {
	for (const selector of TIMEKEEPER_SELECTORS) {
		try {
			const elements = document.querySelectorAll(selector);
			for (const el of elements) {
				if (
					el instanceof HTMLElement &&
					portalRef.current &&
					(portalRef.current.contains(el) ||
						el.closest("[data-timekeeper]") ||
						el.getAttribute("role") === "button" ||
						el.closest('[role="button"]'))
				) {
					markWidgetSafe(el);
				}
			}
		} catch {
			// Intentionally ignore errors - DOM traversal may fail safely
		}
	}
}

type WidgetRef =
	| RefObject<HTMLDivElement | null>
	| RefObject<HTMLButtonElement | null>;

function cleanupWidgetObserver(ref: WidgetRef) {
	if (!ref.current) {
		return;
	}

	const observer = (ref.current as { _glideOutsideObserver?: MutationObserver })
		._glideOutsideObserver;
	if (observer) {
		observer.disconnect();
	}

	const current = ref.current as {
		_glideOutsidePatch?: boolean;
		_glideOutsideObserver?: MutationObserver | null;
	};
	current._glideOutsidePatch = false;
	current._glideOutsideObserver = null;
}

export const useClickOutsideIgnore = ({
	showPicker,
	wrapperRef,
	iconButtonRef,
	portalRef,
}: UseClickOutsideIgnoreProps) => {
	useEffect(() => {
		if (!showPicker) {
			return;
		}

		const markWidgetSafe = (w: HTMLElement) => {
			addIgnoreClassToElement(w);

			if (!(w as { _glideOutsidePatch?: boolean })._glideOutsidePatch) {
				const ensureIgnored = (node: HTMLElement) => {
					addIgnoreClassToElement(node);
				};

				ensureIgnored(w);
				setupWidgetPatch(w, ensureIgnored);
			}
		};

		if (portalRef.current) {
			markWidgetSafe(portalRef.current);
		}

		if (wrapperRef.current) {
			markWidgetSafe(wrapperRef.current);
		}
		if (iconButtonRef.current) {
			markWidgetSafe(iconButtonRef.current);
		}

		const globalObserver = new MutationObserver((mutations) => {
			handleMutationObserverCallback(mutations, markWidgetSafe, portalRef);
		});

		setTimeout(() => {
			globalObserver.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["class"],
			});

			markTimekeeperElementsSafe(markWidgetSafe, portalRef);
		}, TIMEOUT_MARK_SAFE_MS);

		const intervalId = setInterval(() => {
			markTimekeeperElementsSafe(markWidgetSafe, portalRef);
		}, RECHECK_INTERVAL_MS);

		return () => {
			clearInterval(intervalId);
			globalObserver.disconnect();
			cleanupWidgetObserver(portalRef);
			cleanupWidgetObserver(wrapperRef);
			cleanupWidgetObserver(iconButtonRef);
		};
	}, [showPicker, portalRef, wrapperRef, iconButtonRef]);
};
