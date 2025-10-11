"use client";

import { cn } from "@shared/libs/utils";
import { motion } from "framer-motion";
import { memo, useId, useMemo } from "react";

interface GridPatternProps {
	className?: string;
	width?: number;
	height?: number;
	x?: number;
	y?: number;
	strokeDasharray?: number | string;
}

function GridPattern({ className, width = 40, height = 40, x = -1, y = -1, strokeDasharray = 0 }: GridPatternProps) {
	const patternId = useId();
	const dash = typeof strokeDasharray === "number" ? `${strokeDasharray}` : strokeDasharray;
	return (
		<svg aria-hidden className={cn("h-full w-full", className)} width="100%" height="100%">
			<title>Decorative grid pattern background</title>
			<defs>
				<pattern id={patternId} x={x} y={y} width={width} height={height} patternUnits="userSpaceOnUse">
					<path
						d={`M ${width} 0 L 0 0 0 ${height}`}
						fill="none"
						stroke="currentColor"
						strokeWidth="1"
						strokeDasharray={dash}
						opacity="0.25"
					/>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill={`url(#${patternId})`} />
		</svg>
	);
}

interface AnimatedGridPatternProps extends GridPatternProps {
	numSquares?: number;
	maxOpacity?: number;
	duration?: number;
	repeatDelay?: number;
}

export const AnimatedGridPattern = memo(function AnimatedGridPattern({
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
		const items: Array<{ key: number; x: number; y: number; delay: number }> = [];
		const count = Math.max(0, Math.min(numSquares, 800));
		for (let i = 0; i < count; i++) {
			items.push({
				key: i,
				x: Math.random() * 100,
				y: Math.random() * 100,
				delay: Math.random() * duration,
			});
		}
		return items;
	}, [numSquares, duration]);

	return (
		<div className={cn("relative h-full w-full text-muted-foreground/50", className)}>
			<GridPattern
				width={width}
				height={height}
				x={x}
				y={y}
				strokeDasharray={strokeDasharray}
				className="absolute inset-0"
			/>
			<svg className="absolute inset-0 h-full w-full" width="100%" height="100%" aria-hidden>
				<title>Animated grid pattern overlay</title>
				{squares.map((s) => (
					<motion.rect
						key={s.key}
						x={`${s.x}%`}
						y={`${s.y}%`}
						width={2}
						height={2}
						rx={1}
						ry={1}
						fill="currentColor"
						initial={{ opacity: 0 }}
						animate={{ opacity: [0, maxOpacity, 0] }}
						transition={{
							duration,
							repeat: Number.POSITIVE_INFINITY,
							repeatDelay,
							delay: s.delay,
							ease: "easeInOut",
						}}
					/>
				))}
			</svg>
		</div>
	);
});

export type { AnimatedGridPatternProps };
