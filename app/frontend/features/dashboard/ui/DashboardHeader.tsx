"use client";

import { i18n } from "@shared/libs/i18n";
import { TempusDominusDateRangePicker } from "@shared/ui/tempus-dominus-date-range-picker";
import { Badge } from "@ui/badge";
import { Button } from "@ui/button";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import type { DateRange } from "react-day-picker";
import type { DashboardData, DashboardFilters } from "../types";

type DashboardHeaderProps = {
  isLocalized: boolean;
  daysCount: number;
  filters: DashboardFilters;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  onExport: () => void;
  isUsingMockData: boolean;
  safeStats: DashboardData["stats"];
};

export function DashboardHeader({
  isLocalized,
  daysCount,
  filters,
  onDateRangeChange,
  onExport,
  isUsingMockData,
  safeStats,
}: DashboardHeaderProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      initial={{ opacity: 0, y: -20 }}
    >
      <div>
        <h1 className="font-bold text-3xl tracking-tight">
          {i18n.getMessage("dashboard_title", isLocalized)}
        </h1>
        <p className="text-muted-foreground">
          {i18n.getMessage("dashboard_subtitle", isLocalized) ||
            "Discover how your reservation operation is performing."}
        </p>
        {isUsingMockData && (
          <div className="mt-2 rounded-lg border border-accent/20 bg-accent/10 p-3">
            <p className="text-accent-foreground text-sm">
              <strong>
                {i18n.getMessage("dashboard_demo_mode", isLocalized)}:
              </strong>{" "}
              {i18n.getMessage("dashboard_demo_description", isLocalized)}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 self-start">
            <Badge variant="secondary">
              {daysCount} {i18n.getMessage("dashboard_days", isLocalized)}
            </Badge>
            <Badge variant="outline">
              {safeStats.totalReservations}{" "}
              {i18n.getMessage("dashboard_reservations", isLocalized)}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <TempusDominusDateRangePicker
              onRangeChangeAction={onDateRangeChange}
              value={filters.dateRange}
            />
            <Button onClick={onExport} size="sm" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {i18n.getMessage("dashboard_export", isLocalized)}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
