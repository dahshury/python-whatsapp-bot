import { useEffect } from "react";

export function useFullscreenSyncLegacy({
	isFullscreen,
	setIsFullscreen,
}: {
	isFullscreen: boolean;
	setIsFullscreen: (v: boolean) => void;
}) {
	useEffect(() => {
		setIsFullscreen(isFullscreen);
	}, [isFullscreen, setIsFullscreen]);
}
