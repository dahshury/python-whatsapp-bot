"use client";
import { useWebSocketData } from "@shared/libs/ws/use-websocket-data";
import { BackendConnectionOverlay } from "@shared/ui/backend-connection-overlay";

export function BackendConnectionOverlayBridge() {
	const ws = useWebSocketData({ enableNotifications: false });
	const isRetrying = Boolean(
		(ws as { isReconnecting?: boolean })?.isReconnecting
	);
	const showOffline = !(ws as { isConnected?: boolean })?.isConnected;
	const handleRetry = () => {
		try {
			(ws as { connect?: () => void })?.connect?.();
		} catch {
			// ignore
		}
	};
	if (!showOffline) {
		return null;
	}
	return (
		<BackendConnectionOverlay isRetrying={isRetrying} onRetry={handleRetry} />
	);
}
