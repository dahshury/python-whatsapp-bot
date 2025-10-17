"use client";

import { cn } from "@shared/libs/utils";
import { motion } from "framer-motion";
import { memo, useId, useMemo } from "react";

type GridPatternProps = {
	className?: string;
	width?: number;
	height?: number;
	x?: number;
	y?: number;
	strokeDasharray?: number | string;
};

function GridPattern({
	className,
	width = 40,
	height = 40,
	x = -1,
	y = -1,
	strokeDasharray = 0,
}: GridPatternProps) {
	const patternId = useId();
	const dash =
		typeof strokeDasharray === "number"
			? `${strokeDasharray}`
			: strokeDasharray;
	return (
		<svg
			aria-hidden
			className={cn("h-full w-full", className)}
			height="100%"
			width="100%"
		>
			<title>Decorative grid pattern background</title>
			<defs>
				<pattern
					height={height}
					id={patternId}
					patternUnits="userSpaceOnUse"
					width={width}
					x={x}
					y={y}
				>
					<path
						d={`M ${width} 0 L 0 0 0 ${height}`}
						fill="none"
						opacity="0.25"
						stroke="currentColor"
						strokeDasharray={dash}
						strokeWidth="1"
					/>
				</pattern>
			</defs>
			<rect fill={`url(#${patternId})`} height="100%" width="100%" />
		</svg>
	);
}

interface AnimatedGridPatternProps extends GridPatternProps {
	numSquares?: number;
	maxOpacity?: number;
	duration?: number;
	repeatDelay?: number;
}

const MAX_GRID_SQUARES = 800;
const GRID_PERCENT_RANGE = 100;

function AnimatedGridPatternComponent({
	className,
	width = 40,
	height = 40,
	x = -1,
	y = -1,
	strokeDasharray = 0,
	numSquares = 200,
	maxOpacity = 0.5,
	duration = 1,
	repeatDelay = 0.5,
}: AnimatedGridPatternProps) {
	const squares = useMemo(() => {
		const items: Array<{ key: number; x: number; y: number; delay: number }> =
			[];
		const count = Math.max(0, Math.min(numSquares, MAX_GRID_SQUARES));
		for (let i = 0; i < count; i++) {
			items.push({
				key: i,
				x: Math.random() * GRID_PERCENT_RANGE,
				y: Math.random() * GRID_PERCENT_RANGE,
				delay: Math.random() * duration,
			});
		}
		return items;
	}, [numSquares, duration]);

	return (
		<div
			className={cn(
				"relative h-full w-full text-muted-foreground/50",
				className
			)}
		>
			<GridPattern
				className="absolute inset-0"
				height={height}
				strokeDasharray={strokeDasharray}
				width={width}
				x={x}
				y={y}
			/>
			<svg
				aria-hidden
				className="absolute inset-0 h-full w-full"
				height="100%"
				width="100%"
			>
				<title>Animated grid pattern overlay</title>
				{squares.map((s) => (
					<motion.rect
						animate={{ opacity: [0, maxOpacity, 0] }}
						fill="currentColor"
						height={2}
						initial={{ opacity: 0 }}
						key={s.key}
						rx={1}
						ry={1}
						transition={{
							duration,
							repeat: Number.POSITIVE_INFINITY,
							repeatDelay,
							delay: s.delay,
							ease: "easeInOut",
						}}
						width={2}
						x={`${s.x}%`}
						y={`${s.y}%`}
					/>
				))}
			</svg>
		</div>
	);
}

export const AnimatedGridPattern = memo(AnimatedGridPatternComponent);

export type { AnimatedGridPatternProps };
