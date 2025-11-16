"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import type { DailyData } from "@/features/dashboard/types";
import { i18n } from "@/shared/libs/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import type { ChartConfig } from "@/shared/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";

type DailyTrendsOverviewProps = {
  dailyTrends: DailyData[];
  isLocalized: boolean;
};

// Theme tokens (stable strings so we don't re-read computed styles every render)
const COLORS = {
  reservations: "hsl(var(--chart-1))",
  cancellations: "hsl(var(--chart-2))",
  modifications: "hsl(var(--chart-3))",
  border: "hsl(var(--border))",
  foreground: "hsl(var(--foreground))",
  card: "hsl(var(--card))",
} as const;

const INSTANCE_ID_RADIX = 36;
const INSTANCE_ID_SLICE_START = 2;

export function DailyTrendsOverview({
  dailyTrends,
  isLocalized,
}: DailyTrendsOverviewProps) {
  // Stable instance id for gradient defs
  const instanceId = React.useMemo(
    () =>
      Math.random().toString(INSTANCE_ID_RADIX).slice(INSTANCE_ID_SLICE_START),
    []
  );
  const fillResId = `fillRes_${instanceId}`;
  const fillCanId = `fillCan_${instanceId}`;
  const fillModId = `fillMod_${instanceId}`;

  // Map incoming data once; rely only on parent global filtering
  const chartData = React.useMemo(() => {
    return (dailyTrends || []).map((d) => {
      const dateObj = new Date(d.date);
      // Short localized label like Jan 05 / يناير 05
      const label = dateObj.toLocaleDateString(isLocalized ? "ar" : "en", {
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
  }, [dailyTrends, isLocalized]);

  const chartConfig: ChartConfig = React.useMemo(
    () => ({
      reservations: {
        label: i18n.getMessage("dashboard_reservations", isLocalized),
        color: "hsl(var(--chart-1))",
      },
      cancellations: {
        label: i18n.getMessage("kpi_cancellations", isLocalized),
        color: "hsl(var(--chart-2))",
      },
      modifications: {
        label: i18n.getMessage("operation_modifications", isLocalized),
        color: "hsl(var(--chart-3))",
      },
    }),
    [isLocalized]
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          {i18n.getMessage("chart_daily_trends_overview", isLocalized)}
        </CardTitle>
        <CardDescription>
          {i18n.getMessage("chart_showing_all_data", isLocalized)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[21.875rem] w-full" config={chartConfig}>
          <AreaChart
            data={chartData}
            margin={{ top: 16, right: 12, left: 12, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              stroke={COLORS.foreground}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
            <defs>
              <linearGradient id={fillResId} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-reservations)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-reservations)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id={fillCanId} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-cancellations)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-cancellations)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id={fillModId} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-modifications)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-modifications)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="modifications"
              fill={`url(#${fillModId})`}
              fillOpacity={0.4}
              isAnimationActive={false}
              name={i18n.getMessage("operation_modifications", isLocalized)}
              stroke="var(--color-modifications)"
              strokeDasharray="3 3"
              strokeWidth={0.8}
              type="monotone"
            />
            <Area
              dataKey="cancellations"
              fill={`url(#${fillCanId})`}
              fillOpacity={0.4}
              isAnimationActive={false}
              name={i18n.getMessage("kpi_cancellations", isLocalized)}
              stroke="var(--color-cancellations)"
              strokeDasharray="3 3"
              strokeWidth={0.8}
              type="monotone"
            />
            <Area
              dataKey="reservations"
              fill={`url(#${fillResId})`}
              fillOpacity={0.4}
              isAnimationActive={false}
              name={i18n.getMessage("dashboard_reservations", isLocalized)}
              stroke="var(--color-reservations)"
              strokeDasharray="3 3"
              strokeWidth={0.8}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
