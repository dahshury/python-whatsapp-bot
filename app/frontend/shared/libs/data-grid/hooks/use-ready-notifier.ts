import { useEffect } from "react";

export function useReadyNotifier(
	isDataReady: boolean,
	isInitializing: boolean,
	onReady?: () => void
): void {
	useEffect(() => {
		if (isDataReady && !isInitializing && onReady) {
			onReady();
		}
	}, [isDataReady, isInitializing, onReady]);
}
