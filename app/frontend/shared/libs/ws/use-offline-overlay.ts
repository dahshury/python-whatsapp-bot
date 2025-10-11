import * as React from "react";

interface OfflineOverlayState {
	showOffline: boolean;
	isRetrying: boolean;
	handleRetry: () => void;
}

type MaybeWS = {
	isConnected?: boolean;
	connect?: () => void;
	conversations?: unknown;
	reservations?: unknown;
	vacations?: unknown;
};

export function useOfflineOverlay(ws: MaybeWS | null | undefined): OfflineOverlayState {
	const [showOffline, setShowOffline] = React.useState<boolean>(false);
	const [isRetrying, setIsRetrying] = React.useState<boolean>(false);
	const disconnectedSinceRef = React.useRef<number | null>(null);
	const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

	React.useEffect(() => {
		const hasAnyData = (() => {
			try {
				const resv = (ws as MaybeWS)?.reservations || {};
				const conv = (ws as MaybeWS)?.conversations || {};
				const vac = (ws as MaybeWS)?.vacations || [];
				return (
					Object.keys(resv as Record<string, unknown>).length > 0 ||
					Object.keys(conv as Record<string, unknown>).length > 0 ||
					(Array.isArray(vac) ? (vac as unknown[]).length : 0) > 0
				);
			} catch {
				return false;
			}
		})();

		const isConnecting = (() => {
			try {
				const ref = (globalThis as { __wsConnection?: { current?: WebSocket } }).__wsConnection;
				return ref?.current?.readyState === WebSocket.CONNECTING;
			} catch {
				return false;
			}
		})();

		if ((ws as MaybeWS)?.isConnected || isConnecting) {
			disconnectedSinceRef.current = null;
			setShowOffline(false);
			return;
		}

		if (disconnectedSinceRef.current == null) {
			disconnectedSinceRef.current = Date.now();
		}
		const elapsed = Date.now() - (disconnectedSinceRef.current || Date.now());
		const thresholdMs = hasAnyData ? 6000 : 2000;
		const t = setTimeout(
			() => {
				const stillDisconnected = !(ws as MaybeWS)?.isConnected;
				if (stillDisconnected) setShowOffline(true);
			},
			Math.max(0, thresholdMs - elapsed)
		);
		return () => clearTimeout(t);
	}, [ws]);

	const handleRetry = React.useCallback(() => {
		if (isRetrying) return;
		setIsRetrying(true);
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}
		try {
			(ws as MaybeWS)?.connect?.();
		} catch {}
		retryTimeoutRef.current = setTimeout(() => {
			setIsRetrying(false);
			retryTimeoutRef.current = null;
		}, 2500);
	}, [ws, isRetrying]);

	React.useEffect(() => {
		if (isRetrying && (ws as MaybeWS)?.isConnected) {
			setIsRetrying(false);
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}
		}
	}, [isRetrying, ws]);

	React.useEffect(() => {
		return () => {
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}
		};
	}, []);

	return { showOffline, isRetrying, handleRetry };
}
