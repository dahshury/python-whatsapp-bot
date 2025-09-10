"use client";

import { motion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import type { ChartConfig } from "@/components/ui/chart";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
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
	isLocalized: boolean;
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

function TrendChartsComponent({
	dailyTrends,
	typeDistribution,
	timeSlots: _timeSlots,
	dayOfWeekData: _dayOfWeekData,
	monthlyTrends,
	funnelData: _funnelData,
	customerSegments: _customerSegments,
	isLocalized,
	variant = "full",
}: TrendChartsProps) {
	const themeColors = useThemeColors();
	const [activeIndexType, setActiveIndexType] = useState<number | null>(null);
	const [activeIndexSlots, setActiveIndexSlots] = useState<number | null>(null);
	const [activeIndexWeekly, setActiveIndexWeekly] = useState<number | null>(
		null,
	);

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
	const _translateDayName = (dayName: string, isShort = false) => {
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
		return key ? i18n.getMessage(key, isLocalized) : dayName;
	};

	// Transform daily trends data with translated dates (memoized for performance)
	// Currently unused by charts; preserve as internal for future use
	useMemo(() => {
		return dailyTrends.map((trend) => ({
			...trend,
			displayDate: new Date(trend.date).toLocaleDateString(
				isLocalized ? "ar" : "en",
				{
					month: "short",
					day: "numeric",
				},
			),
		}));
	}, [dailyTrends, isLocalized]);

	// Transform type distribution with translated labels
	const transformedTypeDistribution = typeDistribution.map((type) => ({
		...type,
		label:
			type.type === 0
				? i18n.getMessage("appt_checkup", isLocalized)
				: i18n.getMessage("appt_followup", isLocalized),
	}));

	// Previous period comparison derived from monthlyTrends: take last two months as proxy
	const _prevTypeDistribution = useMemo(() => {
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
		_prevTypeDistribution.forEach(
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
	}, [transformedTypeDistribution, _prevTypeDistribution]);

	// Transform day of week data with translated day names
	const transformedDayOfWeekData = _dayOfWeekData.map((data) => ({
		...data,
		day: _translateDayName(data.day, false),
	}));

	// Transform time slots with translated types
	const transformedTimeSlots = _timeSlots.map((slot) => ({
		...slot,
		typeLabel:
			slot.type === "regular"
				? i18n.getMessage("slot_regular", isLocalized)
				: slot.type === "saturday"
					? i18n.getMessage("slot_saturday", isLocalized)
					: slot.type === "ramadan"
						? i18n.getMessage("slot_ramadan", isLocalized)
						: i18n.getMessage("slot_unknown", isLocalized),
	}));

	// Sort funnel data from highest to lowest count then translate stage names
	const sortedFunnel = [..._funnelData].sort((a, b) => b.count - a.count);

	const transformedFunnelData = sortedFunnel.map((stage) => {
		let translatedStage = stage.stage;

		switch (stage.stage.toLowerCase()) {
			case "conversations":
				translatedStage = i18n.getMessage("funnel_conversations", isLocalized);
				break;
			case "made reservation":
				translatedStage = i18n.getMessage(
					"funnel_made_reservation",
					isLocalized,
				);
				break;
			case "returned for another":
				translatedStage = i18n.getMessage(
					"funnel_returned_for_another",
					isLocalized,
				);
				break;
			case "cancelled":
				translatedStage = i18n.getMessage("funnel_cancelled", isLocalized);
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
	const transformedCustomerSegments = _customerSegments.map((segment) => {
		let translatedSegment = segment.segment;

		switch (segment.segment.toLowerCase()) {
			case "new (1 visit)":
				translatedSegment = i18n.getMessage("segment_new_1_visit", isLocalized);
				break;
			case "returning (2-5 visits)":
				translatedSegment = i18n.getMessage(
					"segment_returning_2_5_visits",
					isLocalized,
				);
				break;
			case "loyal (6+ visits)":
				translatedSegment = i18n.getMessage(
					"segment_loyal_6_plus_visits",
					isLocalized,
				);
				break;
			case "new customers":
				translatedSegment = i18n.getMessage(
					"segment_new_customers",
					isLocalized,
				);
				break;
			case "regular customers":
				translatedSegment = i18n.getMessage(
					"segment_regular_customers",
					isLocalized,
				);
				break;
			case "vip customers":
				translatedSegment = i18n.getMessage(
					"segment_vip_customers",
					isLocalized,
				);
				break;
			case "inactive customers":
				translatedSegment = i18n.getMessage(
					"segment_inactive_customers",
					isLocalized,
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

	// Build rounded pie chart config/data for customer segments using shadcn chart helpers
	const toVarKey = useCallback(
		(value: string) =>
			value
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, ""),
		[],
	);

	const segmentItems = useMemo(
		() =>
			transformedCustomerSegments.map((entry) => {
				const key = toVarKey(entry.segment);
				return {
					key,
					name: key,
					segment: entry.segment,
					count: entry.count,
					fill: `var(--color-${key})`,
				};
			}),
		[transformedCustomerSegments, toVarKey],
	);

	const segmentChartConfig: ChartConfig = useMemo(() => {
		const colorVars = [
			"hsl(var(--chart-1))",
			"hsl(var(--chart-2))",
			"hsl(var(--chart-3))",
			"hsl(var(--chart-4))",
			"hsl(var(--chart-5))",
		];
		const config: ChartConfig = {};
		segmentItems.forEach((item, index) => {
			const color = colorVars[index % colorVars.length];
			if (color) {
				config[item.key] = {
					label: item.segment,
					color,
				};
			}
		});
		return config;
	}, [segmentItems]);

	// Bar chart configs for shadcn chart helpers
	const typeDistChartConfig: ChartConfig = useMemo(
		() => ({
			current: {
				label: i18n.getMessage("period_current", isLocalized),
				color: "hsl(var(--chart-1))",
			},
			previous: {
				label: i18n.getMessage("period_previous", isLocalized),
				color: "hsl(var(--chart-2))",
			},
		}),
		[isLocalized],
	);

	const timeSlotsChartConfig: ChartConfig = useMemo(
		() => ({
			count: {
				label: i18n.getMessage("dashboard_reservations", isLocalized),
				color: "hsl(var(--chart-1))",
			},
		}),
		[isLocalized],
	);

	const weeklyActivityChartConfig: ChartConfig = useMemo(
		() => ({
			reservations: {
				label: i18n.getMessage("dashboard_reservations", isLocalized),
				color: "hsl(var(--chart-1))",
			},
			cancellations: {
				label: i18n.getMessage("kpi_cancellations", isLocalized),
				color: "hsl(var(--chart-2))",
			},
		}),
		[isLocalized],
	);

	// Compact variant to reduce rendering cost in overview
	if (variant === "compact") {
		return (
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
				{/* Daily Trends */}
				<DailyTrendsOverview
					dailyTrends={dailyTrends}
					isLocalized={isLocalized}
				/>

				{/* Appointment Type Distribution with previous period */}
				<motion.div initial={false}>
					<Card className="h-full">
						<CardHeader>
							<CardTitle>
								{i18n.getMessage(
									"chart_appointment_type_distribution",
									isLocalized,
								)}
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
											name={i18n.getMessage("period_current", isLocalized)}
											fill={themeColors.primary}
											isAnimationActive={false}
										/>
										<Bar
											dataKey="previous"
											name={i18n.getMessage("period_previous", isLocalized)}
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
			<DailyTrendsOverview
				dailyTrends={dailyTrends}
				isLocalized={isLocalized}
			/>

			{/* Appointment Type Distribution with previous period */}
			<motion.div initial={false}>
				<Card className="h-full">
					<CardHeader>
						<CardTitle>
							{i18n.getMessage(
								"chart_appointment_type_distribution",
								isLocalized,
							)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={typeDistChartConfig}
							className="h-[350px] w-full"
						>
							<BarChart
								accessibilityLayer
								data={typeDistributionWithPrev}
								onMouseLeave={() => setActiveIndexType(null)}
							>
								<rect
									x="0"
									y="0"
									width="100%"
									height="85%"
									fill="url(#pattern-type-dist)"
								/>
								<defs>
									<pattern
										id="pattern-type-dist"
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
								</defs>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxisComp dataKey="label" tick={{ fontSize: 12 }} />
								<YAxisComp tick={{ fontSize: 12 }} />
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent indicator="dashed" />}
								/>
								<Bar dataKey="current" radius={4} fill="var(--color-current)">
									{typeDistributionWithPrev.map((item, index) => (
										<Cell
											key={`type-current-${item.label}`}
											className="duration-200"
											fillOpacity={
												activeIndexType === null
													? 1
													: activeIndexType === index
														? 1
														: 0.3
											}
											onMouseEnter={() => setActiveIndexType(index)}
										/>
									))}
								</Bar>
								<Bar dataKey="previous" radius={4} fill="var(--color-previous)">
									{typeDistributionWithPrev.map((item, index) => (
										<Cell
											key={`type-prev-${item.label}`}
											className="duration-200"
											fillOpacity={
												activeIndexType === null
													? 1
													: activeIndexType === index
														? 1
														: 0.3
											}
											onMouseEnter={() => setActiveIndexType(index)}
										/>
									))}
								</Bar>
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</motion.div>

			{/* Popular Time Slots */}
			<motion.div initial={false}>
				<Card className="h-full">
					<CardHeader>
						<CardTitle>
							{i18n.getMessage("chart_popular_time_slots", isLocalized)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={timeSlotsChartConfig}
							className="h-[350px] w-full"
						>
							<BarChart
								data={transformedTimeSlots}
								onMouseLeave={() => setActiveIndexSlots(null)}
							>
								<rect
									x="0"
									y="0"
									width="100%"
									height="85%"
									fill="url(#pattern-time-slots)"
								/>
								<defs>
									<pattern
										id="pattern-time-slots"
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
								</defs>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxisComp
									dataKey="time"
									tick={{ fontSize: 11 }}
									angle={-45}
									textAnchor="end"
									height={60}
								/>
								<YAxisComp tick={{ fontSize: 12 }} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar
									dataKey="count"
									radius={[4, 4, 0, 0]}
									fill="var(--color-count)"
								>
									{transformedTimeSlots.map((item, index) => (
										<Cell
											key={`slot-${item.slot}-${item.time}`}
											className="duration-200"
											fillOpacity={
												activeIndexSlots === null
													? 1
													: activeIndexSlots === index
														? 1
														: 0.3
											}
											onMouseEnter={() => setActiveIndexSlots(index)}
										/>
									))}
								</Bar>
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</motion.div>

			{/* Weekly Activity Pattern */}
			<motion.div initial={false} className="lg:col-span-2">
				<Card className="h-full">
					<CardHeader>
						<CardTitle>
							{i18n.getMessage("chart_weekly_activity_pattern", isLocalized)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={weeklyActivityChartConfig}
							className="h-[350px] w-full"
						>
							<BarChart
								accessibilityLayer
								data={transformedDayOfWeekData}
								onMouseLeave={() => setActiveIndexWeekly(null)}
							>
								<rect
									x="0"
									y="0"
									width="100%"
									height="85%"
									fill="url(#pattern-weekly)"
								/>
								<defs>
									<pattern
										id="pattern-weekly"
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
								</defs>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxisComp dataKey="day" tick={{ fontSize: 12 }} />
								<YAxisComp tick={{ fontSize: 12 }} />
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent indicator="dashed" />}
								/>
								<Bar
									dataKey="reservations"
									radius={4}
									fill="var(--color-reservations)"
								>
									{transformedDayOfWeekData.map((item, index) => (
										<Cell
											key={`week-res-${item.day}`}
											className="duration-200"
											fillOpacity={
												activeIndexWeekly === null
													? 1
													: activeIndexWeekly === index
														? 1
														: 0.3
											}
											onMouseEnter={() => setActiveIndexWeekly(index)}
										/>
									))}
								</Bar>
								<Bar
									dataKey="cancellations"
									radius={4}
									fill="var(--color-cancellations)"
								>
									{transformedDayOfWeekData.map((item, index) => (
										<Cell
											key={`week-can-${item.day}`}
											className="duration-200"
											fillOpacity={
												activeIndexWeekly === null
													? 1
													: activeIndexWeekly === index
														? 1
														: 0.3
											}
											onMouseEnter={() => setActiveIndexWeekly(index)}
										/>
									))}
								</Bar>
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</motion.div>

			{/* Conversion Funnel */}
			<motion.div initial={false}>
				<Card className="h-full">
					<CardHeader>
						<CardTitle>
							{i18n.getMessage("chart_conversion_funnel", isLocalized)}
						</CardTitle>
						<p className="text-sm text-muted-foreground mt-1">
							{i18n.getMessage("chart_conversion_funnel_desc", isLocalized)}
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
							{i18n.getMessage("chart_customer_segments", isLocalized)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={segmentChartConfig}
							className="[&_.recharts-text]:fill-background mx-auto max-h-[300px] w-full"
						>
							<PieChart>
								<ChartTooltip
									content={<ChartTooltipContent nameKey="name" hideLabel />}
								/>
								<Pie
									data={segmentItems}
									innerRadius={30}
									dataKey="count"
									radius={10}
									cornerRadius={8}
									paddingAngle={4}
								>
									<LabelList
										dataKey="count"
										stroke="none"
										fontSize={12}
										fontWeight={500}
										fill="currentColor"
										formatter={(value: number) => value.toString()}
									/>
								</Pie>
							</PieChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}

export const TrendCharts = memo(TrendChartsComponent);
