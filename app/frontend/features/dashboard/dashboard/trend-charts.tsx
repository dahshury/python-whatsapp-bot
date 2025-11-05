"use client";

import { memo, useMemo } from "react";
import {
  buildTypeDistributionWithPrevious,
  calculatePreviousPeriodDistribution,
  transformTypeDistribution,
} from "@/features/dashboard/services";
import type {
  CustomerSegment,
  DailyData,
  DayOfWeekData,
  FunnelData,
  MonthlyTrend,
  TimeSlotData,
  TypeDistribution,
} from "@/features/dashboard/types";
import {
  ConversionFunnelChart,
  CustomerSegmentsChart,
  TimeSlotsChart,
  TypeDistributionChart,
  WeeklyActivityChart,
} from "@/features/dashboard/ui/charts";
import { DailyTrendsOverview } from "./daily-trends-overview";

type TrendChartsProps = {
  dailyTrends: DailyData[];
  typeDistribution: TypeDistribution[];
  timeSlots: TimeSlotData[];
  dayOfWeekData: DayOfWeekData[];
  monthlyTrends: MonthlyTrend[];
  funnelData: FunnelData[];
  customerSegments: CustomerSegment[];
  isLocalized: boolean;
  variant?: "full" | "compact";
};

function TrendChartsComponent({
  dailyTrends,
  typeDistribution,
  timeSlots,
  dayOfWeekData,
  monthlyTrends,
  funnelData,
  customerSegments,
  isLocalized,
  variant = "full",
}: TrendChartsProps) {
  const transformedTypeDistribution = useMemo(
    () => transformTypeDistribution(typeDistribution, isLocalized),
    [typeDistribution, isLocalized]
  );

  // Previous period comparison derived from monthlyTrends: take last two months as proxy
  const _prevTypeDistribution = useMemo(
    () =>
      calculatePreviousPeriodDistribution(
        monthlyTrends,
        transformedTypeDistribution
      ),
    [monthlyTrends, transformedTypeDistribution]
  );

  // Combined dataset for dual bar chart: current vs previous for each label
  const typeDistributionWithPrev = useMemo(
    () =>
      buildTypeDistributionWithPrevious(
        transformedTypeDistribution,
        _prevTypeDistribution
      ),
    [transformedTypeDistribution, _prevTypeDistribution]
  );

  // Compact variant to reduce rendering cost in overview
  if (variant === "compact") {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <DailyTrendsOverview
          dailyTrends={dailyTrends}
          isLocalized={isLocalized}
        />
        <TypeDistributionChart
          data={typeDistributionWithPrev}
          isLocalized={isLocalized}
          variant="compact"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
      <DailyTrendsOverview
        dailyTrends={dailyTrends}
        isLocalized={isLocalized}
      />
      <TypeDistributionChart
        data={typeDistributionWithPrev}
        isLocalized={isLocalized}
      />
      <TimeSlotsChart isLocalized={isLocalized} timeSlots={timeSlots} />
      <WeeklyActivityChart
        dayOfWeekData={dayOfWeekData}
        isLocalized={isLocalized}
      />
      <ConversionFunnelChart
        funnelData={funnelData}
        isLocalized={isLocalized}
      />
      <CustomerSegmentsChart
        customerSegments={customerSegments}
        isLocalized={isLocalized}
      />
    </div>
  );
}

export const TrendCharts = memo(TrendChartsComponent);
