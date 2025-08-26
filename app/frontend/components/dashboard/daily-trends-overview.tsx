"use client";

import React from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { i18n } from "@/lib/i18n";
import type { DailyData } from "@/types/dashboard";

interface DailyTrendsOverviewProps {
	dailyTrends: DailyData[];
	isRTL: boolean;
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
	isRTL,
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
			const label = dateObj.toLocaleDateString(isRTL ? "ar" : "en", {
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
	}, [dailyTrends, isRTL]);

	const dateRangeLabel = React.useMemo(() => {
		if (!dailyTrends || dailyTrends.length === 0)
			return i18n.getMessage("chart_no_data", isRTL);
		const first = new Date(dailyTrends[0].date);
		const last = new Date(dailyTrends[dailyTrends.length - 1].date);
		const fmt = (d: Date) =>
			d.toLocaleDateString(isRTL ? "ar" : "en", {
				month: "short",
				day: "2-digit",
				year: "numeric",
			});
		return `${fmt(first)} - ${fmt(last)}`;
	}, [dailyTrends, isRTL]);

	const tooltipStyle = React.useMemo(
		() => ({
			backgroundColor: COLORS.card,
			border: `1px solid ${COLORS.border}`,
			borderRadius: 8,
			fontSize: 12,
			color: COLORS.foreground,
		}),
		[],
	);

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle>
					{i18n.getMessage("chart_daily_trends_overview", isRTL)}
				</CardTitle>
				<CardDescription>
					{i18n.getMessage("chart_showing_all_data", isRTL)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="h-[350px]">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
							<CartesianGrid vertical={false} stroke={COLORS.border} />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								stroke={COLORS.foreground}
							/>
							<Tooltip contentStyle={tooltipStyle} cursor={false} />
							<defs>
								<linearGradient id={fillResId} x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor={COLORS.reservations}
										stopOpacity={0.8}
									/>
									<stop
										offset="95%"
										stopColor={COLORS.reservations}
										stopOpacity={0.1}
									/>
								</linearGradient>
								<linearGradient id={fillCanId} x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor={COLORS.cancellations}
										stopOpacity={0.8}
									/>
									<stop
										offset="95%"
										stopColor={COLORS.cancellations}
										stopOpacity={0.1}
									/>
								</linearGradient>
								<linearGradient id={fillModId} x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor={COLORS.modifications}
										stopOpacity={0.8}
									/>
									<stop
										offset="95%"
										stopColor={COLORS.modifications}
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>
							<Area
								dataKey="modifications"
								type="monotone"
								fill={`url(#${fillModId})`}
								fillOpacity={0.4}
								stroke={COLORS.modifications}
								isAnimationActive={false}
								stackId="a"
								name={i18n.getMessage("operation_modifications", isRTL)}
							/>
							<Area
								dataKey="cancellations"
								type="monotone"
								fill={`url(#${fillCanId})`}
								fillOpacity={0.4}
								stroke={COLORS.cancellations}
								isAnimationActive={false}
								stackId="a"
								name={i18n.getMessage("kpi_cancellations", isRTL)}
							/>
							<Area
								dataKey="reservations"
								type="monotone"
								fill={`url(#${fillResId})`}
								fillOpacity={0.4}
								stroke={COLORS.reservations}
								isAnimationActive={false}
								stackId="a"
								name={i18n.getMessage("dashboard_reservations", isRTL)}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
			<CardFooter>
				<div className="flex w-full items-start gap-2 text-sm">
					<div className="grid gap-1">
						<div className="leading-none font-medium">
							{i18n.getMessage("dashboard_trends", isRTL)}
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
