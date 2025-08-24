"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { i18n } from "@/lib/i18n";
import type { DailyData } from "@/types/dashboard";

interface DailyTrendsOverviewProps {
	dailyTrends: DailyData[];
	isRTL: boolean;
}

// Static theme colors to prevent re-render loops
const THEME_COLORS = {
	primary: "hsl(var(--chart-1))",
	secondary: "hsl(var(--chart-2))",
	tertiary: "hsl(var(--chart-3))",
	background: "hsl(var(--background))",
	foreground: "hsl(var(--foreground))",
	border: "hsl(var(--border))",
	card: "hsl(var(--card))",
};

export function DailyTrendsOverview({
	dailyTrends,
	isRTL,
}: DailyTrendsOverviewProps) {
	const [timeRange, setTimeRange] = useState("all");

	// Transform and filter data based on time range
	const filteredData = useMemo(() => {
		let data = dailyTrends.map((trend) => ({
			...trend,
			displayDate: new Date(trend.date).toLocaleDateString(
				isRTL ? "ar" : "en",
				{
					month: "short",
					day: "numeric",
				},
			),
		}));

		// Filter based on time range selection
		if (timeRange !== "all" && data.length > 0) {
			const daysToShow = parseInt(timeRange.replace("d", ""));
			data = data.slice(-daysToShow);
		}

		return data;
	}, [dailyTrends, timeRange, isRTL]);

	// Calculate description based on visible data
	const description = useMemo(() => {
		if (filteredData.length === 0)
			return i18n.getMessage("chart_no_data", isRTL);

		if (timeRange === "all") {
			return i18n.getMessage("chart_showing_all_data", isRTL);
		} else {
			const days = timeRange.replace("d", "");
			return `${i18n.getMessage("chart_showing_last_days", isRTL)}: ${days}`;
		}
	}, [filteredData.length, timeRange, isRTL]);

	// Custom tooltip style
	const tooltipStyle = useMemo(
		() => ({
			backgroundColor: THEME_COLORS.card,
			border: `1px solid ${THEME_COLORS.border}`,
			borderRadius: "8px",
			fontSize: "12px",
			color: THEME_COLORS.foreground,
		}),
		[],
	);

	return (
		<motion.div
			initial={false}
			animate={{ opacity: 1, y: 0 }}
			className="lg:col-span-2"
		>
			<Card className="h-full">
				<CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
					<div className="grid flex-1 gap-1">
						<CardTitle>
							{i18n.getMessage("chart_daily_trends_overview", isRTL)}
						</CardTitle>
						<CardDescription>{description}</CardDescription>
					</div>
					{dailyTrends.length > 7 && (
						<Select value={timeRange} onValueChange={setTimeRange}>
							<SelectTrigger
								className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
								aria-label="Select time range"
							>
								<SelectValue placeholder="Select range" />
							</SelectTrigger>
							<SelectContent className="rounded-xl">
								<SelectItem value="all" className="rounded-lg">
									{i18n.getMessage("chart_all_data", isRTL)}
								</SelectItem>
								{dailyTrends.length >= 30 && (
									<SelectItem value="30d" className="rounded-lg">
										{i18n.getMessage("chart_last_30_days", isRTL)}
									</SelectItem>
								)}
								{dailyTrends.length >= 14 && (
									<SelectItem value="14d" className="rounded-lg">
										{i18n.getMessage("chart_last_14_days", isRTL)}
									</SelectItem>
								)}
								{dailyTrends.length >= 7 && (
									<SelectItem value="7d" className="rounded-lg">
										{i18n.getMessage("chart_last_7_days", isRTL)}
									</SelectItem>
								)}
							</SelectContent>
						</Select>
					)}
				</CardHeader>
				<CardContent>
					<div className="h-[350px]">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={filteredData}
							>
								<defs>
									<linearGradient
										id="fillReservations"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor={THEME_COLORS.primary}
											stopOpacity={0.8}
										/>
										<stop
											offset="95%"
											stopColor={THEME_COLORS.primary}
											stopOpacity={0.1}
										/>
									</linearGradient>
									<linearGradient
										id="fillCancellations"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor={THEME_COLORS.secondary}
											stopOpacity={0.8}
										/>
										<stop
											offset="95%"
											stopColor={THEME_COLORS.secondary}
											stopOpacity={0.1}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke={THEME_COLORS.border}
								/>
								<XAxis
									dataKey="displayDate"
									tick={{ fontSize: 12, fill: THEME_COLORS.foreground }}
									stroke={THEME_COLORS.foreground}
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									minTickGap={32}
								/>
								<YAxis
									tick={{ fontSize: 12, fill: THEME_COLORS.foreground }}
									stroke={THEME_COLORS.foreground}
								/>
								<Tooltip
									contentStyle={tooltipStyle}
									labelStyle={{
										fontWeight: "bold",
										color: THEME_COLORS.foreground,
									}}
								/>
								<Area
									type="monotone"
									dataKey="reservations"
									stroke={THEME_COLORS.primary}
									strokeWidth={2}
									fillOpacity={1}
									fill="url(#fillReservations)"
									name={i18n.getMessage("dashboard_reservations", isRTL)}
									isAnimationActive
									animationDuration={500}
								/>
								<Area
									type="monotone"
									dataKey="cancellations"
									stroke={THEME_COLORS.secondary}
									strokeWidth={2}
									fillOpacity={1}
									fill="url(#fillCancellations)"
									name={i18n.getMessage("kpi_cancellations", isRTL)}
									isAnimationActive
									animationDuration={500}
								/>
								<Legend />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}
