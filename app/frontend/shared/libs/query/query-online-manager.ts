import { onlineManager } from "@tanstack/react-query";

export function bindOnlineManager(getIsOnline: () => boolean): void {
	// Reflect app connectivity (e.g., WebSocket) into React Query's online state
	// We set an event listener hook to keep it updated
	const update = () => onlineManager.setOnline(getIsOnline());
	update();
	if (typeof window !== "undefined") {
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
	}
}
