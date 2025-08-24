"use client";

import type React from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

interface GridPortalContextType {
	portalContainer: HTMLElement | null;
}

const GridPortalContext = createContext<GridPortalContextType>({
	portalContainer: null,
});

export const useGridPortal = () => {
	const context = useContext(GridPortalContext);
	// Fallback to document.body if no portal container is provided
	return (
		context.portalContainer ||
		(typeof document !== "undefined" ? document.body : null)
	);
};

interface GridPortalProviderProps {
	children: React.ReactNode;
	container?: HTMLElement | null;
}

export function GridPortalProvider({
	children,
	container,
}: GridPortalProviderProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null,
	);

	useEffect(() => {
		// Use provided container or fallback to our own
		if (container) {
			setPortalContainer(container);
		} else if (containerRef.current) {
			setPortalContainer(containerRef.current);
		}
	}, [container]);

	return (
		<GridPortalContext.Provider value={{ portalContainer }}>
			{children}
			{!container && (
				<div
					ref={containerRef}
					className="grid-portal-container"
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						pointerEvents: "auto",
						zIndex: "inherit",
					}}
				/>
			)}
		</GridPortalContext.Provider>
	);
}
