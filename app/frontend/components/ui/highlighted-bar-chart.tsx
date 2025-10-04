"use client";

import { TrendingUp } from "lucide-react";
import React, { useId } from "react";
import { Bar, BarChart, Cell, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
	{ month: "January", desktop: 342 },
	{ month: "February", desktop: 876 },
	{ month: "March", desktop: 512 },
	{ month: "April", desktop: 629 },
	{ month: "May", desktop: 458 },
	{ month: "June", desktop: 781 },
	{ month: "July", desktop: 394 },
	{ month: "August", desktop: 925 },
	{ month: "September", desktop: 647 },
	{ month: "October", desktop: 532 },
	{ month: "November", desktop: 803 },
	{ month: "December", desktop: 271 },
];

const chartConfig = {
	desktop: {
		label: "Desktop",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function HighlightedBarChart() {
	const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
	const patternId = useId();

	const activeData = React.useMemo(() => {
		if (activeIndex === null) return null;
		return chartData[activeIndex];
	}, [activeIndex]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					Bar Chart
					<Badge
						variant="outline"
						className="text-green-500 bg-green-500/10 border-none ml-2"
					>
						<TrendingUp className="h-4 w-4" />
						<span>5.2%</span>
					</Badge>
				</CardTitle>
				<CardDescription>
					{activeData
						? `${activeData.month}: ${activeData.desktop}`
						: "January - June 2025"}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig}>
					<BarChart
						accessibilityLayer
						data={chartData}
						onMouseLeave={() => setActiveIndex(null)}
					>
						<rect
							x="0"
							y="0"
							width="100%"
							height="85%"
							fill={`url(#${patternId})`}
						/>
						<defs>
							<DottedBackgroundPattern id={patternId} />
						</defs>
						<XAxis
							dataKey="month"
							tickLine={false}
							tickMargin={10}
							axisLine={false}
							tickFormatter={(value) => value.slice(0, 3)}
						/>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Bar dataKey="desktop" radius={4} fill="var(--color-desktop)">
							{chartData.map((item, index) => (
								<Cell
									className="duration-200"
									key={`cell-${item.month}`}
									fillOpacity={
										activeIndex === null ? 1 : activeIndex === index ? 1 : 0.3
									}
									stroke={activeIndex === index ? "var(--color-desktop)" : ""}
									onMouseEnter={() => setActiveIndex(index)}
								/>
							))}
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

const DottedBackgroundPattern = ({ id }: { id: string }) => {
	return (
		<pattern
			id={id}
			x="0"
			y="0"
			width="10"
			height="10"
			patternUnits="userSpaceOnUse"
		>
			<circle
				className="dark:text-muted/40 text-muted"
				cx="2"
				cy="2"
				r="1"
				fill="currentColor"
			/>
		</pattern>
	);
};
