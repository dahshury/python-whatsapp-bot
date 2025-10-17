"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useFullscreenContainer() {
	const fsContainerRef = useRef<HTMLDivElement | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	useEffect(() => {
		const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
		document.addEventListener("fullscreenchange", onFs);
		return () => document.removeEventListener("fullscreenchange", onFs);
	}, []);

	const enterFullscreen = useCallback(() => {
		try {
			const el = fsContainerRef.current;
			if (!el) {
				return;
			}
			if (document.fullscreenElement) {
				return;
			}
			el.requestFullscreen?.();
		} catch {
			// Intentional: fullscreen request may fail due to user interaction or browser policy
		}
	}, []);

	const exitFullscreen = useCallback(() => {
		try {
			if (!document.fullscreenElement) {
				return;
			}
			document.exitFullscreen?.();
		} catch {
			// Intentional: exit fullscreen may fail in some browser contexts
		}
	}, []);

	return {
		fsContainerRef,
		isFullscreen,
		enterFullscreen,
		exitFullscreen,
	} as const;
}
