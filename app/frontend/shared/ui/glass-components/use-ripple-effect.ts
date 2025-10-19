"use client";

import { useCallback, useRef, useState } from "react";

const RIPPLE_FAR_STOP_PERCENT = 50; // End of visible ripple gradient stop

const RIPPLE_OPACITY_SCALE = 100;

type RippleState = {
	x: number;
	y: number;
	size: number;
	opacity: number;
};

type UseRippleEffectOptions = {
	/** Opacity of the ripple effect (0-1). Default: 0.1 (10%) */
	rippleOpacity?: number;
	/** Transition duration in ms. Default: 300 */
	transitionDuration?: number;
};

/**
 * Custom hook for creating a mouse-tracking ripple effect on buttons.
 *
 * The ripple effect follows the mouse cursor with a radial gradient
 * that fades from the center outward, creating a subtle highlight effect.
 *
 * @example
 * ```tsx
 * const { rippleHandlers, rippleStyle, rippleContainerStyle } = useRippleEffect();
 *
 * <button {...rippleHandlers}>
 *   <span style={rippleContainerStyle}>
 *     <span style={rippleStyle} />
 *   </span>
 * </button>
 * ```
 */
export function useRippleEffect(options: UseRippleEffectOptions = {}) {
	const { rippleOpacity = 0.1, transitionDuration = 300 } = options;

	const [ripple, setRipple] = useState<RippleState>({
		x: 0,
		y: 0,
		size: 0,
		opacity: 0,
	});

	const elementRef = useRef<HTMLElement | null>(null);

	const handleMouseMove = useCallback(
		(event: React.MouseEvent<HTMLElement>) => {
			const element = event.currentTarget;
			elementRef.current = element;
			const rect = element.getBoundingClientRect();

			// Calculate position relative to element
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;

			// Calculate size based on distance to furthest corner
			const maxDistanceX = Math.max(x, rect.width - x);
			const maxDistanceY = Math.max(y, rect.height - y);
			const size = Math.sqrt(maxDistanceX ** 2 + maxDistanceY ** 2) * 2;

			setRipple({ x, y, size, opacity: rippleOpacity });
		},
		[rippleOpacity]
	);

	const handleMouseEnter = useCallback(
		(event: React.MouseEvent<HTMLElement>) => {
			const element = event.currentTarget;
			elementRef.current = element;
			const rect = element.getBoundingClientRect();

			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;

			const maxDistanceX = Math.max(x, rect.width - x);
			const maxDistanceY = Math.max(y, rect.height - y);
			const size = Math.sqrt(maxDistanceX ** 2 + maxDistanceY ** 2) * 2;

			setRipple({ x, y, size, opacity: rippleOpacity });
		},
		[rippleOpacity]
	);

	const handleMouseLeave = useCallback(() => {
		setRipple((prev) => ({ ...prev, opacity: 0 }));
		elementRef.current = null;
	}, []);

	// Styles for the ripple container (wraps the ripple circle)
	const rippleContainerStyle: React.CSSProperties = {
		position: "absolute",
		inset: "0px",
		transitionDuration: `${transitionDuration}ms`,
		opacity: ripple.opacity,
		overflow: "hidden",
		pointerEvents: "none",
		borderRadius: "inherit",
	};

	// Styles for the ripple circle itself
	const rippleStyle: React.CSSProperties = {
		position: "absolute",
		zIndex: 10,
		width: `${ripple.size}px`,
		height: `${ripple.size}px`,
		left: `${ripple.x - ripple.size / 2}px`,
		top: `${ripple.y - ripple.size / 2}px`,
		borderRadius: "50%",
		backgroundImage: `radial-gradient(circle, color-mix(in oklab, rgb(255, 255, 255) ${rippleOpacity * RIPPLE_OPACITY_SCALE}%, transparent), transparent ${RIPPLE_FAR_STOP_PERCENT}%)`,
		pointerEvents: "none",
		transform: "translate3d(0, 0, 0)", // Hardware acceleration
	};

	const rippleHandlers = {
		onMouseMove: handleMouseMove,
		onMouseEnter: handleMouseEnter,
		onMouseLeave: handleMouseLeave,
	};

	return {
		rippleHandlers,
		rippleStyle,
		rippleContainerStyle,
		hasRipple: ripple.opacity > 0,
	};
}
