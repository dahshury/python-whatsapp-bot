"use client";

import { i18n } from "@shared/libs/i18n";
import {
  Calendar,
  Clock,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DashboardData } from "@/features/dashboard/types";

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number; payload?: { name: string; uv: number } }>;
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length && payload[0]) {
    const value = payload[0].value;
    const displayValue =
      typeof value === "number"
        ? value % 1 === 0
          ? value.toLocaleString()
          : value.toFixed(1)
        : String(value);

    return (
      <div className="rounded-lg border border-border/60 bg-popover/95 p-2 text-sm shadow-md backdrop-blur-sm">
        {label && (
          <p className="mb-1 font-medium text-popover-foreground">{label}</p>
        )}
        <p className="text-popover-foreground">{displayValue}</p>
      </div>
    );
  }
  return null;
};

type StatCardProps = {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
  icon: React.ComponentType<{ className?: string }>;
  chartData: Array<{ name: string; uv: number }>;
};

function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  chartData,
}: StatCardProps) {
  const chartColor = changeType === "positive" ? "#4ade80" : "#f87171";
  const chartRef = useRef<HTMLDivElement>(null);

  // Fix for recharts className.split error
  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement) return;

    const fixClassName = (element: Element) => {
      if (!element) return;

      // Handle SVG elements
      if (element instanceof SVGElement) {
        const classAttr = element.getAttribute("class");
        if (classAttr === null) {
          element.setAttribute("class", "");
        }
      }
      // Handle HTML elements
      else if (element instanceof HTMLElement) {
        if (!element.className) {
          element.className = "";
        } else if (typeof element.className !== "string") {
          element.className = String(element.className || "");
        }
      }
    };

    const observer = new MutationObserver(() => {
      const allElements = chartElement.querySelectorAll("*");
      allElements.forEach(fixClassName);
    });

    observer.observe(chartElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    // Initial fix
    const allElements = chartElement.querySelectorAll("*");
    allElements.forEach(fixClassName);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="group hover:-translate-y-1 transform cursor-pointer rounded-2xl border border-border/60 bg-card/70 p-5 shadow-lg transition-all duration-300 ease-in-out hover:border-border hover:bg-card/90">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-base text-muted-foreground">{title}</h3>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="flex flex-col">
          <p className="font-bold text-3xl text-foreground tracking-tighter">
            {value}
          </p>
          <p
            className={`mt-1 text-xs ${
              changeType === "positive"
                ? "text-green-500 dark:text-green-400"
                : "text-red-500 dark:text-red-400"
            }`}
          >
            {change}
          </p>
        </div>
        <div className="h-12 w-28" ref={chartRef}>
          <ResponsiveContainer height="100%" width="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <defs>
                <linearGradient
                  id={`colorUv-${title}`}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "rgba(128, 128, 128, 0.2)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
              />
              <Line
                dataKey="uv"
                dot={false}
                fill={`url(#colorUv-${title})`}
                fillOpacity={1}
                isAnimationActive={false}
                stroke={chartColor}
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

type AnalyticsDashboardProps = {
  safeStats: DashboardData["stats"];
  dailyTrends?: DashboardData["dailyTrends"];
  isLocalized: boolean;
};

export function AnalyticsDashboard({
  safeStats,
  dailyTrends,
  isLocalized,
}: AnalyticsDashboardProps) {
  // Generate chart data for reservations using actual dailyTrends
  const generateReservationsChartData = (): Array<{
    name: string;
    uv: number;
  }> => {
    if (dailyTrends && dailyTrends.length > 0) {
      return dailyTrends.map((day, index) => ({
        name:
          dailyTrends.length > 7
            ? new Date(day.date).toLocaleDateString(
                isLocalized ? "ar-SA" : "en-US",
                { month: "short", day: "numeric" }
              )
            : `Day ${index + 1}`,
        uv: day.reservations,
      }));
    }
    // Fallback: generate trend based on current value and trend percentage
    return generateTrendData(
      safeStats.totalReservations,
      safeStats.trends?.totalReservations
    );
  };

  // Generate chart data for active customers (not in dailyTrends, use trend)
  const generateActiveCustomersChartData = (): Array<{
    name: string;
    uv: number;
  }> => {
    if (dailyTrends && dailyTrends.length > 0) {
      // Estimate active customers trend from reservations trend
      // Active customers typically correlate with reservations
      const totalReservations = dailyTrends.reduce(
        (sum, day) => sum + day.reservations,
        0
      );
      const minReservations = Math.min(
        ...dailyTrends.map((day) => day.reservations)
      );
      const maxReservations = Math.max(
        ...dailyTrends.map((day) => day.reservations)
      );
      const reservationRange = maxReservations - minReservations;

      // Calculate estimated customers per day based on reservation proportion
      // Scale from the total active customers based on how reservations vary
      return dailyTrends.map((day, index) => {
        let estimatedCustomers: number;

        if (reservationRange > 0 && totalReservations > 0) {
          // Use reservation proportion to estimate customer variation
          // More reservations = more active customers (but not linearly)
          const reservationProportion = day.reservations / totalReservations;
          // Scale the total active customers by reservation proportion
          // Add some variation to show trend
          const baseEstimate =
            safeStats.activeCustomers *
            reservationProportion *
            dailyTrends.length;
          // Add trend variation based on position in the period
          const trendFactor = safeStats.trends?.activeCustomers?.isPositive
            ? 1.05
            : 0.95;
          const positionFactor =
            1 + (index / (dailyTrends.length - 1) - 0.5) * 0.2;
          estimatedCustomers = baseEstimate * trendFactor * positionFactor;
        } else {
          // If no variation in reservations, distribute evenly with small trend
          const trendFactor = safeStats.trends?.activeCustomers?.isPositive
            ? 1.02
            : 0.98;
          estimatedCustomers =
            (safeStats.activeCustomers / dailyTrends.length) *
            trendFactor ** index;
        }

        return {
          name:
            dailyTrends.length > 7
              ? new Date(day.date).toLocaleDateString(
                  isLocalized ? "ar-SA" : "en-US",
                  { month: "short", day: "numeric" }
                )
              : `Day ${index + 1}`,
          uv: Math.max(1, Math.round(estimatedCustomers)),
        };
      });
    }
    return generateTrendData(
      safeStats.activeCustomers,
      safeStats.trends?.activeCustomers
    );
  };

  // Generate chart data for conversion rate (percentage, use trend)
  const generateConversionRateChartData = (): Array<{
    name: string;
    uv: number;
  }> => {
    if (dailyTrends && dailyTrends.length > 0) {
      // Calculate estimated conversion rate per day based on reservations trend
      const baseRate = safeStats.conversionRate;
      const avgReservations =
        dailyTrends.reduce((sum, day) => sum + day.reservations, 0) /
        dailyTrends.length;
      return dailyTrends.map((day, index) => {
        // Estimate conversion rate based on reservation volume relative to average
        const volumeFactor =
          avgReservations > 0 ? day.reservations / avgReservations : 1;
        const estimatedRate = baseRate * (0.8 + volumeFactor * 0.4); // Vary between 80%-120% of base
        return {
          name:
            dailyTrends.length > 7
              ? new Date(day.date).toLocaleDateString(
                  isLocalized ? "ar-SA" : "en-US",
                  { month: "short", day: "numeric" }
                )
              : `Day ${index + 1}`,
          uv: Math.round(estimatedRate * 10) / 10, // Round to 1 decimal
        };
      });
    }
    return generateTrendData(
      safeStats.conversionRate,
      safeStats.trends?.conversionRate
    );
  };

  // Generate chart data for response time (use trend)
  const generateResponseTimeChartData = (): Array<{
    name: string;
    uv: number;
  }> => {
    if (dailyTrends && dailyTrends.length > 0) {
      // Estimate response time trend (inverse correlation with reservations - more reservations = slower response)
      const avgReservations =
        dailyTrends.reduce((sum, day) => sum + day.reservations, 0) /
        dailyTrends.length;
      const baseResponseTime = safeStats.avgResponseTime * 60; // Convert to seconds
      return dailyTrends.map((day, index) => {
        // More reservations might mean slightly slower response time
        const volumeFactor =
          avgReservations > 0 ? day.reservations / avgReservations : 1;
        const estimatedTime = baseResponseTime * (0.9 + volumeFactor * 0.2); // Vary between 90%-110% of base
        return {
          name:
            dailyTrends.length > 7
              ? new Date(day.date).toLocaleDateString(
                  isLocalized ? "ar-SA" : "en-US",
                  { month: "short", day: "numeric" }
                )
              : `Day ${index + 1}`,
          uv: Math.round(estimatedTime * 10) / 10, // Round to 1 decimal
        };
      });
    }
    return generateTrendData(
      safeStats.avgResponseTime * 60,
      safeStats.trends?.avgResponseTime
    );
  };

  // Helper to generate trend data when dailyTrends is not available
  const generateTrendData = (
    baseValue: number,
    trend?: { percentChange: number; isPositive: boolean }
  ): Array<{ name: string; uv: number }> => {
    const dataPoints = 7;
    const values: number[] = [];
    const totalChange = trend ? trend.percentChange / 100 : 0;

    for (let i = 0; i < dataPoints; i++) {
      // Create a smooth trend from start to end
      const progress = i / (dataPoints - 1);
      const trendValue = baseValue * (1 + totalChange * progress);
      // Add deterministic variation based on index (no Math.random for SSR compatibility)
      const variation = Math.sin(i * 0.5) * 0.05; // ±5% smooth variation
      values.push(
        Math.max(0, Math.round(trendValue * (1 + variation) * 100) / 100)
      );
    }

    return values.map((value, index) => ({
      name: `Day ${index + 1}`,
      uv: value,
    }));
  };

  // Generate chart data for cancellations
  const generateCancellationsChartDataForCard = (): Array<{
    name: string;
    uv: number;
  }> => {
    if (dailyTrends && dailyTrends.length > 0) {
      return dailyTrends.map((day, index) => ({
        name:
          dailyTrends.length > 7
            ? new Date(day.date).toLocaleDateString(
                isLocalized ? "ar-SA" : "en-US",
                { month: "short", day: "numeric" }
              )
            : `Day ${index + 1}`,
        uv: day.cancellations,
      }));
    }
    return generateTrendData(
      safeStats.totalCancellations,
      safeStats.trends?.cancellations
    );
  };

  // Generate chart data for unique customers
  const generateUniqueCustomersChartData = (): Array<{
    name: string;
    uv: number;
  }> => {
    if (dailyTrends && dailyTrends.length > 0) {
      // Estimate unique customers from reservations (new customers correlate with new reservations)
      const totalReservations = dailyTrends.reduce(
        (sum, day) => sum + day.reservations,
        0
      );
      return dailyTrends.map((day, index) => {
        const reservationProportion =
          totalReservations > 0
            ? day.reservations / totalReservations
            : 1 / dailyTrends.length;
        const estimatedUnique =
          safeStats.uniqueCustomers *
          reservationProportion *
          dailyTrends.length;
        const trendFactor = safeStats.trends?.uniqueCustomers?.isPositive
          ? 1.02
          : 0.98;
        const positionFactor =
          1 + (index / (dailyTrends.length - 1) - 0.5) * 0.15;
        return {
          name:
            dailyTrends.length > 7
              ? new Date(day.date).toLocaleDateString(
                  isLocalized ? "ar-SA" : "en-US",
                  { month: "short", day: "numeric" }
                )
              : `Day ${index + 1}`,
          uv: Math.max(
            1,
            Math.round(estimatedUnique * trendFactor * positionFactor)
          ),
        };
      });
    }
    return generateTrendData(
      safeStats.uniqueCustomers,
      safeStats.trends?.uniqueCustomers
    );
  };

  // Generate chart data for returning customers
  const generateReturningCustomersChartData = (): Array<{
    name: string;
    uv: number;
  }> => {
    if (dailyTrends && dailyTrends.length > 0) {
      // Returning customers correlate with total reservations
      const totalReservations = dailyTrends.reduce(
        (sum, day) => sum + day.reservations,
        0
      );
      return dailyTrends.map((day, index) => {
        const reservationProportion =
          totalReservations > 0
            ? day.reservations / totalReservations
            : 1 / dailyTrends.length;
        const estimatedReturning =
          safeStats.returningCustomers *
          reservationProportion *
          dailyTrends.length;
        return {
          name:
            dailyTrends.length > 7
              ? new Date(day.date).toLocaleDateString(
                  isLocalized ? "ar-SA" : "en-US",
                  { month: "short", day: "numeric" }
                )
              : `Day ${index + 1}`,
          uv: Math.max(1, Math.round(estimatedReturning)),
        };
      });
    }
    return generateTrendData(safeStats.returningCustomers, undefined);
  };

  // Generate chart data for avg followups
  const generateAvgFollowupsChartData = (): Array<{
    name: string;
    uv: number;
  }> => {
    if (dailyTrends && dailyTrends.length > 0) {
      // Followups correlate with returning customers activity
      const baseFollowups = safeStats.avgFollowups;
      const avgReservations =
        dailyTrends.reduce((sum, day) => sum + day.reservations, 0) /
        dailyTrends.length;
      return dailyTrends.map((day, index) => {
        const volumeFactor =
          avgReservations > 0 ? day.reservations / avgReservations : 1;
        const trendFactor = safeStats.trends?.avgFollowups?.isPositive
          ? 1.01
          : 0.99;
        const estimatedFollowups =
          baseFollowups * (0.9 + volumeFactor * 0.2) * trendFactor ** index;
        return {
          name:
            dailyTrends.length > 7
              ? new Date(day.date).toLocaleDateString(
                  isLocalized ? "ar-SA" : "en-US",
                  { month: "short", day: "numeric" }
                )
              : `Day ${index + 1}`,
          uv: Math.round(estimatedFollowups * 10) / 10,
        };
      });
    }
    return generateTrendData(
      safeStats.avgFollowups,
      safeStats.trends?.avgFollowups
    );
  };

  const analyticsData = [
    {
      title: i18n.getMessage("kpi_total_reservations", isLocalized),
      value: safeStats.totalReservations.toLocaleString(),
      change: safeStats.trends?.totalReservations
        ? `${safeStats.trends.totalReservations.isPositive ? "+" : "–"}${Math.abs(
            safeStats.trends.totalReservations.percentChange
          ).toFixed(1)}%`
        : i18n.getMessage("kpi_this_period", isLocalized),
      changeType: (safeStats.trends?.totalReservations?.isPositive !== false
        ? "positive"
        : "negative") as "positive" | "negative",
      icon: Calendar,
      chartData: generateReservationsChartData(),
    },
    {
      title: i18n.getMessage("kpi_active_customers", isLocalized),
      value: safeStats.activeCustomers.toLocaleString(),
      change: safeStats.trends?.activeCustomers
        ? `${safeStats.trends.activeCustomers.isPositive ? "+" : "–"}${Math.abs(
            safeStats.trends.activeCustomers.percentChange
          ).toFixed(1)}%`
        : i18n.getMessage("kpi_active_customers_desc", isLocalized),
      changeType: (safeStats.trends?.activeCustomers?.isPositive !== false
        ? "positive"
        : "negative") as "positive" | "negative",
      icon: Users,
      chartData: generateActiveCustomersChartData(),
    },
    {
      title: i18n.getMessage("kpi_cancellations", isLocalized),
      value: safeStats.totalCancellations.toLocaleString(),
      change: safeStats.trends?.cancellations
        ? `${safeStats.trends.cancellations.isPositive ? "+" : "–"}${Math.abs(
            safeStats.trends.cancellations.percentChange
          ).toFixed(1)}%`
        : i18n.getMessage("kpi_this_period", isLocalized),
      changeType: (safeStats.trends?.cancellations?.isPositive === false
        ? "positive"
        : "negative") as "positive" | "negative", // Lower cancellations is better
      icon: MessageSquare,
      chartData: generateCancellationsChartDataForCard(),
    },
    {
      title: i18n.getMessage("kpi_conversion_rate", isLocalized),
      value: `${safeStats.conversionRate.toFixed(1)}%`,
      change: safeStats.trends?.conversionRate
        ? `${safeStats.trends.conversionRate.isPositive ? "+" : "–"}${Math.abs(
            safeStats.trends.conversionRate.percentChange
          ).toFixed(1)}%`
        : i18n.getMessage("kpi_conversation_to_booking", isLocalized),
      changeType: (safeStats.trends?.conversionRate?.isPositive !== false
        ? "positive"
        : "negative") as "positive" | "negative",
      icon: TrendingUp,
      chartData: generateConversionRateChartData(),
    },
    {
      title: i18n.getMessage("kpi_avg_response_time", isLocalized),
      value: `${(safeStats.avgResponseTime * 60).toFixed(1)}${i18n.getMessage("msg_seconds", isLocalized)}`,
      change: safeStats.trends?.avgResponseTime
        ? `${safeStats.trends.avgResponseTime.isPositive ? "+" : "–"}${Math.abs(
            safeStats.trends.avgResponseTime.percentChange
          ).toFixed(1)}%`
        : i18n.getMessage("response_time_calculated", isLocalized),
      changeType: (safeStats.trends?.avgResponseTime?.isPositive === false
        ? "positive"
        : "negative") as "positive" | "negative", // Lower response time is better, so inverted
      icon: Clock,
      chartData: generateResponseTimeChartData(),
    },
    {
      title: i18n.getMessage("kpi_unique_customers", isLocalized),
      value: safeStats.uniqueCustomers.toLocaleString(),
      change: safeStats.trends?.uniqueCustomers
        ? `${safeStats.trends.uniqueCustomers.isPositive ? "+" : "–"}${Math.abs(
            safeStats.trends.uniqueCustomers.percentChange
          ).toFixed(1)}%`
        : i18n.getMessage("kpi_this_period", isLocalized),
      changeType: (safeStats.trends?.uniqueCustomers?.isPositive !== false
        ? "positive"
        : "negative") as "positive" | "negative",
      icon: Users,
      chartData: generateUniqueCustomersChartData(),
    },
    {
      title: i18n.getMessage("kpi_returning_customers", isLocalized),
      value: safeStats.returningCustomers.toLocaleString(),
      change: i18n.getMessage(
        "kpi_customers_with_multiple_bookings",
        isLocalized
      ),
      changeType: "positive" as const,
      icon: UserCheck,
      chartData: generateReturningCustomersChartData(),
    },
    {
      title: i18n.getMessage("kpi_avg_followups", isLocalized),
      value: safeStats.avgFollowups.toFixed(1),
      change: safeStats.trends?.avgFollowups
        ? `${safeStats.trends.avgFollowups.isPositive ? "+" : "–"}${Math.abs(
            safeStats.trends.avgFollowups.percentChange
          ).toFixed(1)}%`
        : i18n.getMessage(
            "kpi_additional_bookings_per_returning_customer",
            isLocalized
          ),
      changeType: (safeStats.trends?.avgFollowups?.isPositive !== false
        ? "positive"
        : "negative") as "positive" | "negative",
      icon: TrendingUp,
      chartData: generateAvgFollowupsChartData(),
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsData.map((data) => (
          <StatCard
            change={data.change}
            changeType={data.changeType}
            chartData={data.chartData}
            icon={data.icon}
            key={data.title}
            title={data.title}
            value={data.value}
          />
        ))}
      </div>
    </div>
  );
}
