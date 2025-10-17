"use client";

import type {
	DashboardStats,
	PrometheusMetrics,
} from "@features/dashboard/types";
import { i18n } from "@shared/libs/i18n";
import { Badge } from "@ui/badge";
import { motion } from "framer-motion";
import {
	Calendar,
	CheckCircle,
	Clock,
	Cpu,
	HardDrive,
	HelpCircle,
	MessageSquare,
	TrendingUp,
	UserCheck,
	Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { MagicCard } from "@/shared/ui/magicui/magic-card";
import { Progress } from "@/shared/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

// Type for metrics that can have optional properties
interface MetricData extends Omit<KPICardProps, "isLocalized"> {
	// All properties are inherited from KPICardProps except isLocalized
}

type KPICardsProps = {
	stats: DashboardStats;
	prometheusMetrics: PrometheusMetrics;
	isLocalized: boolean;
};

type KPICardProps = {
	title: string;
	value: string | number;
	description: string;
	icon: React.ReactNode;
	trend?: {
		value: number;
		isPositive: boolean;
		label?: string;
	};
	progress?: number;
	variant?: "default" | "success" | "warning" | "danger";
	hasTooltip?: boolean;
	tooltipContent?: string;
	isLocalized?: boolean;
};

function KPICard({
	title,
	value,
	description,
	icon,
	trend,
	progress,
	variant = "default",
	hasTooltip,
	tooltipContent,
	isLocalized: _isLocalized,
}: KPICardProps) {
	const getVariantClasses = () => {
		switch (variant) {
			case "success":
				return "border-chart-1/30 bg-chart-1/10";
			case "warning":
				return "border-chart-3/30 bg-chart-3/10";
			case "danger":
				return "border-destructive/30 bg-destructive/10";
			default:
				return "";
		}
	};

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className="h-full"
			initial={{ opacity: 0, y: 20 }}
			transition={{ duration: 0.4 }}
		>
			<MagicCard
				className={`flex h-full flex-col ${getVariantClasses()}`}
				gradientColor="hsl(var(--muted-foreground) / 0.08)"
				gradientFrom="hsl(var(--primary))"
				gradientOpacity={0.5}
				gradientSize={250}
				gradientTo="hsl(var(--accent))"
			>
				<Card className="flex h-full flex-col border-0 bg-transparent shadow-none">
					<CardHeader className="flex flex-shrink-0 flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="line-clamp-2 flex items-center gap-1 font-medium text-sm">
							{title}
							{hasTooltip && tooltipContent && (
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="inline-flex cursor-help items-center">
											<HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
										</span>
									</TooltipTrigger>
									<TooltipContent
										align="start"
										className="max-w-xs border border-border/40 bg-gradient-to-br bg-transparent from-chart-1/15 via-background/70 to-transparent shadow-lg backdrop-blur-md"
										side="top"
										sideOffset={10}
									>
										<p className="text-sm opacity-90">{tooltipContent}</p>
									</TooltipContent>
								</Tooltip>
							)}
						</CardTitle>
						<div className="flex-shrink-0">{icon}</div>
					</CardHeader>
					<CardContent className="flex flex-1 flex-col justify-between">
						<div>
							<div className="font-bold text-2xl transition-all duration-300 will-change-contents">
								{value}
							</div>
							<div className="mt-1 flex min-h-[2.5rem] items-center justify-between">
								<p className="mr-2 line-clamp-2 flex-1 text-muted-foreground text-xs">
									{description}
								</p>
								{trend && (
									<Badge
										className={`flex-shrink-0 text-xs ${
											trend.isPositive
												? "bg-chart-1/20 text-chart-1 hover:bg-chart-1/20"
												: "bg-destructive/20 text-destructive hover:bg-destructive/20"
										}`}
										variant={trend.isPositive ? "default" : "secondary"}
									>
										{trend.isPositive ? "+" : "-"}
										{trend.value.toFixed(1)}%{trend.label && ` ${trend.label}`}
									</Badge>
								)}
							</div>
						</div>
						{progress !== undefined && (
							<div className="mt-3">
								<Progress className="h-2" value={progress} />
							</div>
						)}
					</CardContent>
				</Card>
			</MagicCard>
		</motion.div>
	);
}

// Constants for KPI calculations
const CPU_WARNING_THRESHOLD = 80;
const CPU_DEMO_PERCENT = 45.2;
const SUCCESS_RATE_WARNING_THRESHOLD = 95;
const SUCCESS_RATE_DEMO_PERCENT = 96.8;
const KILOBYTES_BASE = 1024;
const GIGABYTE_EXPONENT = 3;
const PERCENT_MULTIPLIER = 100;
const RESPONSE_TIME_DIVISOR = 2;
const ANIMATION_DELAY_MULTIPLIER = 0.05;
const ANIMATION_DURATION = 0.4;
const ANIMATION_Y_OFFSET = 20;

