import * as React from "react";

interface UseClickOutsideIgnoreProps {
	showPicker: boolean;
	wrapperRef: React.RefObject<HTMLDivElement | null>;
	iconButtonRef: React.RefObject<HTMLButtonElement | null>;
	portalRef: React.RefObject<HTMLDivElement | null>;
}

export const useClickOutsideIgnore = ({
	showPicker,
	wrapperRef,
	iconButtonRef,
	portalRef,
}: UseClickOutsideIgnoreProps) => {
	React.useEffect(() => {
		if (!showPicker) return;

		const markWidgetSafe = (w: HTMLElement) => {
			if (!w.classList.contains("click-outside-ignore")) {
				w.classList.add("click-outside-ignore");
				for (const el of w.querySelectorAll("*")) {
					(el as HTMLElement).classList.add("click-outside-ignore");
				}
			}

			if (!(w as { _glideOutsidePatch?: boolean })._glideOutsidePatch) {
				const ensureIgnored = (node: HTMLElement) => {
					if (!node.classList.contains("click-outside-ignore")) {
						node.classList.add("click-outside-ignore");
					}
					for (const el of node.querySelectorAll("*")) {
						if (
							!(el as HTMLElement).classList.contains("click-outside-ignore")
						) {
							(el as HTMLElement).classList.add("click-outside-ignore");
						}
					}
				};

				ensureIgnored(w);

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

		const markTimekeeperElementsSafe = () => {
			const selectors = [
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

			for (const selector of selectors) {
				try {
					const elements = document.querySelectorAll(selector);
					for (const el of elements) {
						if (el instanceof HTMLElement) {
							if (
								portalRef.current &&
								(portalRef.current.contains(el) ||
									el.closest("[data-timekeeper]") ||
									el.getAttribute("role") === "button" ||
									el.closest('[role="button"]'))
							) {
								markWidgetSafe(el);
							}
						}
					}
				} catch (_error) {}
			}
		};

		markTimekeeperElementsSafe();

		const globalObserver = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node instanceof HTMLElement) {
						const isTimekeeperRelated =
							(node.className &&
								(node.className.includes("timekeeper") ||
									node.className.includes("TimeKeeper") ||
									node.className.includes("clock") ||
									node.className.includes("Clock") ||
									node.className.includes("hour") ||
									node.className.includes("minute") ||
									node.className.includes("meridiem"))) ||
							node.hasAttribute("data-timekeeper-portal") ||
							portalRef.current?.contains(node) ||
							node.closest("[data-timekeeper-portal]") ||
							(node.querySelector &&
								(node.querySelector('[class*="timekeeper"]') ||
									node.querySelector('[class*="clock"]') ||
									node.querySelector('[class*="hour"]') ||
									node.querySelector('[class*="minute"]') ||
									node.querySelector("[data-timekeeper-portal]")));

						if (isTimekeeperRelated) {
							markWidgetSafe(node);
							node.querySelectorAll("*").forEach((child) => {
								if (child instanceof HTMLElement) {
									markWidgetSafe(child);
								}
							});
						}
					}
				});
			});
		});

		setTimeout(() => {
			globalObserver.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["class"],
			});

			markTimekeeperElementsSafe();
		}, 10);

		const intervalId = setInterval(markTimekeeperElementsSafe, 100);

		return () => {
			clearInterval(intervalId);
			globalObserver.disconnect();

			if (portalRef.current) {
				const observer = (
					portalRef.current as { _glideOutsideObserver?: MutationObserver }
				)._glideOutsideObserver;
				if (observer) {
					observer.disconnect();
				}
				(
					portalRef.current as {
						_glideOutsidePatch?: boolean;
						_glideOutsideObserver?: MutationObserver;
					}
				)._glideOutsidePatch = false;
				(
					portalRef.current as {
						_glideOutsidePatch?: boolean;
						_glideOutsideObserver?: MutationObserver | null;
					}
				)._glideOutsideObserver = null;
			}

			if (wrapperRef.current) {
				const observer = (
					wrapperRef.current as { _glideOutsideObserver?: MutationObserver }
				)._glideOutsideObserver;
				if (observer) {
					observer.disconnect();
				}
				(
					wrapperRef.current as {
						_glideOutsidePatch?: boolean;
						_glideOutsideObserver?: MutationObserver;
					}
				)._glideOutsidePatch = false;
				(
					wrapperRef.current as {
						_glideOutsidePatch?: boolean;
						_glideOutsideObserver?: MutationObserver | null;
					}
				)._glideOutsideObserver = null;
			}

			if (iconButtonRef.current) {
				const observer = (
					iconButtonRef.current as { _glideOutsideObserver?: MutationObserver }
				)._glideOutsideObserver;
				if (observer) {
					observer.disconnect();
				}
				(
					iconButtonRef.current as {
						_glideOutsidePatch?: boolean;
						_glideOutsideObserver?: MutationObserver;
					}
				)._glideOutsidePatch = false;
				(
					iconButtonRef.current as {
						_glideOutsidePatch?: boolean;
						_glideOutsideObserver?: MutationObserver | null;
					}
				)._glideOutsideObserver = null;
			}
		};
	}, [showPicker, portalRef, wrapperRef, iconButtonRef]);
};
