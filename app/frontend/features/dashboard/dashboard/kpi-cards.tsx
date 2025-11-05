"use client";

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
import type {
  DashboardStats,
  PrometheusMetrics,
} from "@/features/dashboard/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { MagicCard } from "@/shared/ui/magicui/magic-card";
import { Progress } from "@/shared/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const RESPONSE_TIME_PROGRESS_BASE = 100;
const RESPONSE_TIME_PROGRESS_DECAY = 2;
const CPU_USAGE_FALLBACK_PERCENT = 45.2;
const CPU_USAGE_WARNING_THRESHOLD_PERCENT = 80;
const BYTES_PER_KIB = 1024;
const BYTES_PER_MIB = BYTES_PER_KIB * BYTES_PER_KIB;
const BYTES_PER_GIB = BYTES_PER_MIB * BYTES_PER_KIB;
const MEMORY_USAGE_FALLBACK_GIB = 0.5;
const SUCCESS_RATE_PERCENT_BASE = 100;
const SUCCESS_RATE_WARNING_THRESHOLD_PERCENT = 95;
const SUCCESS_RATE_FALLBACK_PERCENT = 96.8;
const KPI_CARD_ANIMATION_DURATION = 0.4;
const KPI_CARD_ANIMATION_OFFSET = 20;
const KPI_GRID_ANIMATION_DELAY_STEP = 0.05;

const getResponseTimeProgress = (avgResponseTime: number) =>
  Math.max(
    0,
    RESPONSE_TIME_PROGRESS_BASE - avgResponseTime * RESPONSE_TIME_PROGRESS_DECAY
  );

const formatMemoryUsage = (bytes?: number) => {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) {
    return `${MEMORY_USAGE_FALLBACK_GIB.toFixed(1)}GB`;
  }

  return `${(bytes / BYTES_PER_GIB).toFixed(1)}GB`;
};

const computeSuccessRate = (successTotal?: number, requestedTotal?: number) => {
  if (
    typeof successTotal !== "number" ||
    typeof requestedTotal !== "number" ||
    requestedTotal <= 0
  ) {
    return;
  }

  return (successTotal / requestedTotal) * SUCCESS_RATE_PERCENT_BASE;
};

const getSuccessVariant = (
  successRate?: number
): "default" | "success" | "warning" | "danger" => {
  if (typeof successRate !== "number") {
    return "success";
  }

  return successRate < SUCCESS_RATE_WARNING_THRESHOLD_PERCENT
    ? "warning"
    : "success";
};

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
      initial={{ opacity: 0, y: KPI_CARD_ANIMATION_OFFSET }}
      transition={{ duration: KPI_CARD_ANIMATION_DURATION }}
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

export function KPICards({
  stats,
  prometheusMetrics,
  isLocalized,
}: KPICardsProps) {
  const cpuPercent =
    typeof prometheusMetrics.cpu_percent === "number"
      ? prometheusMetrics.cpu_percent
      : CPU_USAGE_FALLBACK_PERCENT;
  const cpuHasLiveMetrics = typeof prometheusMetrics.cpu_percent === "number";
  const cpuDescriptionKey = cpuHasLiveMetrics
    ? "kpi_current_usage"
    : "kpi_demo_data";
  const cpuVariant: "default" | "success" | "warning" | "danger" =
    cpuPercent > CPU_USAGE_WARNING_THRESHOLD_PERCENT ? "danger" : "default";

  const memoryBytes =
    typeof prometheusMetrics.memory_bytes === "number"
      ? prometheusMetrics.memory_bytes
      : undefined;
  const memoryDescriptionKey =
    memoryBytes !== undefined ? "kpi_current_usage" : "kpi_demo_data";
  const memoryValue = formatMemoryUsage(memoryBytes);

  const successRate = computeSuccessRate(
    prometheusMetrics.reservations_successful_total,
    prometheusMetrics.reservations_requested_total
  );
  const successRateDisplay = successRate ?? SUCCESS_RATE_FALLBACK_PERCENT;
  const successDescriptionKey =
    successRate !== undefined ? "kpi_operational_rate" : "kpi_demo_data";
  const successVariant = getSuccessVariant(successRate);
  const successProgress = successRateDisplay;

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
      progress: getResponseTimeProgress(stats.avgResponseTime),
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
          {
            title: i18n.getMessage("kpi_cpu_usage", isLocalized),
            value: `${cpuPercent.toFixed(1)}%`,
            description: i18n.getMessage(cpuDescriptionKey, isLocalized),
            icon: <Cpu className="h-4 w-4 text-muted-foreground" />,
            progress: cpuPercent,
            variant: cpuVariant,
          },
          {
            title: i18n.getMessage("kpi_memory_usage", isLocalized),
            value: memoryValue,
            description: i18n.getMessage(memoryDescriptionKey, isLocalized),
            icon: <HardDrive className="h-4 w-4 text-muted-foreground" />,
            variant: "default" as const,
          },
          {
            title: i18n.getMessage("kpi_success_rate", isLocalized),
            value: `${successRateDisplay.toFixed(1)}%`,
            description: i18n.getMessage(successDescriptionKey, isLocalized),
            icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
            progress: successProgress,
            variant: successVariant,
            hasTooltip: true,
            tooltipContent: i18n.getMessage(
              "tooltip_success_rate",
              isLocalized
            ),
          },
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
            initial={{ opacity: 0, y: KPI_CARD_ANIMATION_OFFSET }}
            key={metric.title}
            transition={{
              delay: index * KPI_GRID_ANIMATION_DELAY_STEP,
              duration: KPI_CARD_ANIMATION_DURATION,
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
