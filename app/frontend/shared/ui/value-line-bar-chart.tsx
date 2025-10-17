"use client";

import { cn } from "@shared/libs/utils";
import { Badge } from "@ui/badge";
import { useMotionValueEvent, useSpring } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { JetBrains_Mono } from "next/font/google";
import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ReferenceLine, XAxis } from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";
import { type ChartConfig, ChartContainer } from "@/shared/ui/chart";

const jetBrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

const CHART_MARGIN = 35;
const MONTH_ABBREVIATION_LENGTH = 3;
const TICK_MARGIN = 10;
const BAR_RADIUS = 4;
const RECT_HEIGHT = 18;
const RECT_RX = 4;
const LABEL_Y_OFFSET = -9;
const TEXT_X_OFFSET = 6;
const TEXT_Y_OFFSET = 4;
const CHARACTER_WIDTH = 8;
const CHARACTER_PADDING = 10;
const OPACITY_ACTIVE = 1;
const OPACITY_INACTIVE = 0.2;
const REFERENCE_LINE_OPACITY = 0.4;
const STROKE_DASH_ARRAY = "3 3";
const STROKE_WIDTH = 1;
const SPRING_STIFFNESS = 100;
const SPRING_DAMPING = 20;

const chartData = [
	{ month: "January", desktop: 342 },
	{ month: "February", desktop: 676 },
	{ month: "March", desktop: 512 },
	{ month: "April", desktop: 629 },
	{ month: "May", desktop: 458 },
	{ month: "June", desktop: 781 },
	{ month: "July", desktop: 394 },
	{ month: "August", desktop: 924 },
	{ month: "September", desktop: 647 },
	{ month: "October", desktop: 532 },
	{ month: "November", desktop: 803 },
	{ month: "December", desktop: 271 },
	{ month: "January", desktop: 342 },
	{ month: "February", desktop: 876 },
	{ month: "March", desktop: 512 },
	{ month: "April", desktop: 629 },
];

const chartConfig = {
	desktop: {
		label: "Desktop",
		color: "var(--secondary-foreground)",
	},
} satisfies ChartConfig;

export function ValueLineBarChart() {
	const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

	const maxValueIndex = useMemo(() => {
		// if user is moving mouse over bar then set value to the bar value
		if (
			activeIndex !== undefined &&
			activeIndex >= 0 &&
			activeIndex < chartData.length
		) {
			const data = chartData[activeIndex];
			if (data) {
				return { index: activeIndex, value: data.desktop };
			}
		}
		// if no active index then set value to max value
		return chartData.reduce(
			(max, data, index) =>
				data.desktop > max.value ? { index, value: data.desktop } : max,
			{ index: 0, value: 0 }
		);
	}, [activeIndex]);

	const maxValueIndexSpring = useSpring(maxValueIndex.value, {
		stiffness: SPRING_STIFFNESS,
		damping: SPRING_DAMPING,
	});

	const [springyValue, setSpringyValue] = useState(maxValueIndex.value);

	useMotionValueEvent(maxValueIndexSpring, "change", (latest) => {
		setSpringyValue(Number(latest.toFixed(0)));
	});

	useEffect(() => {
		maxValueIndexSpring.set(maxValueIndex.value);
	}, [maxValueIndex.value, maxValueIndexSpring]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span
						className={cn(jetBrainsMono.className, "text-2xl tracking-tighter")}
					>
						${maxValueIndex.value}
					</span>
					<Badge variant="secondary">
						<TrendingUp className="h-4 w-4" />
						<span>5.2%</span>
					</Badge>
				</CardTitle>
				<CardDescription>vs. last quarter</CardDescription>
			</CardHeader>
			<CardContent>
				<AnimatePresence mode="wait">
					<ChartContainer config={chartConfig}>
						<BarChart
							accessibilityLayer
							data={chartData}
							margin={{
								left: CHART_MARGIN,
							}}
							onMouseLeave={() => setActiveIndex(undefined)}
						>
							<XAxis
								axisLine={false}
								dataKey="month"
								tickFormatter={(value) =>
									value.slice(0, MONTH_ABBREVIATION_LENGTH)
								}
								tickLine={false}
								tickMargin={TICK_MARGIN}
							/>
							<Bar
								dataKey="desktop"
								fill="var(--color-desktop)"
								radius={BAR_RADIUS}
							>
								{chartData.map((item, index) => (
									<Cell
										className="duration-200"
										key={item.month}
										onMouseEnter={() => setActiveIndex(index)}
										opacity={
											index === maxValueIndex.index
												? OPACITY_ACTIVE
												: OPACITY_INACTIVE
										}
									/>
								))}
							</Bar>
							<ReferenceLine
								label={<CustomReferenceLabel value={maxValueIndex.value} />}
								opacity={REFERENCE_LINE_OPACITY}
								stroke="var(--secondary-foreground)"
								strokeDasharray={STROKE_DASH_ARRAY}
								strokeWidth={STROKE_WIDTH}
								y={springyValue}
							/>
						</BarChart>
					</ChartContainer>
				</AnimatePresence>
			</CardContent>
		</Card>
	);
}

type CustomReferenceLabelProps = {
	viewBox?: {
		x?: number;
		y?: number;
	};
	value: number;
};

const CustomReferenceLabel: FC<CustomReferenceLabelProps> = (props) => {
	const { viewBox, value } = props;
	const x = viewBox?.x ?? 0;
	const y = viewBox?.y ?? 0;

	// we need to change width based on value length
	const width = useMemo(
		() => value.toString().length * CHARACTER_WIDTH + CHARACTER_PADDING,
		[value]
	);

	return (
		<>
			<rect
				fill="var(--secondary-foreground)"
				height={RECT_HEIGHT}
				rx={RECT_RX}
				width={width}
				x={x - CHART_MARGIN}
				y={y + LABEL_Y_OFFSET}
			/>
			<text
				fill="var(--primary-foreground)"
				fontWeight={600}
				x={x - CHART_MARGIN + TEXT_X_OFFSET}
				y={y + TEXT_Y_OFFSET}
			>
				{value}
			</text>
		</>
	);
};
