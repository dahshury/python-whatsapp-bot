"use client";

import { cn } from "@shared/libs/utils";
import { animate } from "motion/react";
import type React from "react";
import { memo, useCallback, useEffect, useRef } from "react";

export type GlowingEffectProps = {
	children?: React.ReactNode;
	blur?: number;
	inactiveZone?: number;
	proximity?: number;
	spread?: number;
	variant?: "default" | "white";
	glow?: boolean;
	className?: string;
	movementDuration?: number;
	borderWidth?: number;
	disabled?: boolean;
};

// Animation ease curve values for smooth motion
const EASE_CURVE_START = 0.16;
const EASE_CURVE_MID = 1;
const EASE_CURVE_CONTROL = 0.3;

// Mathematical conversion factor from radians to degrees
const RADIANS_TO_DEGREES_FACTOR = 180;

const CALCULATION_CONSTANTS = {
	CENTER_RATIO: 0.5,
	ANGLE_CONVERSION_RADIAN_TO_DEGREES: RADIANS_TO_DEGREES_FACTOR / Math.PI,
	ANGLE_OFFSET: 90,
	ANGLE_CYCLE: 360,
	ANGLE_HALF_CYCLE: 180,
	ACTIVE_STATE_ENABLED: "1",
	ACTIVE_STATE_DISABLED: "0",
	INACTIVE_ZONE_DEFAULT: 0.15,
	PROXIMITY_DEFAULT: 50,
	MOVEMENT_DURATION_DEFAULT: 300,
	ANIMATION_EASE_VALUES: [
		EASE_CURVE_START,
		EASE_CURVE_MID,
		EASE_CURVE_CONTROL,
		EASE_CURVE_MID,
	] as const,
} as const;

type GlowPositionConfig = {
	element: HTMLDivElement;
	e: MouseEvent | { x: number; y: number } | undefined;
	lastPosition: React.MutableRefObject<{ x: number; y: number }>;
	inactiveZone: number;
	proximity: number;
	movementDuration: number;
};

const updateGlowPosition = ({
	element,
	e,
	lastPosition,
	inactiveZone,
	proximity,
	movementDuration,
}: GlowPositionConfig) => {
	if (!element) {
		return;
	}

	const { left, top, width, height } = element.getBoundingClientRect();
	const mouseX = e?.x ?? lastPosition.current.x;
	const mouseY = e?.y ?? lastPosition.current.y;

	if (e) {
		lastPosition.current = { x: mouseX, y: mouseY };
	}

	const center = [
		left + width * CALCULATION_CONSTANTS.CENTER_RATIO,
		top + height * CALCULATION_CONSTANTS.CENTER_RATIO,
	];
	const distanceFromCenter = Math.hypot(
		mouseX - (center[0] ?? 0),
		mouseY - (center[1] ?? 0)
	);
	const inactiveRadius =
		CALCULATION_CONSTANTS.CENTER_RATIO * Math.min(width, height) * inactiveZone;

	if (distanceFromCenter < inactiveRadius) {
		element.style.setProperty(
			"--active",
			CALCULATION_CONSTANTS.ACTIVE_STATE_DISABLED
		);
		return;
	}

	const isActive =
		mouseX > left - proximity &&
		mouseX < left + width + proximity &&
		mouseY > top - proximity &&
		mouseY < top + height + proximity;

	element.style.setProperty(
		"--active",
		isActive
			? CALCULATION_CONSTANTS.ACTIVE_STATE_ENABLED
			: CALCULATION_CONSTANTS.ACTIVE_STATE_DISABLED
	);

	if (!isActive) {
		return;
	}

	const currentAngle =
		Number.parseFloat(element.style.getPropertyValue("--start")) || 0;
	const targetAngle =
		(CALCULATION_CONSTANTS.ANGLE_CONVERSION_RADIAN_TO_DEGREES *
			Math.atan2(mouseY - (center[1] ?? 0), mouseX - (center[0] ?? 0))) /
			Math.PI +
		CALCULATION_CONSTANTS.ANGLE_OFFSET;

	const angleDiff =
		((targetAngle - currentAngle + CALCULATION_CONSTANTS.ANGLE_HALF_CYCLE) %
			CALCULATION_CONSTANTS.ANGLE_CYCLE) -
		CALCULATION_CONSTANTS.ANGLE_HALF_CYCLE;
	const newAngle = currentAngle + angleDiff;

	animate(currentAngle, newAngle, {
		duration: movementDuration,
		ease: CALCULATION_CONSTANTS.ANIMATION_EASE_VALUES,
		onUpdate: (value) => {
			element.style.setProperty("--start", String(value));
		},
	});
};

