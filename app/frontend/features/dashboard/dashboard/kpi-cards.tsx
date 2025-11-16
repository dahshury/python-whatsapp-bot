"use client";

import { i18n } from "@shared/libs/i18n";
import { Badge } from "@ui/badge";
import { motion } from "framer-motion";
import { Cpu, HardDrive, HelpCircle, UserCheck } from "lucide-react";
import type {
  DashboardStats,
  PrometheusMetrics,
} from "@/features/dashboard/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { MagicCard } from "@/shared/ui/magicui/magic-card";
import { Progress } from "@/shared/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const CPU_USAGE_FALLBACK_PERCENT = 45.2;
const CPU_USAGE_WARNING_THRESHOLD_PERCENT = 80;
const BYTES_PER_KIB = 1024;
const BYTES_PER_MIB = BYTES_PER_KIB * BYTES_PER_KIB;
const BYTES_PER_GIB = BYTES_PER_MIB * BYTES_PER_KIB;
const MEMORY_USAGE_FALLBACK_GIB = 0.5;
const KPI_CARD_ANIMATION_DURATION = 0.4;
const KPI_CARD_ANIMATION_OFFSET = 20;
const KPI_GRID_ANIMATION_DELAY_STEP = 0.05;

const formatMemoryUsage = (bytes?: number) => {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) {
    return `${MEMORY_USAGE_FALLBACK_GIB.toFixed(1)}GB`;
  }

  return `${(bytes / BYTES_PER_GIB).toFixed(1)}GB`;
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
          <CardContent className="space-y-3">
            <div className="font-bold text-2xl transition-all duration-300 will-change-contents">
              {value}
            </div>
            <div className="flex min-h-[2.5rem] items-center justify-between">
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
            {progress !== undefined && (
              <div>
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

  // Removed duplicate metrics that are now shown in AnalyticsDashboard:
  // - kpi_total_reservations
  // - kpi_active_customers
  // - kpi_cancellations
  // - kpi_conversion_rate
  // - kpi_avg_response_time
  // - kpi_unique_customers
  // - kpi_returning_customers
  // - kpi_avg_followups
  // - kpi_success_rate (moved to OperationMetrics)

  // Only keep metrics that don't have graphs or are system-specific
  const kpiData: MetricData[] = [
    {
      title: i18n.getMessage("kpi_returning_rate", isLocalized),
      value: `${stats.returningRate.toFixed(1)}%`,
      description: i18n.getMessage("kpi_customer_retention", isLocalized),
      icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
      progress: stats.returningRate,
      variant: "default" as const,
    },
  ];

  // System metrics if available (excluding success rate - it's in OperationMetrics)
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
        ]
      : [];

  const allMetrics = [...kpiData, ...systemMetrics];

  // Don't render if no metrics
  if (allMetrics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards - Stacked in one row */}
      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-3">
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
