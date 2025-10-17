import { useCallback, useState } from "react";

type UseCalendarDragHandlersProps = {
	closeHoverCardImmediately: () => void;
};

export function useCalendarDragHandlers({
	closeHoverCardImmediately,
}: UseCalendarDragHandlersProps) {
	const [isDragging, setIsDragging] = useState(false);

	// Handle event drag start
	const handleEventDragStart = useCallback(
		(_info: unknown) => {
			// Always allow drag to start and close any open hover card
			setIsDragging(true);
			// Close hover card immediately when dragging starts
			closeHoverCardImmediately();
		},
		[closeHoverCardImmediately]
	);

	// Handle event drag stop
	const handleEventDragStop = useCallback(() => {
		setIsDragging(false);
	}, []);

	return {
		isDragging,
		handleEventDragStart,
		handleEventDragStop,
	};
}
