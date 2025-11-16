"use client";

import { i18n } from "@shared/libs/i18n";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { MessageHeatmapData } from "@/features/dashboard/types";
import { cn } from "@/shared/libs/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  AFTERNOON_PERIOD_START_HOUR,
  AVERAGE_MESSAGES_DECIMAL_PLACES,
  DAY_ABBREVIATION_LENGTH,
  EVENING_PERIOD_START_HOUR,
  HOURS_PER_WEEK,
  MAX_HEATMAP_CELL_DISPLAY,
  MORNING_PERIOD_START_HOUR,
} from "../../dashboard/constants";
import { getIntensityLabel } from "../../utils/heatmap-intensity";

type MessageHeatmapProps = {
  messageHeatmap: MessageHeatmapData[];
  isLocalized: boolean;
};

export function MessageHeatmap({
  messageHeatmap,
  isLocalized,
}: MessageHeatmapProps) {
  const [hovered, setHovered] = useState(false);

  // Helper function to translate day names
  const translateDayName = React.useCallback(
    (dayName: string) => {
      const dayMap = {
        Monday: "day_monday",
        Tuesday: "day_tuesday",
        Wednesday: "day_wednesday",
        Thursday: "day_thursday",
        Friday: "day_friday",
        Saturday: "day_saturday",
        Sunday: "day_sunday",
      };

      const key = dayMap[dayName as keyof typeof dayMap];
      return key ? i18n.getMessage(key, isLocalized) : dayName;
    },
    [isLocalized]
  );

  // Create heatmap grid
  const daysOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxCount = Math.max(...messageHeatmap.map((d) => d.count), 1);

  // Precompute heatmap lookup to avoid repeated array scans per cell
  const heatmapMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of messageHeatmap) {
      map.set(`${d.weekday}-${d.hour}`, d.count);
    }
    return map;
  }, [messageHeatmap]);

  const getHeatmapValue = (day: string, hour: number) =>
    heatmapMap.get(`${day}-${hour}`) || 0;

  // Normalize count to 0-1 range for opacity calculation
  const getNormalizedValue = (count: number) => {
    if (maxCount === 0) return 0;
    return count / maxCount;
  };

  // Precomputed labels to avoid JSX inline IIFEs and multiline parentheses
  const peakHourLabel = React.useMemo(() => {
    const peakData = messageHeatmap.reduce(
      (peak, current) => (current.count > peak.count ? current : peak),
      {
        hour: 0,
        count: 0,
      }
    );
    return `${peakData.hour.toString().padStart(2, "0")}:00`;
  }, [messageHeatmap]);

  const busiestDayShortLabel = React.useMemo(() => {
    const dayTotals = daysOrder.map((day) => ({
      day,
      total: messageHeatmap
        .filter((d) => d.weekday === day)
        .reduce((sum, d) => sum + d.count, 0),
    }));
    const busiestDay = dayTotals.reduce((peak, current) =>
      current.total > peak.total ? current : peak
    );
    return translateDayName(busiestDay.day).slice(0, DAY_ABBREVIATION_LENGTH);
  }, [messageHeatmap, translateDayName]);

  const averageMessagesPerHourLabel = React.useMemo(() => {
    const total = messageHeatmap.reduce((sum, d) => sum + d.count, 0);
    return (total / HOURS_PER_WEEK).toFixed(AVERAGE_MESSAGES_DECIMAL_PLACES);
  }, [messageHeatmap]);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mt-6"
      initial={{ opacity: 0, y: 20 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-chart-1" />
                {i18n.getMessage("msg_volume_heatmap", isLocalized)}
              </CardTitle>
              <p className="mt-1 text-muted-foreground text-sm">
                {i18n.getMessage("msg_activity_patterns", isLocalized)}
              </p>
            </div>
            <div className="text-right">
              <div className="font-bold text-2xl text-chart-1">{maxCount}</div>
              <p className="text-muted-foreground text-xs">
                {i18n.getMessage("msg_peak_messages", isLocalized)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="space-y-4">
            {/* Enhanced Header with time indicators */}
            <div className="mb-3 flex items-center">
              <div className="w-16 flex-shrink-0" />
              <div className="relative flex flex-1">
                {hours.map((hour) => (
                  <div
                    className="relative min-w-[1.5rem] flex-1 text-center font-medium text-muted-foreground text-xs"
                    key={hour}
                  >
                    {hour.toString().padStart(2, "0")}
                    {/* Time period indicators */}
                    {hour === MORNING_PERIOD_START_HOUR && (
                      <div className="-top-2 absolute right-0 left-0 font-medium text-[0.625rem] text-chart-3">
                        {i18n.getMessage("msg_morning", isLocalized)}
                      </div>
                    )}
                    {hour === AFTERNOON_PERIOD_START_HOUR && (
                      <div className="-top-2 absolute right-0 left-0 font-medium text-[0.625rem] text-chart-2">
                        {i18n.getMessage("msg_afternoon", isLocalized)}
                      </div>
                    )}
                    {hour === EVENING_PERIOD_START_HOUR && (
                      <div className="-top-2 absolute right-0 left-0 font-medium text-[0.625rem] text-chart-4">
                        {i18n.getMessage("msg_evening", isLocalized)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap grid with AnomalyHeatmap style */}
            <motion.div
              className="space-y-1"
              onHoverEnd={() => setHovered(false)}
              onHoverStart={() => setHovered(true)}
            >
              {daysOrder.map((day, dayIndex) => (
                <div className="group flex items-center" key={day}>
                  <div className="w-16 flex-shrink-0 pr-3 text-right font-medium text-foreground text-sm">
                    <div className="rounded-md border bg-accent/20 px-2 py-1">
                      {translateDayName(day).slice(0, DAY_ABBREVIATION_LENGTH)}
                    </div>
                  </div>
                  <div className="flex flex-1 gap-[2px]">
                    {hours.map((hour, hourIndex) => {
                      const count = getHeatmapValue(day, hour);
                      const normalizedValue = getNormalizedValue(count);
                      const cellIndex = dayIndex * 24 + hourIndex;
                      // Calculate opacity based on normalized value (0.15 to 0.85 range)
                      const opacity = 0.15 + normalizedValue * 0.7;

                      return (
                        <motion.div
                          animate={{
                            opacity: 1,
                            scale: hovered ? 1.05 : 1,
                            ...(count > 0 && {
                              backgroundColor: `hsl(var(--chart-1) / ${opacity})`,
                            }),
                            ...(hovered &&
                              count > 0 && {
                                boxShadow:
                                  "inset 0 0 12px hsl(var(--chart-1) / 0.3)",
                              }),
                          }}
                          className={cn(
                            "relative m-[2px] aspect-square min-h-[1.5rem] min-w-[1.5rem] flex-1 rounded-md",
                            count === 0 && "bg-muted/20"
                          )}
                          initial={{ opacity: 0, scale: 0.9 }}
                          key={`${day}-${hour}`}
                          title={`${translateDayName(day)} ${hour.toString().padStart(2, "0")}:00\n${count} ${i18n.getMessage("msg_messages", isLocalized)}\n${getIntensityLabel(count, maxCount, isLocalized)} ${i18n.getMessage("msg_activity", isLocalized)}`}
                          transition={{
                            duration: 0.4,
                            delay: (cellIndex % 24) * 0.01,
                          }}
                        >
                          {count > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="select-none font-bold text-white text-xs drop-shadow-sm">
                                {count > MAX_HEATMAP_CELL_DISPLAY
                                  ? `${MAX_HEATMAP_CELL_DISPLAY}+`
                                  : count}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Activity insights */}
            <div className="mt-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-lg border border-accent/20 bg-accent/10 p-3">
                  <div className="text-muted-foreground text-xs">
                    {i18n.getMessage("msg_peak_hour", isLocalized)}
                  </div>
                  <div className="font-semibold text-chart-1 text-sm">
                    {peakHourLabel}
                  </div>
                </div>

                <div className="rounded-lg border border-accent/20 bg-accent/10 p-3">
                  <div className="text-muted-foreground text-xs">
                    {i18n.getMessage("msg_busiest_day", isLocalized)}
                  </div>
                  <div className="font-semibold text-chart-2 text-sm">
                    {busiestDayShortLabel}
                  </div>
                </div>

                <div className="rounded-lg border border-accent/20 bg-accent/10 p-3">
                  <div className="text-muted-foreground text-xs">
                    {i18n.getMessage("msg_total_messages", isLocalized)}
                  </div>
                  <div className="font-semibold text-chart-3 text-sm">
                    {messageHeatmap
                      .reduce((sum, d) => sum + d.count, 0)
                      .toLocaleString()}
                  </div>
                </div>

                <div className="rounded-lg border border-accent/20 bg-accent/10 p-3">
                  <div className="text-muted-foreground text-xs">
                    {i18n.getMessage("msg_avg_per_hour", isLocalized)}
                  </div>
                  <div className="font-semibold text-chart-4 text-sm">
                    {averageMessagesPerHourLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
