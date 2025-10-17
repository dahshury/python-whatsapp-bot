import { useCallback, useEffect, useRef, useState } from "react";

type OfflineOverlayState = {
	showOffline: boolean;
	isRetrying: boolean;
	handleRetry: () => void;
};

type MaybeWS = {
	isConnected?: boolean;
	connect?: () => void;
	conversations?: unknown;
	reservations?: unknown;
	vacations?: unknown;
};

const OFFLINE_THRESHOLD_WITH_DATA_MS = 6000; // 6 seconds threshold when data exists
const OFFLINE_THRESHOLD_NO_DATA_MS = 2000; // 2 seconds threshold when no data
const RETRY_TIMEOUT_MS = 2500; // Retry state reset timeout

export function useOfflineOverlay(
	ws: MaybeWS | null | undefined
): OfflineOverlayState {
	const [showOffline, setShowOffline] = useState<boolean>(false);
	const [isRetrying, setIsRetrying] = useState<boolean>(false);
	const disconnectedSinceRef = useRef<number | null>(null);
	const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
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
				// Data check failed; assume no data
				return false;
			}
		})();

		const isConnecting = (() => {
			try {
				const ref = (globalThis as { __wsConnection?: { current?: WebSocket } })
					.__wsConnection;
				return ref?.current?.readyState === WebSocket.CONNECTING;
			} catch {
				// Connection check failed; assume not connecting
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
		const thresholdMs = hasAnyData
			? OFFLINE_THRESHOLD_WITH_DATA_MS
			: OFFLINE_THRESHOLD_NO_DATA_MS;
		const t = setTimeout(
			() => {
				const stillDisconnected = !(ws as MaybeWS)?.isConnected;
				if (stillDisconnected) {
					setShowOffline(true);
				}
			},
			Math.max(0, thresholdMs - elapsed)
		);
		return () => clearTimeout(t);
	}, [ws]);

	const handleRetry = useCallback(() => {
		if (isRetrying) {
			return;
		}
		setIsRetrying(true);
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}
		try {
			(ws as MaybeWS)?.connect?.();
		} catch {
			// Connection attempt failed; will retry after timeout
		}
		retryTimeoutRef.current = setTimeout(() => {
			setIsRetrying(false);
			retryTimeoutRef.current = null;
		}, RETRY_TIMEOUT_MS);
	}, [ws, isRetrying]);

	useEffect(() => {
		if (isRetrying && (ws as MaybeWS)?.isConnected) {
			setIsRetrying(false);
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}
		}
	}, [isRetrying, ws]);

	useEffect(
		() => () => {
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}
		},
		[]
	);

	return { showOffline, isRetrying, handleRetry };
}
