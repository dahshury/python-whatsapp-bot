"use client";

import { i18n } from "@shared/libs/i18n";
import { TempusDominusDateRangePicker } from "@shared/ui/tempus-dominus-date-range-picker";
import { Badge } from "@ui/badge";
import { Button } from "@ui/button";
import { ButtonGroup } from "@ui/button-group";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { AnalyticsDashboard } from "@/shared/ui/analytics-dashboard";
import type { DashboardData, DashboardFilters } from "../types";

type DashboardHeaderProps = {
  isLocalized: boolean;
  isUsingMockData: boolean;
  daysCount: number;
  filters: DashboardFilters;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  onExport: () => void;
};

export function DashboardHeader({
  isLocalized,
  isUsingMockData,
  daysCount,
  filters,
  onDateRangeChange,
  onExport,
}: DashboardHeaderProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 space-y-4"
      initial={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <h1 className="font-extrabold text-4xl text-foreground tracking-tight sm:text-5xl">
            {i18n.getMessage("dashboard_title", isLocalized)}
          </h1>
          {isUsingMockData && (
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-accent-foreground text-sm shadow-inner">
              <span className="inline-flex h-2 w-2 rounded-full bg-accent-foreground" />
              <span>
                <strong>
                  {i18n.getMessage("dashboard_demo_mode", isLocalized)}:
                </strong>{" "}
                {i18n.getMessage("dashboard_demo_description", isLocalized)}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className="self-start h-5 rounded-full px-2 text-[0.65rem] shadow-sm">
            {daysCount} {i18n.getMessage("dashboard_days", isLocalized)}
          </Badge>
          <ButtonGroup>
            <TempusDominusDateRangePicker
              onRangeChangeAction={onDateRangeChange}
              value={filters.dateRange}
            />
            <Button onClick={onExport} size="sm" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {i18n.getMessage("dashboard_export", isLocalized)}
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </motion.div>
  );
}

export function DashboardHighlights({
  isLocalized,
  safeStats,
  dailyTrends,
}: {
  isLocalized: boolean;
  safeStats: DashboardData["stats"];
  dailyTrends?: DashboardData["dailyTrends"];
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-xl">
        {i18n.getMessage("kpi_performance_metrics", isLocalized)}
      </h2>
      <AnalyticsDashboard
        safeStats={safeStats}
        {...(dailyTrends ? { dailyTrends } : {})}
        isLocalized={isLocalized}
      />
    </div>
  );
}
