"use client";

import * as React from "react";

interface UseCtrlViewSwitchOptions {
	onUp: () => void;
	onDown: () => void;
}

function isEditableElement(element: Element | null): boolean {
	if (!element) return false;
	const tag = element.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	const contentEditable = (element as HTMLElement).isContentEditable;
	if (contentEditable) return true;
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
	const upRef = React.useRef(onUp);
	const downRef = React.useRef(onDown);

	React.useEffect(() => {
		upRef.current = onUp;
	}, [onUp]);
	React.useEffect(() => {
		downRef.current = onDown;
	}, [onDown]);

	React.useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (!e.ctrlKey && !e.metaKey) return;
			if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
			if (isEditableElement(document.activeElement)) return;
			if (isInSidebar(document.activeElement)) return;
			if (e.repeat) return;
			e.preventDefault();
			if (e.key === "ArrowUp") upRef.current();
			else downRef.current();
		};

		window.addEventListener("keydown", onKeyDown, { passive: false });
		return () => {
			window.removeEventListener("keydown", onKeyDown as EventListener);
		};
	}, []);
}
