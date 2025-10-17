"use client";

import { useEffect } from "react";

export function DvhInit() {
	useEffect(() => {
		const setDvh = () => {
			try {
				const vh = Math.max(
					0,
					Math.floor(
						(window?.visualViewport
							? window.visualViewport.height
							: window.innerHeight) || 0
					)
				);
				document.documentElement.style.setProperty("--doc-dvh", `${vh}px`);
			} catch {
				// Silently fail if document manipulation is not available
			}
		};

		setDvh();
		window.addEventListener("resize", setDvh);
		try {
			window.visualViewport?.addEventListener?.("resize", setDvh);
		} catch {
			// visualViewport may not be available in all browsers/contexts
		}
		window.addEventListener("orientationchange", setDvh);
		return () => {
			window.removeEventListener("resize", setDvh);
			try {
				window.visualViewport?.removeEventListener?.("resize", setDvh);
			} catch {
				// visualViewport may not be available in all browsers/contexts
			}
			window.removeEventListener("orientationchange", setDvh);
		};
	}, []);

	return null;
}
