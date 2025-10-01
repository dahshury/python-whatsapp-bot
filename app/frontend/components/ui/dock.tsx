"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
	type MotionProps,
	type MotionValue,
	motion,
	useMotionValue,
	useSpring,
	useTransform,
} from "motion/react";
import React, { type PropsWithChildren, useRef } from "react";
import { cn } from "@/lib/utils";

export interface DockProps extends VariantProps<typeof dockVariants> {
	className?: string;
	iconSize?: number;
	iconMagnification?: number;
	iconDistance?: number;
	direction?: "top" | "middle" | "bottom";
	children: React.ReactNode;
}

const DEFAULT_SIZE = 26; // smaller base for mobile; per-icon can override
const DEFAULT_MAGNIFICATION = 40;
const DEFAULT_DISTANCE = 120;

const dockVariants = cva(
	"supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10 mx-auto flex h-auto min-h-[2.25rem] sm:min-h-[2.5rem] w-max items-center justify-center gap-1.5 sm:gap-2 rounded-2xl border px-1.5 py-1.5 sm:p-2 backdrop-blur-md",
);

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
	(
		{
			className,
			children,
			iconSize = DEFAULT_SIZE,
			iconMagnification = DEFAULT_MAGNIFICATION,
			iconDistance = DEFAULT_DISTANCE,
			direction = "middle",
			...props
		},
		ref,
	) => {
		const mouseX = useMotionValue(Number.POSITIVE_INFINITY);

		const renderChildren = () => {
			return React.Children.map(children, (child) => {
				if (
					React.isValidElement<DockIconProps>(child) &&
					child.type === DockIcon
				) {
					// Allow per-icon overrides while providing Dock-level defaults
					return React.cloneElement(child, {
						...child.props,
						mouseX: mouseX,
						size: (child.props as DockIconProps).size ?? iconSize,
						magnification:
							(child.props as DockIconProps).magnification ?? iconMagnification,
						distance: (child.props as DockIconProps).distance ?? iconDistance,
					});
				}
				return child;
			});
		};

		return (
			<motion.div
				ref={ref}
				onMouseMove={(e) => mouseX.set(e.pageX)}
				onMouseLeave={() => mouseX.set(Number.POSITIVE_INFINITY)}
				{...props}
				className={cn(dockVariants({ className }), {
					"items-start": direction === "top",
					"items-center": direction === "middle",
					"items-end": direction === "bottom",
				})}
			>
				{renderChildren()}
			</motion.div>
		);
	},
);

Dock.displayName = "Dock";

export interface DockIconProps
	extends Omit<MotionProps & React.HTMLAttributes<HTMLDivElement>, "children"> {
	size?: number;
	magnification?: number;
	distance?: number;
	mouseX?: MotionValue<number>;
	className?: string;
	children?: React.ReactNode;
	props?: PropsWithChildren;
	widthScale?: number;
	paddingPx?: number;
}

const DockIcon = ({
	size = DEFAULT_SIZE,
	magnification = DEFAULT_MAGNIFICATION,
	distance = DEFAULT_DISTANCE,
	mouseX,
	className,
	children,
	widthScale = 1,
	paddingPx,
	...props
}: DockIconProps) => {
	const ref = useRef<HTMLDivElement>(null);
	const padding = paddingPx ?? Math.max(6, size * 0.2);
	const defaultMouseX = useMotionValue(Number.POSITIVE_INFINITY);

	const distanceCalc = useTransform(mouseX ?? defaultMouseX, (val: number) => {
		const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
		return val - bounds.x - bounds.width / 2;
	});

	const sizeTransform = useTransform(
		distanceCalc,
		[-distance, 0, distance],
		[size, magnification, size],
	);

	// Allow rectangular width while keeping height controlled by sizeTransform
	const widthTransform = useTransform(
		distanceCalc,
		[-distance, 0, distance],
		[size * widthScale, magnification * widthScale, size * widthScale],
	);

	const scaleSize = useSpring(sizeTransform, {
		mass: 0.1,
		stiffness: 150,
		damping: 12,
	});

	const scaleWidth = useSpring(widthTransform, {
		mass: 0.1,
		stiffness: 150,
		damping: 12,
	});

	return (
		<motion.div
			ref={ref}
			style={{ width: scaleWidth, height: scaleSize, padding }}
			className={cn(
				"flex cursor-pointer items-center justify-center rounded-full relative",
				widthScale === 1 ? "aspect-square" : "",
				className,
			)}
			{...props}
		>
			{children}
		</motion.div>
	);
};

DockIcon.displayName = "DockIcon";

export { Dock, DockIcon, dockVariants };
