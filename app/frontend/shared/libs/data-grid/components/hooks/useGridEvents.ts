import React from "react";

// Hook for keyboard event listener
const useEventListener = (
	eventName: string,
	handler: (event: KeyboardEvent) => void,
	element?: Window | Document | HTMLElement,
	_passive = false,
	capture = false
) => {
	React.useEffect(() => {
		const target: Window | Document | HTMLElement | undefined =
			element || (typeof window !== "undefined" ? window : undefined);
		if (!target || !("addEventListener" in target)) return;

		target.addEventListener(eventName, handler as EventListener, { capture });
		return () =>
			(target as Window | Document | HTMLElement).removeEventListener(eventName, handler as EventListener, {
				capture,
			});
	}, [eventName, handler, element, capture]);
};

export function useGridEvents(setShowSearch: (value: React.SetStateAction<boolean>) => void) {
	// Keyboard shortcut for search (Ctrl+F / Cmd+F)
	useEventListener(
		"keydown",
		React.useCallback(
			(event: KeyboardEvent) => {
				if ((event.ctrlKey || event.metaKey) && event.code === "KeyF") {
					setShowSearch((cv) => !cv);
					event.stopPropagation();
					event.preventDefault();
				}
			},
			[setShowSearch]
		),
		typeof window !== "undefined" ? window : undefined,
		false,
		true
	);
}
