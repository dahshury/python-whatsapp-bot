import { useEffect } from "react";

export function useFullscreenSync({
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
