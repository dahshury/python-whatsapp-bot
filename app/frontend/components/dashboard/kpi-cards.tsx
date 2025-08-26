"use client";

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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { i18n } from "@/lib/i18n";
import type { DashboardStats, PrometheusMetrics } from "@/types/dashboard";

interface KPICardsProps {
	stats: DashboardStats;
	prometheusMetrics: PrometheusMetrics;
	isRTL: boolean;
}

interface KPICardProps {
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
	isRTL?: boolean;
}

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
	isRTL: _isRTL,
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
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			className="h-full"
		>
			<Card className={`h-full flex flex-col ${getVariantClasses()}`}>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
					<CardTitle className="text-sm font-medium line-clamp-2 flex items-center gap-1">
						{title}
						{hasTooltip && tooltipContent && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="inline-flex items-center cursor-help">
										<HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
									</span>
								</TooltipTrigger>
								<TooltipContent
									side="top"
									align="start"
									sideOffset={10}
									className="max-w-xs bg-transparent bg-gradient-to-br from-chart-1/15 via-background/70 to-transparent backdrop-blur-md border border-border/40 shadow-lg"
								>
									<p className="text-sm opacity-90">{tooltipContent}</p>
								</TooltipContent>
							</Tooltip>
						)}
					</CardTitle>
					<div className="flex-shrink-0">{icon}</div>
				</CardHeader>
				<CardContent className="flex-1 flex flex-col justify-between">
					<div>
						<div className="text-2xl font-bold transition-all duration-300 will-change-contents">
							{value}
						</div>
						<div className="flex items-center justify-between mt-1 min-h-[2.5rem]">
							<p className="text-xs text-muted-foreground line-clamp-2 flex-1 mr-2">
								{description}
							</p>
							{trend && (
								<Badge
									variant={trend.isPositive ? "default" : "secondary"}
									className={`text-xs flex-shrink-0 ${
										trend.isPositive
											? "bg-chart-1/20 text-chart-1 hover:bg-chart-1/20"
											: "bg-destructive/20 text-destructive hover:bg-destructive/20"
									}`}
								>
									{trend.isPositive ? "+" : "-"}
									{trend.value.toFixed(1)}%{trend.label && ` ${trend.label}`}
								</Badge>
							)}
						</div>
					</div>
					{progress !== undefined && (
						<div className="mt-3">
							<Progress value={progress} className="h-2" />
						</div>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}

export function KPICards({ stats, prometheusMetrics, isRTL }: KPICardsProps) {
	const kpiData = [
		{
			title: i18n.getMessage("kpi_total_reservations", isRTL),
			value: stats.totalReservations.toLocaleString(),
			description: i18n.getMessage("kpi_this_period", isRTL),
			icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
			trend: stats.trends?.totalReservations
				? {
						value: Math.abs(stats.trends.totalReservations.percentChange),
						isPositive: stats.trends.totalReservations.isPositive,
					}
				: undefined,
			hasTooltip: true,
			tooltipContent: i18n.getMessage("kpi_total_reservations_tooltip", isRTL),
			variant: "default" as const,
		},
		{
			title: i18n.getMessage("kpi_active_customers", isRTL),
			value: stats.activeCustomers.toLocaleString(),
			description: i18n.getMessage("kpi_active_customers_desc", isRTL),
			icon: <Users className="h-4 w-4 text-muted-foreground" />,
			hasTooltip: true,
			tooltipContent: i18n.getMessage("kpi_active_customers_tooltip", isRTL),
			variant: "success" as const,
		},
		{
			title: i18n.getMessage("kpi_cancellations", isRTL),
			value: stats.totalCancellations.toLocaleString(),
			description: i18n.getMessage("kpi_this_period", isRTL),
			icon: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
			trend: stats.trends?.cancellations
				? {
						value: Math.abs(stats.trends.cancellations.percentChange),
						isPositive: stats.trends.cancellations.isPositive,
					}
				: undefined,
			hasTooltip: true,
			tooltipContent: i18n.getMessage("kpi_cancellations_tooltip", isRTL),
			variant: "warning" as const,
		},
		{
			title: i18n.getMessage("kpi_conversion_rate", isRTL),
			value: `${stats.conversionRate.toFixed(1)}%`,
			description: i18n.getMessage("kpi_conversation_to_booking", isRTL),
			icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
			trend: {
				value: 3.8,
				isPositive: true,
			},
			progress: stats.conversionRate,
			variant: "success" as const,
		},
		{
			title: i18n.getMessage("kpi_returning_rate", isRTL),
			value: `${stats.returningRate.toFixed(1)}%`,
			description: i18n.getMessage("kpi_customer_retention", isRTL),
			icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
			trend: {
				value: 2.1,
				isPositive: true,
				label: i18n.getMessage("kpi_improvement", isRTL),
			},
			progress: stats.returningRate,
			variant: "default" as const,
		},
		{
			title: i18n.getMessage("kpi_avg_response_time", isRTL),
			value: `${stats.avgResponseTime.toFixed(1)}${i18n.getMessage("msg_minutes", isRTL)}`,
			description: i18n.getMessage("response_time_calculated", isRTL),
			icon: <Clock className="h-4 w-4 text-muted-foreground" />,
			trend: stats.trends?.avgResponseTime
				? {
						value: Math.abs(stats.trends.avgResponseTime.percentChange),
						isPositive: stats.trends.avgResponseTime.isPositive,
					}
				: undefined,
			hasTooltip: true,
			tooltipContent: i18n.getMessage("kpi_avg_response_time_tooltip", isRTL),
			progress: Math.max(0, 100 - stats.avgResponseTime * 2),
			variant: "default" as const,
		},
		{
			title: i18n.getMessage("kpi_returning_customers", isRTL),
			value: stats.returningCustomers.toLocaleString(),
			description: i18n.getMessage(
				"kpi_customers_with_multiple_bookings",
				isRTL,
			),
			icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
			trend: {
				value: 5.2,
				isPositive: true,
			},
			variant: "success" as const,
		},
		{
			title: i18n.getMessage("kpi_avg_followups", isRTL),
			value: stats.avgFollowups.toFixed(1),
			description: i18n.getMessage(
				"kpi_additional_bookings_per_returning_customer",
				isRTL,
			),
			icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
			trend: stats.trends?.avgFollowups
				? {
						value: Math.abs(stats.trends.avgFollowups.percentChange),
						isPositive: stats.trends.avgFollowups.isPositive,
					}
				: undefined,
			hasTooltip: true,
			tooltipContent: i18n.getMessage("kpi_avg_followups_tooltip", isRTL),
			variant: "default" as const,
		},
		{
			title: i18n.getMessage("kpi_unique_customers", isRTL),
			value: stats.uniqueCustomers.toLocaleString(),
			description: i18n.getMessage("kpi_this_period", isRTL),
			icon: <Users className="h-4 w-4 text-muted-foreground" />,
			trend: stats.trends?.uniqueCustomers
				? {
						value: Math.abs(stats.trends.uniqueCustomers.percentChange),
						isPositive: stats.trends.uniqueCustomers.isPositive,
					}
				: undefined,
			hasTooltip: true,
			tooltipContent: i18n.getMessage("kpi_unique_customers_tooltip", isRTL),
			variant: "success" as const,
		},
	];

	// System metrics if available
	const systemMetrics =
		prometheusMetrics && Object.keys(prometheusMetrics).length > 0
			? [
					{
						title: i18n.getMessage("kpi_cpu_usage", isRTL),
						value:
							prometheusMetrics.cpu_percent !== undefined
								? `${prometheusMetrics.cpu_percent.toFixed(1)}%`
								: "45.2%",
						description:
							prometheusMetrics.cpu_percent !== undefined
								? i18n.getMessage("kpi_current_usage", isRTL)
								: i18n.getMessage("kpi_demo_data", isRTL),
						icon: <Cpu className="h-4 w-4 text-muted-foreground" />,
						progress: prometheusMetrics.cpu_percent || 45.2,
						variant:
							(prometheusMetrics.cpu_percent || 45.2) > 80
								? ("danger" as const)
								: ("default" as const),
					},
					{
						title: i18n.getMessage("kpi_memory_usage", isRTL),
						value:
							prometheusMetrics.memory_bytes !== undefined
								? `${(prometheusMetrics.memory_bytes / 1024 ** 3).toFixed(1)}GB`
								: "0.5GB",
						description:
							prometheusMetrics.memory_bytes !== undefined
								? i18n.getMessage("kpi_current_usage", isRTL)
								: i18n.getMessage("kpi_demo_data", isRTL),
						icon: <HardDrive className="h-4 w-4 text-muted-foreground" />,
						variant: "default" as const,
					},
					{
						title: i18n.getMessage("kpi_success_rate", isRTL),
						value:
							prometheusMetrics.reservations_successful_total !== undefined &&
							prometheusMetrics.reservations_requested_total !== undefined
								? `${((prometheusMetrics.reservations_successful_total / prometheusMetrics.reservations_requested_total) * 100).toFixed(1)}%`
								: "96.8%",
						description:
							prometheusMetrics.reservations_successful_total !== undefined
								? i18n.getMessage("kpi_operational_rate", isRTL)
								: i18n.getMessage("kpi_demo_data", isRTL),
						icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
						progress:
							prometheusMetrics.reservations_successful_total !== undefined &&
							prometheusMetrics.reservations_requested_total !== undefined
								? (prometheusMetrics.reservations_successful_total /
										prometheusMetrics.reservations_requested_total) *
									100
								: 96.8,
						variant:
							prometheusMetrics.reservations_successful_total !== undefined &&
							prometheusMetrics.reservations_requested_total !== undefined
								? (prometheusMetrics.reservations_successful_total /
										prometheusMetrics.reservations_requested_total) *
										100 <
									95
									? ("warning" as const)
									: ("success" as const)
								: ("success" as const),
						hasTooltip: true,
						tooltipContent: i18n.getMessage("tooltip_success_rate", isRTL),
					},
				]
			: [];

	const allMetrics = [...kpiData, ...systemMetrics];

	return (
		<div className="space-y-4">
			{/* Section Title */}
			<h2 className="text-xl font-semibold">
				{i18n.getMessage("kpi_performance_metrics", isRTL)}
			</h2>

			{/* KPI Grid */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 auto-rows-fr">
				{allMetrics.map((metric, index) => (
					<motion.div
						key={metric.title}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.05, duration: 0.4 }}
						className="h-full"
					>
						<KPICard
							title={metric.title}
							value={metric.value}
							description={metric.description}
							icon={metric.icon}
							trend={"trend" in metric ? metric.trend : undefined}
							progress={"progress" in metric ? metric.progress : undefined}
							variant={metric.variant}
							hasTooltip={
								"hasTooltip" in metric ? metric.hasTooltip : undefined
							}
							tooltipContent={
								"tooltipContent" in metric ? metric.tooltipContent : undefined
							}
							isRTL={isRTL}
						/>
					</motion.div>
				))}
			</div>
		</div>
	);
}
