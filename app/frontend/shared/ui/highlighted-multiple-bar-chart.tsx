"use client";

import { Badge } from "@ui/badge";
import { TrendingDown } from "lucide-react";
import React, { useId } from "react";
import { Bar, BarChart, Cell, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function HighlightedMultipleBarChart() {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const patternId = useId();

  const activeData = React.useMemo(() => {
    if (activeIndex === null) {
      return null;
    }
    return chartData[activeIndex];
  }, [activeIndex]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Bar Chart - Multiple
          <Badge
            className="ml-2 border-none bg-red-500/10 text-red-500"
            variant="outline"
          >
            <TrendingDown className="h-4 w-4" />
            <span>-5.2%</span>
          </Badge>
        </CardTitle>
        <CardDescription>
          {activeData ? (
            <div>
              {activeData.month} - Desktop: {activeData.desktop}, Mobile:{" "}
              {activeData.mobile}
            </div>
          ) : (
            <span>January - June 2025</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
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
              <DottedBackgroundPattern id={patternId} />
            </defs>
            <XAxis
              axisLine={false}
              dataKey="month"
              tickFormatter={(value) => {
                const MONTH_ABBREVIATION_LENGTH = 3;
                return value.slice(0, MONTH_ABBREVIATION_LENGTH);
              }}
              tickLine={false}
              tickMargin={10}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="dashed" />}
              cursor={false}
            />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4}>
              {chartData.map((item, index) => {
                const ACTIVE_OPACITY = 1;
                const INACTIVE_OPACITY = 0.3;
                const getFillOpacity = () => {
                  if (activeIndex === null) {
                    return ACTIVE_OPACITY;
                  }
                  if (activeIndex === index) {
                    return ACTIVE_OPACITY;
                  }
                  return INACTIVE_OPACITY;
                };
                return (
                  <Cell
                    className="duration-200"
                    fillOpacity={getFillOpacity()}
                    key={`cell-desktop-${item.month}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    stroke={activeIndex === index ? "var(--color-desktop)" : ""}
                  />
                );
              })}
            </Bar>
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4}>
              {chartData.map((item, index) => {
                const ACTIVE_OPACITY = 1;
                const INACTIVE_OPACITY = 0.3;
                const getFillOpacity = () => {
                  if (activeIndex === null) {
                    return ACTIVE_OPACITY;
                  }
                  if (activeIndex === index) {
                    return ACTIVE_OPACITY;
                  }
                  return INACTIVE_OPACITY;
                };
                return (
                  <Cell
                    className="duration-200"
                    fillOpacity={getFillOpacity()}
                    key={`cell-mobile-${item.month}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    stroke={activeIndex === index ? "var(--color-mobile)" : ""}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const DottedBackgroundPattern = ({ id }: { id: string }) => (
  <pattern
    height="10"
    id={id}
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
);
