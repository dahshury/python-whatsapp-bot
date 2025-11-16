"use client";

import { motion } from "framer-motion";
import {
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { transformFunnelData } from "@/features/dashboard/services";
import type { FunnelData } from "@/features/dashboard/types";
import { useThemeColors } from "@/shared/libs/hooks/use-theme-colors";
import { i18n } from "@/shared/libs/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getChartColors, getTooltipStyle } from "./chart-utils";

// Add wrappers to avoid @types/recharts v1 typings conflict with Recharts v3
const FunnelComp = Funnel as unknown as React.ComponentType<
  Record<string, unknown>
>;

type ConversionFunnelChartProps = {
  funnelData: FunnelData[];
  isLocalized: boolean;
};

export function ConversionFunnelChart({
  funnelData,
  isLocalized,
}: ConversionFunnelChartProps) {
  const themeColors = useThemeColors();
  const chartColors = getChartColors(themeColors);
  const tooltipStyle = getTooltipStyle(themeColors);
  const transformedFunnelData = transformFunnelData(funnelData, isLocalized);

  // Debug: Log data to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("Funnel Data:", funnelData);
    console.log("Transformed Funnel Data:", transformedFunnelData);
  }

  return (
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
        <CardContent className="p-6 pt-0">
          <ResponsiveContainer height={350} width="100%">
            <FunnelChart>
              <FunnelComp
                data={transformedFunnelData}
                dataKey="count"
                fill={themeColors.primary}
                isAnimationActive={false}
                nameKey="stage"
              >
                <LabelList
                  dataKey="stage"
                  fill={themeColors.background}
                  fontSize={12}
                  position="center"
                />
                {transformedFunnelData.map((_entry, index) => (
                  <Cell
                    fill={chartColors[index % chartColors.length]}
                    key={`funnel-cell-${index}`}
                  />
                ))}
              </FunnelComp>
              <Tooltip contentStyle={tooltipStyle} />
            </FunnelChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
