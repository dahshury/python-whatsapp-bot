"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "@/lib/z-index";

interface DialogPortalProps {
	children: React.ReactNode;
}

export function DialogPortal({ children }: DialogPortalProps) {
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null,
	);

	useEffect(() => {
		// Create a portal container outside the dialog
		const container = document.createElement("div");
		container.id = "dialog-overlay-portal";
		container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: ${Z_INDEX.DIALOG_OVERLAY_PORTAL};
      width: 0;
      height: 0;
    `;

		document.body.appendChild(container);
		setPortalContainer(container);

		// Cleanup
		return () => {
			if (container.parentNode) {
				container.parentNode.removeChild(container);
			}
		};
	}, []);

	if (!portalContainer) {
		return null;
	}

	return createPortal(children, portalContainer);
}

// Hook to move overlay editors to portal
export function useDialogOverlayPortal() {
	useEffect(() => {
		// IMMEDIATE: Force dialog to not create stacking context
		const forceDialogStacking = () => {
			const dialogs = document.querySelectorAll(
				'[role="dialog"], [data-radix-dialog-content]',
			);
			dialogs.forEach((dialog) => {
				if (dialog instanceof HTMLElement) {
					// Remove stacking context properties
					dialog.style.transform = "none";
					dialog.style.filter = "none";
					dialog.style.perspective = "none";
					dialog.style.clipPath = "none";
					dialog.style.mask = "none";
					dialog.style.mixBlendMode = "normal";
					dialog.style.isolation = "auto";
					dialog.style.contain = "none";
				}
			});
		};

		// Apply immediately
		forceDialogStacking();

		// Also apply when dialogs are added
		const dialogObserver = new MutationObserver(forceDialogStacking);
		dialogObserver.observe(document.body, { childList: true, subtree: true });

		// Main portal logic
		const moveToPortal = () => {
			const portalContainer = document.getElementById("dialog-overlay-portal");
			if (!portalContainer) return;

			// Comprehensive list of selectors for all possible overlays
			const selectors = [
				// Glide Data Grid overlays
				".gdg-d19meir1",
				".glide-data-grid-overlay-editor",
				".click-outside-ignore",

				// Column menus
				".column-menu",
				".enhanced-column-menu",
				".glide-column-menu",

				// Date/Time pickers
				".tempus-dominus-widget",
				".td-picker",
				".td-overlay",
				".td-widget",
				".tempus-dominus",

				// Radix UI overlays (dropdowns, selects, etc.)
				"[data-radix-popper-content-wrapper]",
				"[data-radix-select-content]",
				"[data-radix-dropdown-menu-content]",
				"[data-radix-popover-content]",
				"[data-radix-tooltip-content]",
				"[data-radix-hover-card-content]",
				"[data-radix-context-menu-content]",
				"[data-radix-menubar-content]",
				"[data-radix-navigation-menu-content]",

				// Generic popper/floating UI
				"[data-popper-placement]",
				".floating-ui-element",
				".popper",

				// Phone input dropdowns
				".react-tel-input .country-list",
				".phone-input-dropdown",

				// Generic dropdown classes
				".dropdown-menu",
				".select-dropdown",
				".autocomplete-dropdown",
				".combobox-dropdown",

				// Any element with high z-index that might be an overlay
				'[style*="z-index: 999"]',
				'[style*="z-index: 1000"]',
				'[style*="z-index: 9999"]',
			];

			const forceElementAboveDialog = (
				element: HTMLElement,
				reason: string,
			) => {
				// First try to move to portal
				if (element.parentElement !== portalContainer) {
					try {
						console.log(
							"Moving overlay to portal:",
							reason,
							element.className || element.tagName,
						);
						portalContainer.appendChild(element);
					} catch (e) {
						console.log("Failed to move to portal, applying direct styles:", e);
					}
				}

				// ALWAYS apply z-index above dialog using CSS variable
				element.style.zIndex = "var(--z-dialog-overlays)";
				element.style.position = "fixed";
				element.style.pointerEvents = "auto";

				// Also force all children to have high z-index
				const children = element.querySelectorAll("*");
				children.forEach((child) => {
					if (child instanceof HTMLElement) {
						child.style.zIndex = "var(--z-dialog-overlays)";
					}
				});
			};

			selectors.forEach((selector) => {
				const elements = document.querySelectorAll(selector);
				elements.forEach((element) => {
					if (element instanceof HTMLElement) {
						// Check if element is inside a dialog OR if it's related to dialog content
						const isInDialog = element.closest(
							'[role="dialog"], [data-radix-dialog-content]',
						);
						const isDialogRelated =
							element.getAttribute("data-radix-portal") !== null ||
							element.closest("[data-radix-portal]") !== null;

						if (isInDialog || isDialogRelated) {
							forceElementAboveDialog(element, selector);
						}
					}
				});
			});

			// Also check for any absolutely positioned elements that might be overlays
			// and are positioned near the top of the viewport (likely overlays)
			const absoluteElements = document.querySelectorAll(
				'[style*="position: absolute"], [style*="position: fixed"]',
			);
			absoluteElements.forEach((element) => {
				if (
					element instanceof HTMLElement &&
					element.parentElement !== portalContainer
				) {
					const rect = element.getBoundingClientRect();
					const computedStyle = window.getComputedStyle(element);
					const zIndex = parseInt(computedStyle.zIndex || "0", 10);

					// If it has high z-index and is positioned like an overlay
					if (zIndex > 100 && rect.top < window.innerHeight / 2) {
						const isInDialog = element.closest(
							'[role="dialog"], [data-radix-dialog-content]',
						);
						if (isInDialog) {
							forceElementAboveDialog(element, "high-z-index-overlay");
						}
					}
				}
			});
		};

		// Move existing elements immediately
		moveToPortal();

		// Watch for new elements with more comprehensive observation
		const observer = new MutationObserver((mutations) => {
			let shouldCheck = false;

			mutations.forEach((mutation) => {
				// Check if any nodes were added
				if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
					shouldCheck = true;
				}
				// Also check for attribute changes that might indicate new overlays
				if (
					mutation.type === "attributes" &&
					(mutation.attributeName === "style" ||
						mutation.attributeName === "data-state" ||
						mutation.attributeName?.startsWith("data-radix"))
				) {
					shouldCheck = true;
				}
			});

			if (shouldCheck) {
				// Small delay to ensure DOM is settled
				setTimeout(moveToPortal, 10);
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: [
				"style",
				"data-state",
				"data-radix-portal",
				"data-radix-popper-content-wrapper",
			],
		});

		// Also set up interval to catch any missed overlays
		const intervalId = setInterval(moveToPortal, 500);

		return () => {
			observer.disconnect();
			dialogObserver.disconnect();
			clearInterval(intervalId);
		};
	}, []);
}