const GlowingEffect = memo(
	({
		blur = 0,
		inactiveZone = 0.7,
		proximity = 0,
		spread = 20,
		variant = "default",
		glow = false,
		className,
		movementDuration = 2,
		borderWidth = 1,
		disabled = true,
	}: GlowingEffectProps) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const lastPosition = useRef({ x: 0, y: 0 });
		const animationFrameRef = useRef<number>(0);

		const handleMove = useCallback(
			(e?: MouseEvent | { x: number; y: number }) => {
				if (!containerRef.current) {
					return;
				}

				if (animationFrameRef.current) {
					cancelAnimationFrame(animationFrameRef.current);
				}

				animationFrameRef.current = requestAnimationFrame(() => {
					const element = containerRef.current;
					if (!element) {
						return;
					}
					updateGlowPosition({
						element,
						e,
						lastPosition,
						inactiveZone,
						proximity,
						movementDuration,
					});
				});
			},
			[inactiveZone, proximity, movementDuration]
		);

		useEffect(() => {
			if (disabled) {
				return;
			}

			const handleScroll = () => handleMove();
			const handlePointerMove = (e: PointerEvent) => handleMove(e);

			window.addEventListener("scroll", handleScroll, { passive: true });
			document.body.addEventListener("pointermove", handlePointerMove, {
				passive: true,
			});

			return () => {
				if (animationFrameRef.current) {
					cancelAnimationFrame(animationFrameRef.current);
				}
				window.removeEventListener("scroll", handleScroll);
				document.body.removeEventListener("pointermove", handlePointerMove);
			};
		}, [handleMove, disabled]);

		return (
			<>
				<div
					className={cn(
						"-inset-px pointer-events-none absolute hidden rounded-[inherit] border opacity-0 transition-opacity",
						glow && "opacity-100",
						variant === "white" && "border-white",
						disabled && "!block"
					)}
				/>
				<div
					className={cn(
						"pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
						glow && "opacity-100",
						blur > 0 && "blur-[var(--blur)]",
						className,
						disabled && "!hidden"
					)}
					ref={containerRef}
					style={
						{
							"--blur": `${blur}px`,
							"--spread": spread,
							"--start": "0",
							"--active": "0",
							"--glowingeffect-border-width": `${borderWidth}px`,
							"--repeating-conic-gradient-times": "5",
							"--gradient":
								variant === "white"
									? `repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  var(--black),
                  var(--black) calc(25% / var(--repeating-conic-gradient-times))
                )`
									: `radial-gradient(circle, #dd7bbb 10%, #dd7bbb00 20%),
                radial-gradient(circle at 40% 40%, #d79f1e 5%, #d79f1e00 15%),
                radial-gradient(circle at 60% 60%, #5a922c 10%, #5a922c00 20%), 
                radial-gradient(circle at 40% 60%, #4c7894 10%, #4c789400 20%),
                repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  #dd7bbb 0%,
                  #d79f1e calc(25% / var(--repeating-conic-gradient-times)),
                  #5a922c calc(50% / var(--repeating-conic-gradient-times)), 
                  #4c7894 calc(75% / var(--repeating-conic-gradient-times)),
                  #dd7bbb calc(100% / var(--repeating-conic-gradient-times))
                )`,
						} as React.CSSProperties
					}
				>
					<div
						className={cn(
							"glow",
							"rounded-[inherit]",
							'after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))] after:rounded-[inherit] after:content-[""]',
							"after:[border:var(--glowingeffect-border-width)_solid_transparent]",
							"after:[background-attachment:fixed] after:[background:var(--gradient)]",
							"after:opacity-[var(--active)] after:transition-opacity after:duration-300",
							"after:[mask-clip:padding-box,border-box]",
							"after:[mask-composite:intersect]",
							"after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]"
						)}
					/>
				</div>
			</>
		);
	}
);

GlowingEffect.displayName = "GlowingEffect";

export { GlowingEffect };
