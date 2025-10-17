"use client";

import { cn } from "@shared/libs/utils";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type FitWidthScaleProps = {
	className?: string;
	children: ReactNode;
	/** Minimum allowed scale when shrinking */
	minScale?: number;
	/** Maximum allowed scale; keep at 1 to avoid upscaling */
	maxScale?: number;
};

/**
 * Scales its child horizontally so that the child's natural width fits within
 * the available container width without overflow. Uses a transform scale so
 * layout around the element remains stable. SSR-safe (initial scale is 1).
 */
export function FitWidthScale({
	className = "",
	children,
	minScale = 0.7,
	maxScale = 1,
}: FitWidthScaleProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const contentRef = useRef<HTMLDivElement | null>(null);
	const [scale, setScale] = useState<number>(1);

	const recompute = useCallback(() => {
		try {
			const container = containerRef.current;
			const content = contentRef.current;
			if (!(container && content)) {
				return;
			}
			// Measure widths
			const available = container.getBoundingClientRect().width;
			// Temporarily clear transform to read natural width
			const prev = content.style.transform;
			content.style.transform = "";
			const natural = content.getBoundingClientRect().width;
			content.style.transform = prev;
			if (natural <= 0 || available <= 0) {
				return;
			}
			const ratio = available / natural;
			const next = Math.max(minScale, Math.min(maxScale, ratio));
			setScale(next);
		} catch {
			// Silently fail if DOM measurement fails
		}
	}, [minScale, maxScale]);

	useEffect(() => {
		recompute();
		const onResize = () => recompute();
		const onOrientation = () => recompute();
		window.addEventListener("resize", onResize);
		window.addEventListener("orientationchange", onOrientation);
		let ro: ResizeObserver | null = null;
		try {
			if ("ResizeObserver" in window) {
				ro = new ResizeObserver(() => recompute());
				if (containerRef.current) {
					ro.observe(containerRef.current);
				}
			}
		} catch {
			// ResizeObserver not available in this environment
		}
		return () => {
			window.removeEventListener("resize", onResize);
			window.removeEventListener("orientationchange", onOrientation);
			try {
				ro?.disconnect();
			} catch {
				// Silently fail if observer cleanup fails
			}
		};
	}, [recompute]);

	return (
		<div
			className={cn(
				"flex w-full items-center justify-center overflow-visible",
				className
			)}
			ref={containerRef}
		>
			<div
				className="will-change-transform"
				ref={contentRef}
				style={{
					transform: `scale(${scale})`,
					transformOrigin: "center center",
				}}
			>
				{children}
			</div>
		</div>
	);
}
