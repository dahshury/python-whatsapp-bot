"use client";

import { motion } from "framer-motion";
import { useId, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildTypeDistributionChartConfig } from "@/features/dashboard/services/chart-config-builders";
import { BAR_TOP_RADIUS } from "@/features/dashboard/utils/chart-constants";
import { useThemeColors } from "@/shared/libs/hooks/use-theme-colors";
import { i18n } from "@/shared/libs/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";
import { getBarFillOpacity } from "./chart-utils";

// Add wrappers to avoid @types/recharts v1 typings conflict with Recharts v3
const XAxisComp = XAxis as unknown as React.ComponentType<
  Record<string, unknown>
>;
const YAxisComp = YAxis as unknown as React.ComponentType<
  Record<string, unknown>
>;

type TypeDistributionChartProps = {
  data: Array<{ label: string; current: number; previous: number }>;
  isLocalized: boolean;
  variant?: "full" | "compact";
};

export function TypeDistributionChart({
  data,
  isLocalized,
  variant = "full",
}: TypeDistributionChartProps) {
  const themeColors = useThemeColors();
  const patternId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const config = buildTypeDistributionChartConfig(isLocalized);

  const tooltipStyle = {
    backgroundColor: themeColors.card,
    border: `1px solid ${themeColors.border}`,
    borderRadius: "8px",
    fontSize: "12px",
    color: themeColors.foreground,
  };

  if (variant === "compact") {
    return (
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
                <BarChart data={data}>
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
    );
  }

  return (
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
          <ChartContainer className="h-[21.875rem] w-full" config={config}>
            <BarChart
              accessibilityLayer
              data={data}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <rect
                fill={`url(#${patternId})`}
                height="85%"
                width="100%"
                x="0"
                y="0"
              />
              <defs>
                <pattern
                  height="10"
                  id={patternId}
                  patternUnits="userSpaceOnUse"
                  width="10"
                  x="0"
                  y="0"
                >
                  <circle
                    className="text-muted dark:text-muted/40"
                    cx="2"
                    cy="2"
                    fill="currentColor"
                    r="1"
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
                {data.map((item, index) => (
                  <Cell
                    className="duration-200"
                    fillOpacity={getBarFillOpacity(activeIndex, index)}
                    key={`type-current-${item.label}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    radius={BAR_TOP_RADIUS}
                  />
                ))}
              </Bar>
              <Bar dataKey="previous" fill="var(--color-previous)" radius={4}>
                {data.map((item, index) => (
                  <Cell
                    className="duration-200"
                    fillOpacity={getBarFillOpacity(activeIndex, index)}
                    key={`type-previous-${item.label}`}
                    onMouseEnter={() => setActiveIndex(index)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
