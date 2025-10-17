"use client";

import { motion } from "framer-motion";
import { memo, useCallback, useEffect, useId, useMemo, useState } from "react";
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

// Type wrappers for Recharts compatibility
const XAxisComp = XAxis as unknown as React.ComponentType<
	Record<string, unknown>
>;
const YAxisComp = YAxis as unknown as React.ComponentType<
	Record<string, unknown>
>;
const FunnelComp = Funnel as unknown as React.ComponentType<
	Record<string, unknown>
>;

import type {
	CustomerSegment,
	DailyData,
	DayOfWeekData,
	FunnelData,
	MonthlyTrend,
	TimeSlotData,
	TypeDistribution,
} from "@features/dashboard/types";
import { i18n } from "@/shared/libs/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ChartConfig } from "@/shared/ui/chart";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/shared/ui/chart";
import { DailyTrendsOverview } from "./daily-trends-overview";

// Constants for chart styling
const PATTERN_HEIGHT = 10;
const PATTERN_WIDTH = 10;
const PATTERN_X = "0";
const PATTERN_Y = "0";
const CIRCLE_RADIUS = 1;
const CIRCLE_CX = 2;
const CIRCLE_CY = 2;

// Constants
const BAR_RADIUS_TOP_LEFT = 4;
const BAR_RADIUS_TOP_RIGHT = 4;
const BAR_RADIUS_BOTTOM_LEFT = 0;
const BAR_RADIUS_BOTTOM_RIGHT = 0;

