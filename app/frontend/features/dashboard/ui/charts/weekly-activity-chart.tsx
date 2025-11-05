"use client";

import { motion } from "framer-motion";
import { useId, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { transformDayOfWeekData } from "@/features/dashboard/services";
import { buildWeeklyActivityChartConfig } from "@/features/dashboard/services/chart-config-builders";
import type { DayOfWeekData } from "@/features/dashboard/types";
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

type WeeklyActivityChartProps = {
  dayOfWeekData: DayOfWeekData[];
  isLocalized: boolean;
};

export function WeeklyActivityChart({
  dayOfWeekData,
  isLocalized,
}: WeeklyActivityChartProps) {
  const patternId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const config = buildWeeklyActivityChartConfig(isLocalized);
  const transformedData = transformDayOfWeekData(dayOfWeekData, isLocalized);

  return (
    <motion.div className="lg:col-span-2" initial={false}>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>
            {i18n.getMessage("chart_weekly_activity_pattern", isLocalized)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-[21.875rem] w-full" config={config}>
            <BarChart
              accessibilityLayer
              data={transformedData}
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
                {transformedData.map((item, index) => (
                  <Cell
                    className="duration-200"
                    fillOpacity={getBarFillOpacity(activeIndex, index)}
                    key={`week-res-${item.day}`}
                    onMouseEnter={() => setActiveIndex(index)}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="cancellations"
                fill="var(--color-cancellations)"
                radius={4}
              >
                {transformedData.map((item, index) => (
                  <Cell
                    className="duration-200"
                    fillOpacity={getBarFillOpacity(activeIndex, index)}
                    key={`week-can-${item.day}`}
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
