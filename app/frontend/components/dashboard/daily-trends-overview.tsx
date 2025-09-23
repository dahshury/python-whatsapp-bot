"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { i18n } from "@/lib/i18n";
import type { DailyData } from "@/types/dashboard";

interface DailyTrendsOverviewProps {
	dailyTrends: DailyData[];
	isLocalized: boolean;
}

// Theme tokens (stable strings so we don't re-read computed styles every render)
const COLORS = {
	reservations: "hsl(var(--chart-1))",
	cancellations: "hsl(var(--chart-2))",
	modifications: "hsl(var(--chart-3))",
	border: "hsl(var(--border))",
	foreground: "hsl(var(--foreground))",
	card: "hsl(var(--card))",
} as const;

export function DailyTrendsOverview({
	dailyTrends,
	isLocalized,
}: DailyTrendsOverviewProps) {
	// Stable instance id for gradient defs
	const instanceId = React.useMemo(
		() => Math.random().toString(36).slice(2),
		[],
	);
	const fillResId = `fillRes_${instanceId}`;
	const fillCanId = `fillCan_${instanceId}`;
	const fillModId = `fillMod_${instanceId}`;

	// Map incoming data once; rely only on parent global filtering
	const chartData = React.useMemo(() => {
		return (dailyTrends || []).map((d) => {
			const dateObj = new Date(d.date);
			// Short localized label like Jan 05 / يناير 05
			const label = dateObj.toLocaleDateString(isLocalized ? "ar" : "en", {
				month: "short",
				day: "2-digit",
			});
			return {
				label,
				reservations: Number(d.reservations || 0),
				cancellations: Number(d.cancellations || 0),
				modifications: Number(d.modifications || 0),
			};
		});
	}, [dailyTrends, isLocalized]);

	const dateRangeLabel = React.useMemo(() => {
		if (!dailyTrends || dailyTrends.length === 0)
			return i18n.getMessage("chart_no_data", isLocalized);
		const first = new Date(dailyTrends[0]?.date || "");
		const last = new Date(dailyTrends[dailyTrends.length - 1]?.date || "");
		const fmt = (d: Date) =>
			d.toLocaleDateString(isLocalized ? "ar" : "en", {
				month: "short",
				day: "2-digit",
				year: "numeric",
			});
		return `${fmt(first)} - ${fmt(last)}`;
	}, [dailyTrends, isLocalized]);

	const chartConfig: ChartConfig = React.useMemo(
		() => ({
			reservations: {
				label: i18n.getMessage("dashboard_reservations", isLocalized),
				color: "hsl(var(--chart-1))",
			},
			cancellations: {
				label: i18n.getMessage("kpi_cancellations", isLocalized),
				color: "hsl(var(--chart-2))",
			},
			modifications: {
				label: i18n.getMessage("operation_modifications", isLocalized),
				color: "hsl(var(--chart-3))",
			},
		}),
		[isLocalized],
	);

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle>
					{i18n.getMessage("chart_daily_trends_overview", isLocalized)}
				</CardTitle>
				<CardDescription>
					{i18n.getMessage("chart_showing_all_data", isLocalized)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-[21.875rem] w-full">
					<AreaChart
						data={chartData}
						margin={{ top: 16, right: 12, left: 12, bottom: 8 }}
					>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							stroke={COLORS.foreground}
						/>
						<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
						<defs>
							<linearGradient id={fillResId} x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-reservations)"
									stopOpacity={0.5}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-reservations)"
									stopOpacity={0.1}
								/>
							</linearGradient>
							<linearGradient id={fillCanId} x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-cancellations)"
									stopOpacity={0.5}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-cancellations)"
									stopOpacity={0.1}
								/>
							</linearGradient>
							<linearGradient id={fillModId} x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-modifications)"
									stopOpacity={0.5}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-modifications)"
									stopOpacity={0.1}
								/>
							</linearGradient>
						</defs>
						<Area
							dataKey="modifications"
							type="natural"
							fill={`url(#${fillModId})`}
							fillOpacity={0.4}
							stroke="var(--color-modifications)"
							strokeWidth={0.8}
							strokeDasharray="3 3"
							isAnimationActive={false}
							stackId="a"
							name={i18n.getMessage("operation_modifications", isLocalized)}
						/>
						<Area
							dataKey="cancellations"
							type="natural"
							fill={`url(#${fillCanId})`}
							fillOpacity={0.4}
							stroke="var(--color-cancellations)"
							strokeWidth={0.8}
							strokeDasharray="3 3"
							isAnimationActive={false}
							stackId="a"
							name={i18n.getMessage("kpi_cancellations", isLocalized)}
						/>
						<Area
							dataKey="reservations"
							type="natural"
							fill={`url(#${fillResId})`}
							fillOpacity={0.4}
							stroke="var(--color-reservations)"
							strokeWidth={0.8}
							strokeDasharray="3 3"
							isAnimationActive={false}
							stackId="a"
							name={i18n.getMessage("dashboard_reservations", isLocalized)}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
			<CardFooter>
				<div className="flex w-full items-start gap-2 text-sm">
					<div className="grid gap-1">
						<div className="leading-none font-medium">
							{i18n.getMessage("dashboard_trends", isLocalized)}
						</div>
						<div className="text-muted-foreground leading-none">
							{dateRangeLabel}
						</div>
					</div>
				</div>
			</CardFooter>
		</Card>
	);
}