// Helper to create CPU metric
function createCPUMetric(
	prometheusMetrics: PrometheusMetrics,
	isLocalized: boolean
): MetricData {
	const cpuPercent = prometheusMetrics.cpu_percent ?? CPU_DEMO_PERCENT;
	return {
		title: i18n.getMessage("kpi_cpu_usage", isLocalized),
		value:
			prometheusMetrics.cpu_percent !== undefined
				? `${prometheusMetrics.cpu_percent.toFixed(1)}%`
				: `${CPU_DEMO_PERCENT}%`,
		description:
			prometheusMetrics.cpu_percent !== undefined
				? i18n.getMessage("kpi_current_usage", isLocalized)
				: i18n.getMessage("kpi_demo_data", isLocalized),
		icon: <Cpu className="h-4 w-4 text-muted-foreground" />,
		progress: cpuPercent,
		variant:
			cpuPercent > CPU_WARNING_THRESHOLD
				? ("danger" as const)
				: ("default" as const),
	};
}

// Helper to create Memory metric
function createMemoryMetric(
	prometheusMetrics: PrometheusMetrics,
	isLocalized: boolean
): MetricData {
	return {
		title: i18n.getMessage("kpi_memory_usage", isLocalized),
		value:
			prometheusMetrics.memory_bytes !== undefined
				? `${(prometheusMetrics.memory_bytes / KILOBYTES_BASE ** GIGABYTE_EXPONENT).toFixed(1)}GB`
				: `${(KILOBYTES_BASE ** GIGABYTE_EXPONENT / KILOBYTES_BASE).toFixed(1)}GB`,
		description:
			prometheusMetrics.memory_bytes !== undefined
				? i18n.getMessage("kpi_current_usage", isLocalized)
				: i18n.getMessage("kpi_demo_data", isLocalized),
		icon: <HardDrive className="h-4 w-4 text-muted-foreground" />,
		variant: "default" as const,
	};
}

// Helper to create Success Rate metric
function createSuccessRateMetric(
	prometheusMetrics: PrometheusMetrics,
	isLocalized: boolean
): MetricData {
	const successTotal = prometheusMetrics.reservations_successful_total;
	const requestedTotal = prometheusMetrics.reservations_requested_total;
	const hasData = successTotal !== undefined && requestedTotal !== undefined;
	const successRate = hasData
		? (successTotal / requestedTotal) * PERCENT_MULTIPLIER
		: SUCCESS_RATE_DEMO_PERCENT;

	return {
		title: i18n.getMessage("kpi_success_rate", isLocalized),
		value: hasData
			? `${successRate.toFixed(1)}%`
			: `${SUCCESS_RATE_DEMO_PERCENT}%`,
		description: hasData
			? i18n.getMessage("kpi_operational_rate", isLocalized)
			: i18n.getMessage("kpi_demo_data", isLocalized),
		icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
		progress: successRate,
		variant:
			hasData && successRate < SUCCESS_RATE_WARNING_THRESHOLD
				? ("warning" as const)
				: ("success" as const),
		hasTooltip: true,
		tooltipContent: i18n.getMessage("tooltip_success_rate", isLocalized),
	};
}

