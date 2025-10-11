"use client";

import { cn } from "@shared/libs/utils";
import * as React from "react";

interface FitWidthScaleProps {
	className?: string;
	children: React.ReactNode;
	/** Minimum allowed scale when shrinking */
	minScale?: number;
	/** Maximum allowed scale; keep at 1 to avoid upscaling */
	maxScale?: number;
}

/**
 * Scales its child horizontally so that the child's natural width fits within
 * the available container width without overflow. Uses a transform scale so
 * layout around the element remains stable. SSR-safe (initial scale is 1).
 */
export function FitWidthScale({ className = "", children, minScale = 0.7, maxScale = 1 }: FitWidthScaleProps) {
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const contentRef = React.useRef<HTMLDivElement | null>(null);
	const [scale, setScale] = React.useState<number>(1);

	const recompute = React.useCallback(() => {
		try {
			const container = containerRef.current;
			const content = contentRef.current;
			if (!container || !content) return;
			// Measure widths
			const available = container.getBoundingClientRect().width;
			// Temporarily clear transform to read natural width
			const prev = content.style.transform;
			content.style.transform = "";
			const natural = content.getBoundingClientRect().width;
			content.style.transform = prev;
			if (natural <= 0 || available <= 0) return;
			const ratio = available / natural;
			const next = Math.max(minScale, Math.min(maxScale, ratio));
			setScale(next);
		} catch {}
	}, [minScale, maxScale]);

	React.useEffect(() => {
		recompute();
		const onResize = () => recompute();
		const onOrientation = () => recompute();
		window.addEventListener("resize", onResize);
		window.addEventListener("orientationchange", onOrientation);
		let ro: ResizeObserver | null = null;
		try {
			if ("ResizeObserver" in window) {
				ro = new ResizeObserver(() => recompute());
				if (containerRef.current) ro.observe(containerRef.current);
			}
		} catch {}
		return () => {
			window.removeEventListener("resize", onResize);
			window.removeEventListener("orientationchange", onOrientation);
			try {
				ro?.disconnect();
			} catch {}
		};
	}, [recompute]);

	return (
		<div ref={containerRef} className={cn("w-full flex items-center justify-center overflow-visible", className)}>
			<div
				ref={contentRef}
				style={{
					transform: `scale(${scale})`,
					transformOrigin: "center center",
				}}
				className="will-change-transform"
			>
				{children}
			</div>
		</div>
	);
}
