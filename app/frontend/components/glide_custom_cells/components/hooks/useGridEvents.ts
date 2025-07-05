import React from "react";

// Hook for keyboard event listener
const useEventListener = (
	eventName: string,
	handler: (event: any) => void,
	element = window,
	_passive = false,
	capture = false,
) => {
	React.useEffect(() => {
		if (!element?.addEventListener) return;

		element.addEventListener(eventName, handler, { capture });
		return () => element.removeEventListener(eventName, handler, { capture });
	}, [eventName, handler, element, capture]);
};

export function useGridEvents(
	setShowSearch: (value: React.SetStateAction<boolean>) => void,
) {
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
			[setShowSearch],
		),
		window,
		false,
		true,
	);
}
