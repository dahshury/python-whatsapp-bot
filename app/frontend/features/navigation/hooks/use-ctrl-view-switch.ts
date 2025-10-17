"use client";

import { useEffect, useRef } from "react";

type UseCtrlViewSwitchOptions = {
	onUp: () => void;
	onDown: () => void;
};

// Helper to check if keyboard shortcut should be processed
function shouldProcessShortcut(e: KeyboardEvent): boolean {
	// Must have Ctrl or Cmd modifier
	if (!(e.ctrlKey || e.metaKey)) {
		return false;
	}
	// Must be arrow key
	if (e.key !== "ArrowUp" && e.key !== "ArrowDown") {
		return false;
	}
	// Don't process if in editable element
	if (isEditableElement(document.activeElement)) {
		return false;
	}
	// Don't process if in sidebar
	if (isInSidebar(document.activeElement)) {
		return false;
	}
	// Don't process repeated keys
	if (e.repeat) {
		return false;
	}
	return true;
}

function isEditableElement(element: Element | null): boolean {
	if (!element) {
		return false;
	}
	const tag = element.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
		return true;
	}
	const contentEditable = (element as HTMLElement).isContentEditable;
	if (contentEditable) {
		return true;
	}
	const role = (element as HTMLElement).getAttribute("role");
	return role === "textbox" || role === "combobox";
}

function isInSidebar(element: Element | null): boolean {
	try {
		return !!(
			element && (element as HTMLElement).closest('[data-sidebar="sidebar"]')
		);
	} catch {
		return false;
	}
}

export function useCtrlViewSwitch({ onUp, onDown }: UseCtrlViewSwitchOptions) {
	const upRef = useRef(onUp);
	const downRef = useRef(onDown);

	useEffect(() => {
		upRef.current = onUp;
	}, [onUp]);
	useEffect(() => {
		downRef.current = onDown;
	}, [onDown]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (!shouldProcessShortcut(e)) {
				return;
			}
			e.preventDefault();
			if (e.key === "ArrowUp") {
				upRef.current();
			} else {
				downRef.current();
			}
		};

		window.addEventListener("keydown", onKeyDown, { passive: false });
		return () => {
			window.removeEventListener("keydown", onKeyDown as EventListener);
		};
	}, []);
}
