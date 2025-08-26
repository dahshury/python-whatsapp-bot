"use client";

import { motion } from "framer-motion";
import { memo, useEffect, useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Funnel,
	FunnelChart,
	LabelList,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

// Add wrappers to avoid @types/recharts v1 typings conflict with Recharts v3
const XAxisComp = XAxis as unknown as React.ComponentType<
	Record<string, unknown>
>;
const YAxisComp = YAxis as unknown as React.ComponentType<
	Record<string, unknown>
>;
const FunnelComp = Funnel as unknown as React.ComponentType<
	Record<string, unknown>
>;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { i18n } from "@/lib/i18n";
import type {
	CustomerSegment,
	DailyData,
	DayOfWeekData,
	FunnelData,
	MonthlyTrend,
	TimeSlotData,
	TypeDistribution,
} from "@/types/dashboard";
import { DailyTrendsOverview } from "./daily-trends-overview";

interface TrendChartsProps {
	dailyTrends: DailyData[];
	typeDistribution: TypeDistribution[];
	timeSlots: TimeSlotData[];
	dayOfWeekData: DayOfWeekData[];
	monthlyTrends: MonthlyTrend[];
	funnelData: FunnelData[];
	customerSegments: CustomerSegment[];
	isRTL: boolean;
	variant?: "full" | "compact";
}

// Hook to get theme colors for charts
function useThemeColors() {
	const [colors, setColors] = useState({
		primary: "hsl(var(--chart-1))",
		secondary: "hsl(var(--chart-2))",
		tertiary: "hsl(var(--chart-3))",
		quaternary: "hsl(var(--chart-4))",
		quinary: "hsl(var(--chart-5))",
		background: "hsl(var(--background))",
		foreground: "hsl(var(--foreground))",
		muted: "hsl(var(--muted))",
		border: "hsl(var(--border))",
		card: "hsl(var(--card))",
	});

	useEffect(() => {
		const updateColors = () => {
			const root = document.documentElement;
			const computedStyle = getComputedStyle(root);

			setColors({
				primary: `hsl(${computedStyle.getPropertyValue("--chart-1")})`,
				secondary: `hsl(${computedStyle.getPropertyValue("--chart-2")})`,
				tertiary: `hsl(${computedStyle.getPropertyValue("--chart-3")})`,
				quaternary: `hsl(${computedStyle.getPropertyValue("--chart-4")})`,
				quinary: `hsl(${computedStyle.getPropertyValue("--chart-5")})`,
				background: `hsl(${computedStyle.getPropertyValue("--background")})`,
				foreground: `hsl(${computedStyle.getPropertyValue("--foreground")})`,
				muted: `hsl(${computedStyle.getPropertyValue("--muted")})`,
				border: `hsl(${computedStyle.getPropertyValue("--border")})`,
				card: `hsl(${computedStyle.getPropertyValue("--card")})`,
			});
		};

		updateColors();

		// Listen for theme changes
		const observer = new MutationObserver(updateColors);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => observer.disconnect();
	}, []);

	return colors;
}

export const TrendCharts = memo(function TrendChartsComponent({
	dailyTrends,
	typeDistribution,
	timeSlots,
	dayOfWeekData,
	monthlyTrends,
	funnelData,
	customerSegments,
	isRTL,
	variant = "full",
}: TrendChartsProps) {
	const themeColors = useThemeColors();

	const chartColors = [
		themeColors.primary,
		themeColors.secondary,
		themeColors.tertiary,
		themeColors.quaternary,
		themeColors.quinary,
		themeColors.primary,
		themeColors.secondary,
		themeColors.tertiary,
		themeColors.quaternary,
		themeColors.quinary,
	];

	// Custom tooltip style
	const tooltipStyle = {
		backgroundColor: themeColors.card,
		border: `1px solid ${themeColors.border}`,
		borderRadius: "8px",
		fontSize: "12px",
		color: themeColors.foreground,
	};

	// Helper function to translate day names
	const translateDayName = (dayName: string, isShort = false) => {
		const dayMap = {
			Monday: isShort ? "day_mon" : "day_monday",
			Tuesday: isShort ? "day_tue" : "day_tuesday",
			Wednesday: isShort ? "day_wed" : "day_wednesday",
			Thursday: isShort ? "day_thu" : "day_thursday",
			Friday: isShort ? "day_fri" : "day_friday",
			Saturday: isShort ? "day_sat" : "day_saturday",
			Sunday: isShort ? "day_sun" : "day_sunday",
			Mon: "day_mon",
			Tue: "day_tue",
			Wed: "day_wed",
			Thu: "day_thu",
			Fri: "day_fri",
			Sat: "day_sat",
			Sun: "day_sun",
		};

		const key = dayMap[dayName as keyof typeof dayMap];
		return key ? i18n.getMessage(key, isRTL) : dayName;
	};

	// Transform daily trends data with translated dates (memoized for performance)
	const _transformedDailyTrends = useMemo(() => {
		return dailyTrends.map((trend) => ({
			...trend,
			displayDate: new Date(trend.date).toLocaleDateString(
				isRTL ? "ar" : "en",
				{
					month: "short",
					day: "numeric",
				},
			),
		}));
	}, [dailyTrends, isRTL]);

	// Generate a key based on the date range to force chart re-render when data changes
	const _chartKey = useMemo(() => {
		if (dailyTrends.length === 0) return "empty";
		const first = dailyTrends[0].date;
		const last = dailyTrends[dailyTrends.length - 1].date;
		return `${first}_${last}_${dailyTrends.length}`;
	}, [dailyTrends]);

	// Transform type distribution with translated labels
	const transformedTypeDistribution = typeDistribution.map((type) => ({
		...type,
		label:
			type.type === 0
				? i18n.getMessage("appt_checkup", isRTL)
				: i18n.getMessage("appt_followup", isRTL),
	}));

	// Previous period comparison derived from monthlyTrends: take last two months as proxy
	const prevTypeDistribution = useMemo(() => {
		try {
			if (!Array.isArray(monthlyTrends) || monthlyTrends.length < 2)
				return [] as Array<{ type: number; label: string; count?: number }>;
			// Fallback heuristic: assume checkup ~ 0 type, followup ~ 1 type weights from current distribution
			const last = monthlyTrends[monthlyTrends.length - 1];
			const prev = monthlyTrends[monthlyTrends.length - 2];
			if (!last || !prev)
				return [] as Array<{ type: number; label: string; count?: number }>;
			const totalNow = Math.max(
				1,
				transformedTypeDistribution.reduce((s, t) => s + (t.count || 0), 0),
			);
			const nowWeights = transformedTypeDistribution.map(
				(t) => (t.count || 0) / totalNow,
			);
			const estimate = (total: number) =>
				transformedTypeDistribution.map((t, idx) => ({
					type: t.type,
					label: t.label,
					count: Math.round((total || 0) * (nowWeights[idx] || 0)),
				}));
			return estimate(prev.reservations);
		} catch {
			return [] as Array<{ type: number; label: string; count?: number }>;
		}
	}, [monthlyTrends, transformedTypeDistribution]);

	// Combined dataset for dual bar chart: current vs previous for each label
	const typeDistributionWithPrev = useMemo(() => {
		const map = new Map<
			number,
			{ label: string; current: number; previous: number }
		>();
		for (const t of transformedTypeDistribution) {
			map.set(t.type, { label: t.label, current: t.count || 0, previous: 0 });
		}
		prevTypeDistribution.forEach(
			(p: { type: number; label: string; count?: number }) => {
				const entry = map.get(p.type) || {
					label: p.label,
					current: 0,
					previous: 0,
				};
				entry.previous = p.count || 0;
				map.set(p.type, entry);
			},
		);
		return Array.from(map.values());
	}, [transformedTypeDistribution, prevTypeDistribution]);

	// Transform day of week data with translated day names
	const transformedDayOfWeekData = dayOfWeekData.map((data) => ({
		...data,
		day: translateDayName(data.day, false),
	}));

	// Transform time slots with translated types
	const transformedTimeSlots = timeSlots.map((slot) => ({
		...slot,
		typeLabel:
			slot.type === "regular"
				? i18n.getMessage("slot_regular", isRTL)
				: slot.type === "saturday"
					? i18n.getMessage("slot_saturday", isRTL)
					: slot.type === "ramadan"
						? i18n.getMessage("slot_ramadan", isRTL)
						: i18n.getMessage("slot_unknown", isRTL),
	}));

	// Sort funnel data from highest to lowest count then translate stage names
	const sortedFunnel = [...funnelData].sort((a, b) => b.count - a.count);

	const transformedFunnelData = sortedFunnel.map((stage) => {
		let translatedStage = stage.stage;

		switch (stage.stage.toLowerCase()) {
			case "conversations":
				translatedStage = i18n.getMessage("funnel_conversations", isRTL);
				break;
			case "made reservation":
				translatedStage = i18n.getMessage("funnel_made_reservation", isRTL);
				break;
			case "returned for another":
				translatedStage = i18n.getMessage("funnel_returned_for_another", isRTL);
				break;
			case "cancelled":
				translatedStage = i18n.getMessage("funnel_cancelled", isRTL);
				break;
			default:
				translatedStage = stage.stage;
		}

		return {
			...stage,
			stage: translatedStage,
		};
	});

	// Transform customer segments with translated names
	const transformedCustomerSegments = customerSegments.map((segment) => {
		let translatedSegment = segment.segment;

		switch (segment.segment.toLowerCase()) {
			case "new (1 visit)":
				translatedSegment = i18n.getMessage("segment_new_1_visit", isRTL);
				break;
			case "returning (2-5 visits)":
				translatedSegment = i18n.getMessage(
					"segment_returning_2_5_visits",
					isRTL,
				);
				break;
			case "loyal (6+ visits)":
				translatedSegment = i18n.getMessage(
					"segment_loyal_6_plus_visits",
					isRTL,
				);
				break;
			case "new customers":
				translatedSegment = i18n.getMessage("segment_new_customers", isRTL);
				break;
			case "regular customers":
				translatedSegment = i18n.getMessage("segment_regular_customers", isRTL);
				break;
			case "vip customers":
				translatedSegment = i18n.getMessage("segment_vip_customers", isRTL);
				break;
			case "inactive customers":
				translatedSegment = i18n.getMessage(
					"segment_inactive_customers",
					isRTL,
				);
				break;
			default:
				translatedSegment = segment.segment;
		}

		return {
			...segment,
			segment: translatedSegment,
		};
	});

	// Compact variant to reduce rendering cost in overview
	if (variant === "compact") {
		return (
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
				{/* Daily Trends */}
				<DailyTrendsOverview dailyTrends={dailyTrends} isRTL={isRTL} />

				{/* Appointment Type Distribution with previous period */}
				<motion.div initial={false}>
					<Card className="h-full">
						<CardHeader>
							<CardTitle>
								{i18n.getMessage("chart_appointment_type_distribution", isRTL)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="h-[350px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={typeDistributionWithPrev}>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke={themeColors.border}
										/>
										<XAxisComp
											dataKey="label"
											tick={{ fontSize: 12, fill: themeColors.foreground }}
											stroke={themeColors.foreground}
										/>
										<YAxisComp
											tick={{ fontSize: 12, fill: themeColors.foreground }}
											stroke={themeColors.foreground}
										/>
										<Tooltip contentStyle={tooltipStyle} />
										<Bar
											dataKey="current"
											name={i18n.getMessage("period_current", isRTL)}
											fill={themeColors.primary}
											isAnimationActive={false}
										/>
										<Bar
											dataKey="previous"
											name={i18n.getMessage("period_previous", isRTL)}
											fill={themeColors.secondary}
											isAnimationActive={false}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		);
	}

	return (
		<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
			{/* Daily Trends */}
			<DailyTrendsOverview dailyTrends={dailyTrends} isRTL={isRTL} />

			{/* Appointment Type Distribution with previous period */}
			<motion.div initial={false}>
				<Card className="h-full">
					<CardHeader>
						<CardTitle>
							{i18n.getMessage("chart_appointment_type_distribution", isRTL)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-[350px]">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={typeDistributionWithPrev}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={themeColors.border}
									/>
									<XAxisComp
										dataKey="label"
										tick={{ fontSize: 12, fill: themeColors.foreground }}
										stroke={themeColors.foreground}
									/>
									<YAxisComp
										tick={{ fontSize: 12, fill: themeColors.foreground }}
										stroke={themeColors.foreground}
									/>
									<Tooltip contentStyle={tooltipStyle} />
									<Bar
										dataKey="current"
										name={i18n.getMessage("period_current", isRTL)}
										fill={themeColors.primary}
										isAnimationActive={false}
									/>
									<Bar
										dataKey="previous"
										name={i18n.getMessage("period_previous", isRTL)}
										fill={themeColors.secondary}
										isAnimationActive={false}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* Popular Time Slots */}
			<motion.div initial={false}>
				<Card className="h-full">
					<CardHeader>
						<CardTitle>
							{i18n.getMessage("chart_popular_time_slots", isRTL)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-[350px]">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={transformedTimeSlots}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={themeColors.border}
									/>
									<XAxisComp
										dataKey="time"
										tick={{ fontSize: 11, fill: themeColors.foreground }}
										stroke={themeColors.foreground}
										angle={-45}
										textAnchor="end"
										height={60}
									/>
									<YAxisComp
										tick={{ fontSize: 12, fill: themeColors.foreground }}
										stroke={themeColors.foreground}
									/>
									<Tooltip contentStyle={tooltipStyle} />
									<Bar
										dataKey="count"
										fill={themeColors.primary}
										radius={[4, 4, 0, 0]}
										name={i18n.getMessage("dashboard_reservations", isRTL)}
										isAnimationActive={false}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* Weekly Activity Pattern */}
			<motion.div initial={false} className="lg:col-span-2">
				<Card className="h-full">
					<CardHeader>
						<CardTitle>
							{i18n.getMessage("chart_weekly_activity_pattern", isRTL)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-[350px]">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={transformedDayOfWeekData}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={themeColors.border}
									/>
									<XAxisComp
										dataKey="day"
										tick={{ fontSize: 12, fill: themeColors.foreground }}
										stroke={themeColors.foreground}
									/>
									<YAxisComp
										tick={{ fontSize: 12, fill: themeColors.foreground }}
										stroke={themeColors.foreground}
									/>
									<Tooltip contentStyle={tooltipStyle} />
									<Bar
										dataKey="reservations"
										fill={themeColors.primary}
										radius={[4, 4, 0, 0]}
										name={i18n.getMessage("dashboard_reservations", isRTL)}
										isAnimationActive={false}
									/>
									<Bar
										dataKey="cancellations"
										fill={themeColors.secondary}
										radius={[4, 4, 0, 0]}
										name={i18n.getMessage("kpi_cancellations", isRTL)}
										isAnimationActive={false}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* Conversion Funnel */}
			<motion.div initial={false}>
				<Card className="h-full">
					<CardHeader>
						<CardTitle>
							{i18n.getMessage("chart_conversion_funnel", isRTL)}
						</CardTitle>
						<p className="text-sm text-muted-foreground mt-1">
							{i18n.getMessage("chart_conversion_funnel_desc", isRTL)}
						</p>
					</CardHeader>
					<CardContent>
						<div className="h-[350px]">
							<ResponsiveContainer width="100%" height="100%">
								<FunnelChart>
									<FunnelComp
										dataKey="count"
										data={transformedFunnelData}
										isAnimationActive={false}
										fill={themeColors.primary}
										nameKey="stage"
									>
										<LabelList
											position="center"
											fill={themeColors.background}
											fontSize={10}
										/>
										{/* Chart cells use index as key since data order is stable */}
										{transformedFunnelData.map((entry, index) => (
											<Cell
												key={`funnel-cell-${entry.stage}`}
												fill={chartColors[index % chartColors.length]}
											/>
										))}
									</FunnelComp>
									<Tooltip contentStyle={tooltipStyle} />
								</FunnelChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* Customer Segments */}
			<motion.div initial={false}>
				<Card className="h-full">
					<CardHeader>
						<CardTitle>
							{i18n.getMessage("chart_customer_segments", isRTL)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-[350px]">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={transformedCustomerSegments}
										cx="50%"
										cy="50%"
										outerRadius={100}
										fill={themeColors.primary}
										dataKey="count"
										label={false}
									>
										{/* Chart cells use index as key since data order is stable */}
										{transformedCustomerSegments.map((entry, index) => (
											<Cell
												key={`segment-cell-${entry.segment}`}
												fill={chartColors[index % chartColors.length]}
											/>
										))}
									</Pie>
									<Tooltip contentStyle={tooltipStyle} />
								</PieChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
});
