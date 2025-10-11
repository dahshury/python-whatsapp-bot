"use client";

import { cn } from "@shared/libs/utils";
import { Badge } from "@ui/badge";
import { useMotionValueEvent, useSpring } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { JetBrains_Mono } from "next/font/google";
import React from "react";
import { Bar, BarChart, Cell, ReferenceLine, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { type ChartConfig, ChartContainer } from "@/shared/ui/chart";

const jetBrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

const CHART_MARGIN = 35;

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
	const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

	const maxValueIndex = React.useMemo(() => {
		// if user is moving mouse over bar then set value to the bar value
		if (activeIndex !== undefined && activeIndex >= 0 && activeIndex < chartData.length) {
			const data = chartData[activeIndex];
			if (data) {
				return { index: activeIndex, value: data.desktop };
			}
		}
		// if no active index then set value to max value
		return chartData.reduce(
			(max, data, index) => {
				return data.desktop > max.value ? { index, value: data.desktop } : max;
			},
			{ index: 0, value: 0 }
		);
	}, [activeIndex]);

	const maxValueIndexSpring = useSpring(maxValueIndex.value, {
		stiffness: 100,
		damping: 20,
	});

	const [springyValue, setSpringyValue] = React.useState(maxValueIndex.value);

	useMotionValueEvent(maxValueIndexSpring, "change", (latest) => {
		setSpringyValue(Number(latest.toFixed(0)));
	});

	React.useEffect(() => {
		maxValueIndexSpring.set(maxValueIndex.value);
	}, [maxValueIndex.value, maxValueIndexSpring]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className={cn(jetBrainsMono.className, "text-2xl tracking-tighter")}>${maxValueIndex.value}</span>
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
							onMouseLeave={() => setActiveIndex(undefined)}
							margin={{
								left: CHART_MARGIN,
							}}
						>
							<XAxis
								dataKey="month"
								tickLine={false}
								tickMargin={10}
								axisLine={false}
								tickFormatter={(value) => value.slice(0, 3)}
							/>
							<Bar dataKey="desktop" fill="var(--color-desktop)" radius={4}>
								{chartData.map((item, index) => (
									<Cell
										className="duration-200"
										opacity={index === maxValueIndex.index ? 1 : 0.2}
										key={item.month}
										onMouseEnter={() => setActiveIndex(index)}
									/>
								))}
							</Bar>
							<ReferenceLine
								opacity={0.4}
								y={springyValue}
								stroke="var(--secondary-foreground)"
								strokeWidth={1}
								strokeDasharray="3 3"
								label={<CustomReferenceLabel value={maxValueIndex.value} />}
							/>
						</BarChart>
					</ChartContainer>
				</AnimatePresence>
			</CardContent>
		</Card>
	);
}

interface CustomReferenceLabelProps {
	viewBox?: {
		x?: number;
		y?: number;
	};
	value: number;
}

const CustomReferenceLabel: React.FC<CustomReferenceLabelProps> = (props) => {
	const { viewBox, value } = props;
	const x = viewBox?.x ?? 0;
	const y = viewBox?.y ?? 0;

	// we need to change width based on value length
	const width = React.useMemo(() => {
		const characterWidth = 8; // Average width of a character in pixels
		const padding = 10;
		return value.toString().length * characterWidth + padding;
	}, [value]);

	return (
		<>
			<rect x={x - CHART_MARGIN} y={y - 9} width={width} height={18} fill="var(--secondary-foreground)" rx={4} />
			<text fontWeight={600} x={x - CHART_MARGIN + 6} y={y + 4} fill="var(--primary-foreground)">
				{value}
			</text>
		</>
	);
};