export function KPICards({
	stats,
	prometheusMetrics,
	isLocalized,
}: KPICardsProps) {
	const kpiData: MetricData[] = [
		{
			title: i18n.getMessage("kpi_total_reservations", isLocalized),
			value: stats.totalReservations.toLocaleString(),
			description: i18n.getMessage("kpi_this_period", isLocalized),
			icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
			...(stats.trends?.totalReservations && {
				trend: {
					value: Math.abs(stats.trends.totalReservations.percentChange),
					isPositive: stats.trends.totalReservations.isPositive,
				},
			}),
			hasTooltip: true,
			tooltipContent: i18n.getMessage(
				"kpi_total_reservations_tooltip",
				isLocalized
			),
			variant: "default" as const,
		},
		{
			title: i18n.getMessage("kpi_active_customers", isLocalized),
			value: stats.activeCustomers.toLocaleString(),
			description: i18n.getMessage("kpi_active_customers_desc", isLocalized),
			icon: <Users className="h-4 w-4 text-muted-foreground" />,
			hasTooltip: true,
			tooltipContent: i18n.getMessage(
				"kpi_active_customers_tooltip",
				isLocalized
			),
			variant: "success" as const,
		},
		{
			title: i18n.getMessage("kpi_cancellations", isLocalized),
			value: stats.totalCancellations.toLocaleString(),
			description: i18n.getMessage("kpi_this_period", isLocalized),
			icon: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
			...(stats.trends?.cancellations && {
				trend: {
					value: Math.abs(stats.trends.cancellations.percentChange),
					isPositive: stats.trends.cancellations.isPositive,
				},
			}),
			hasTooltip: true,
			tooltipContent: i18n.getMessage("kpi_cancellations_tooltip", isLocalized),
			variant: "warning" as const,
		},
		{
			title: i18n.getMessage("kpi_conversion_rate", isLocalized),
			value: `${stats.conversionRate.toFixed(1)}%`,
			description: i18n.getMessage("kpi_conversation_to_booking", isLocalized),
			icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
			trend: {
				value: 3.8,
				isPositive: true,
			},
			progress: stats.conversionRate,
			variant: "success" as const,
		},
		{
			title: i18n.getMessage("kpi_returning_rate", isLocalized),
			value: `${stats.returningRate.toFixed(1)}%`,
			description: i18n.getMessage("kpi_customer_retention", isLocalized),
			icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
			trend: {
				value: 2.1,
				isPositive: true,
				label: i18n.getMessage("kpi_improvement", isLocalized),
			},
			progress: stats.returningRate,
			variant: "default" as const,
		},
		{
			title: i18n.getMessage("kpi_avg_response_time", isLocalized),
			value: `${stats.avgResponseTime.toFixed(1)}${i18n.getMessage("msg_minutes", isLocalized)}`,
			description: i18n.getMessage("response_time_calculated", isLocalized),
			icon: <Clock className="h-4 w-4 text-muted-foreground" />,
			...(stats.trends?.avgResponseTime && {
				trend: {
					value: Math.abs(stats.trends.avgResponseTime.percentChange),
					isPositive: stats.trends.avgResponseTime.isPositive,
				},
			}),
			hasTooltip: true,
			tooltipContent: i18n.getMessage(
				"kpi_avg_response_time_tooltip",
				isLocalized
			),
			progress:
				PERCENT_MULTIPLIER - stats.avgResponseTime * RESPONSE_TIME_DIVISOR,
			variant: "default" as const,
		},
		{
			title: i18n.getMessage("kpi_returning_customers", isLocalized),
			value: stats.returningCustomers.toLocaleString(),
			description: i18n.getMessage(
				"kpi_customers_with_multiple_bookings",
				isLocalized
			),
			icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
			trend: {
				value: 5.2,
				isPositive: true,
			},
			variant: "success" as const,
		},
		{
			title: i18n.getMessage("kpi_avg_followups", isLocalized),
			value: stats.avgFollowups.toFixed(1),
			description: i18n.getMessage(
				"kpi_additional_bookings_per_returning_customer",
				isLocalized
			),
			icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
			...(stats.trends?.avgFollowups && {
				trend: {
					value: Math.abs(stats.trends.avgFollowups.percentChange),
					isPositive: stats.trends.avgFollowups.isPositive,
				},
			}),
			hasTooltip: true,
			tooltipContent: i18n.getMessage("kpi_avg_followups_tooltip", isLocalized),
			variant: "default" as const,
		},
		{
			title: i18n.getMessage("kpi_unique_customers", isLocalized),
			value: stats.uniqueCustomers.toLocaleString(),
			description: i18n.getMessage("kpi_this_period", isLocalized),
			icon: <Users className="h-4 w-4 text-muted-foreground" />,
			...(stats.trends?.uniqueCustomers && {
				trend: {
					value: Math.abs(stats.trends.uniqueCustomers.percentChange),
					isPositive: stats.trends.uniqueCustomers.isPositive,
				},
			}),
			hasTooltip: true,
			tooltipContent: i18n.getMessage(
				"kpi_unique_customers_tooltip",
				isLocalized
			),
			variant: "success" as const,
		},
	];

	// System metrics if available
	const systemMetrics: MetricData[] =
		prometheusMetrics && Object.keys(prometheusMetrics).length > 0
			? [
					createCPUMetric(prometheusMetrics, isLocalized),
					createMemoryMetric(prometheusMetrics, isLocalized),
					createSuccessRateMetric(prometheusMetrics, isLocalized),
				]
			: [];

	const allMetrics = [...kpiData, ...systemMetrics];

	return (
		<div className="space-y-4">
			{/* Section Title */}
			<h2 className="font-semibold text-xl">
				{i18n.getMessage("kpi_performance_metrics", isLocalized)}
			</h2>

			{/* KPI Grid */}
			<div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{allMetrics.map((metric, index) => (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="h-full"
						initial={{ opacity: 0, y: ANIMATION_Y_OFFSET }}
						key={metric.title}
						transition={{
							delay: index * ANIMATION_DELAY_MULTIPLIER,
							duration: ANIMATION_DURATION,
						}}
					>
						<KPICard
							description={metric.description}
							icon={metric.icon}
							isLocalized={isLocalized}
							title={metric.title}
							value={metric.value}
							variant={metric.variant || "default"}
							{...(metric.trend ? { trend: metric.trend } : {})}
							{...(typeof metric.progress === "number"
								? { progress: metric.progress }
								: {})}
							{...(metric.hasTooltip === true ? { hasTooltip: true } : {})}
							{...(typeof metric.tooltipContent === "string"
								? { tooltipContent: metric.tooltipContent }
								: {})}
						/>
					</motion.div>
				))}
			</div>
		</div>
	);
}
