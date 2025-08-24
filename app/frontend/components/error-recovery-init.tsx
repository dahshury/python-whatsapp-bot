"use client";

import { useEffect } from "react";
import "@/lib/error-recovery"; // This will auto-setup error handling

export function ErrorRecoveryInit() {
	useEffect(() => {
		// Additional client-side initialization if needed
		if (process.env.NODE_ENV === "development") {
			// Error recovery system initialized

			// Add global keyboard shortcut for manual recovery (Ctrl+Shift+R)
			const handleKeydown = async (event: KeyboardEvent) => {
				if (event.ctrlKey && event.shiftKey && event.key === "R") {
					event.preventDefault();
					try {
						const { ErrorRecovery } = await import("@/lib/error-recovery");
						ErrorRecovery.forceRecovery();
					} catch (error) {
						console.error("Failed to load error recovery:", error);
					}
				}
			};

			window.addEventListener("keydown", handleKeydown);
			return () => window.removeEventListener("keydown", handleKeydown);
		}
	}, []);

	return null; // This component doesn't render anything
}