type TrendChartsProps = {
	dailyTrends: DailyData[];
	typeDistribution: TypeDistribution[];
	timeSlots: TimeSlotData[];
	dayOfWeekData: DayOfWeekData[];
	monthlyTrends: MonthlyTrend[];
	funnelData: FunnelData[];
	customerSegments: CustomerSegment[];
	isLocalized: boolean;
	variant?: "full" | "compact";
};

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
	const patternIdType = useId();
	const patternIdSlots = useId();
	const patternIdWeekly = useId();

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
		const longDayMap: Record<string, string> = {
			Monday: "day_monday",
			Tuesday: "day_tuesday",
			Wednesday: "day_wednesday",
			Thursday: "day_thursday",
			Friday: "day_friday",
			Saturday: "day_saturday",
			Sunday: "day_sunday",
		};

		const shortDayMap: Record<string, string> = {
			Monday: "day_mon",
			Tuesday: "day_tue",
			Wednesday: "day_wed",
			Thursday: "day_thu",
			Friday: "day_fri",
			Saturday: "day_sat",
			Sunday: "day_sun",
			Mon: "day_mon",
			Tue: "day_tue",
			Wed: "day_wed",
			Thu: "day_thu",
			Fri: "day_fri",
			Sat: "day_sat",
			Sun: "day_sun",
		};

		const mapToUse = isShort ? shortDayMap : longDayMap;
		const key = mapToUse[dayName];
		return key ? i18n.getMessage(key, isLocalized) : dayName;
	};

	// Helper to get slot type label
	const getSlotTypeLabel = (slotType: string): string => {
		if (slotType === "regular") {
			return i18n.getMessage("slot_regular", isLocalized);
		}
		if (slotType === "saturday") {
			return i18n.getMessage("slot_saturday", isLocalized);
		}
		if (slotType === "ramadan") {
			return i18n.getMessage("slot_ramadan", isLocalized);
		}
		return i18n.getMessage("slot_unknown", isLocalized);
	};

	// Transform daily trends data with translated dates (memoized for performance)
	// Currently unused by charts; preserve as internal for future use
	useMemo(
		() =>
			dailyTrends.map((trend) => ({
				...trend,
				displayDate: new Date(trend.date).toLocaleDateString(
					isLocalized ? "ar" : "en",
					{
						month: "short",
						day: "numeric",
					}
				),
			})),
		[dailyTrends, isLocalized]
	);

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
			if (!Array.isArray(monthlyTrends) || monthlyTrends.length < 2) {
				return [] as Array<{ type: number; label: string; count?: number }>;
			}
			// Fallback heuristic: assume checkup ~ 0 type, followup ~ 1 type weights from current distribution
			const last = monthlyTrends.at(-1);
			const prev = monthlyTrends.at(-2);
			if (!(last && prev)) {
				return [] as Array<{ type: number; label: string; count?: number }>;
			}
			const totalNow = Math.max(
				1,
				transformedTypeDistribution.reduce((s, t) => s + (t.count || 0), 0)
			);
			const nowWeights = transformedTypeDistribution.map(
				(t) => (t.count || 0) / totalNow
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
		for (const p of _prevTypeDistribution) {
			const entry = map.get(p.type) || {
				label: p.label,
				current: 0,
				previous: 0,
			};
			entry.previous = p.count || 0;
			map.set(p.type, entry);
		}
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
		typeLabel: getSlotTypeLabel(slot.type),
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
					isLocalized
				);
				break;
			case "returned for another":
				translatedStage = i18n.getMessage(
					"funnel_returned_for_another",
					isLocalized
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
					isLocalized
				);
				break;
			case "loyal (6+ visits)":
				translatedSegment = i18n.getMessage(
					"segment_loyal_6_plus_visits",
					isLocalized
				);
				break;
			case "new customers":
				translatedSegment = i18n.getMessage(
					"segment_new_customers",
					isLocalized
				);
				break;
			case "regular customers":
				translatedSegment = i18n.getMessage(
					"segment_regular_customers",
					isLocalized
				);
				break;
			case "vip customers":
				translatedSegment = i18n.getMessage(
					"segment_vip_customers",
					isLocalized
				);
				break;
			case "inactive customers":
				translatedSegment = i18n.getMessage(
					"segment_inactive_customers",
					isLocalized
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
		[]
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
		[transformedCustomerSegments, toVarKey]
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
		[isLocalized]
	);

	const timeSlotsChartConfig: ChartConfig = useMemo(
		() => ({
			count: {
				label: i18n.getMessage("dashboard_reservations", isLocalized),
				color: "hsl(var(--chart-1))",
			},
		}),
		[isLocalized]
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
		[isLocalized]
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
									isLocalized
								)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="h-[21.875rem]">
								<ResponsiveContainer height="100%" width="100%">
									<BarChart data={typeDistributionWithPrev}>
										<CartesianGrid
											stroke={themeColors.border}
											strokeDasharray="3 3"
										/>
										<XAxisComp
											dataKey="label"
											stroke={themeColors.foreground}
											tick={{ fontSize: 12, fill: themeColors.foreground }}
										/>
										<YAxisComp
											stroke={themeColors.foreground}
											tick={{ fontSize: 12, fill: themeColors.foreground }}
										/>
										<Tooltip contentStyle={tooltipStyle} />
										<Bar
											dataKey="current"
											fill={themeColors.primary}
											isAnimationActive={false}
											name={i18n.getMessage("period_current", isLocalized)}
										/>
										<Bar
											dataKey="previous"
											fill={themeColors.secondary}
											isAnimationActive={false}
											name={i18n.getMessage("period_previous", isLocalized)}
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
								isLocalized
							)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							className="h-[21.875rem] w-full"
							config={typeDistChartConfig}
						>
							<BarChart accessibilityLayer data={typeDistributionWithPrev}>
								<rect
									fill={`url(#${patternIdType})`}
									height="85%"
									width="100%"
									x="0"
									y="0"
								/>
								<defs>
									<pattern
										height={PATTERN_HEIGHT}
										id={patternIdType}
										patternUnits="userSpaceOnUse"
										width={PATTERN_WIDTH}
										x={PATTERN_X}
										y={PATTERN_Y}
									>
										<circle
											className="text-muted dark:text-muted/40"
											cx={CIRCLE_CX}
											cy={CIRCLE_CY}
											fill="currentColor"
											r={CIRCLE_RADIUS}
										/>
									</pattern>
								</defs>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxisComp dataKey="label" tick={{ fontSize: 12 }} />
								<YAxisComp tick={{ fontSize: 12 }} />
								<ChartTooltip
									content={<ChartTooltipContent indicator="dashed" />}
									cursor={false}
								/>
								<Bar dataKey="current" fill="var(--color-current)" radius={4}>
									{typeDistributionWithPrev.map((item) => (
										<Cell
											className="duration-200"
											fillOpacity={1}
											key={`type-current-${item.label}`}
										/>
									))}
								</Bar>
								<Bar dataKey="previous" fill="var(--color-previous)" radius={4}>
									{typeDistributionWithPrev.map((item) => (
										<Cell
											className="duration-200"
											fillOpacity={1}
											key={`type-prev-${item.label}`}
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
							className="h-[21.875rem] w-full"
							config={timeSlotsChartConfig}
						>
							<BarChart data={transformedTimeSlots}>
								<rect
									fill={`url(#${patternIdSlots})`}
									height="85%"
									width="100%"
									x="0"
									y="0"
								/>
								<defs>
									<pattern
										height={PATTERN_HEIGHT}
										id={patternIdSlots}
										patternUnits="userSpaceOnUse"
										width={PATTERN_WIDTH}
										x={PATTERN_X}
										y={PATTERN_Y}
									>
										<circle
											className="text-muted dark:text-muted/40"
											cx={CIRCLE_CX}
											cy={CIRCLE_CY}
											fill="currentColor"
											r={CIRCLE_RADIUS}
										/>
									</pattern>
								</defs>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxisComp
									angle={-45}
									dataKey="time"
									height={60}
									textAnchor="end"
									tick={{ fontSize: 11 }}
								/>
								<YAxisComp tick={{ fontSize: 12 }} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar
									dataKey="count"
									fill="var(--color-count)"
									radius={[
										BAR_RADIUS_TOP_LEFT,
										BAR_RADIUS_TOP_RIGHT,
										BAR_RADIUS_BOTTOM_LEFT,
										BAR_RADIUS_BOTTOM_RIGHT,
									]}
								>
									{transformedTimeSlots.map((item) => (
										<Cell
											className="duration-200"
											fillOpacity={1}
											key={`slot-${item.slot}-${item.time}`}
										/>
									))}
								</Bar>
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</motion.div>

			{/* Weekly Activity Pattern */}
			<motion.div className="lg:col-span-2" initial={false}>
				<Card className="h-full">
					<CardHeader>
						<CardTitle>
							{i18n.getMessage("chart_weekly_activity_pattern", isLocalized)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							className="h-[21.875rem] w-full"
							config={weeklyActivityChartConfig}
						>
							<BarChart accessibilityLayer data={transformedDayOfWeekData}>
								<rect
									fill={`url(#${patternIdWeekly})`}
									height="85%"
									width="100%"
									x="0"
									y="0"
								/>
								<defs>
									<pattern
										height={PATTERN_HEIGHT}
										id={patternIdWeekly}
										patternUnits="userSpaceOnUse"
										width={PATTERN_WIDTH}
										x={PATTERN_X}
										y={PATTERN_Y}
									>
										<circle
											className="text-muted dark:text-muted/40"
											cx={CIRCLE_CX}
											cy={CIRCLE_CY}
											fill="currentColor"
											r={CIRCLE_RADIUS}
										/>
									</pattern>
								</defs>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxisComp dataKey="day" tick={{ fontSize: 12 }} />
								<YAxisComp tick={{ fontSize: 12 }} />
								<ChartTooltip
									content={<ChartTooltipContent indicator="dashed" />}
									cursor={false}
								/>
								<Bar
									dataKey="reservations"
									fill="var(--color-reservations)"
									radius={4}
								>
									{transformedDayOfWeekData.map((item) => (
										<Cell
											className="duration-200"
											fillOpacity={1}
											key={`week-res-${item.day}`}
										/>
									))}
								</Bar>
								<Bar
									dataKey="cancellations"
									fill="var(--color-cancellations)"
									radius={4}
								>
									{transformedDayOfWeekData.map((item) => (
										<Cell
											className="duration-200"
											fillOpacity={1}
											key={`week-can-${item.day}`}
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
						<p className="mt-1 text-muted-foreground text-sm">
							{i18n.getMessage("chart_conversion_funnel_desc", isLocalized)}
						</p>
					</CardHeader>
					<CardContent>
						<div className="h-[21.875rem]">
							<ResponsiveContainer height="100%" width="100%">
								<FunnelChart>
									<FunnelComp
										data={transformedFunnelData}
										dataKey="count"
										fill={themeColors.primary}
										isAnimationActive={false}
										nameKey="stage"
									>
										<LabelList
											fill={themeColors.background}
											fontSize={10}
											position="center"
										/>
										{/* Chart cells use index as key since data order is stable */}
										{transformedFunnelData.map((entry, index) => (
											<Cell
												fill={chartColors[index % chartColors.length]}
												key={`funnel-cell-${entry.stage}`}
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
							className="mx-auto max-h-[18.75rem] w-full [&_.recharts-text]:fill-background"
							config={segmentChartConfig}
						>
							<PieChart>
								<ChartTooltip
									content={<ChartTooltipContent hideLabel nameKey="name" />}
								/>
								<Pie
									cornerRadius={8}
									data={segmentItems}
									dataKey="count"
									innerRadius={30}
									paddingAngle={4}
									radius={10}
								>
									<LabelList
										dataKey="count"
										fill="currentColor"
										fontSize={12}
										fontWeight={500}
										formatter={(value: number) => value.toString()}
										stroke="none"
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
