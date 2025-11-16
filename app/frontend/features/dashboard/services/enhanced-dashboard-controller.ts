"use client";

import { useQuery } from "@tanstack/react-query";
import { differenceInDays, format, subDays } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { logger } from "@/shared/libs/logger";
import type { DashboardData, DashboardFilters } from "../types";
import { createDashboardService } from "./dashboard.service.factory";

const DEFAULT_DATE_RANGE_DAYS = 30;
const FILTER_DEBOUNCE_MS = 250;

type SafeDashboardData = DashboardData;

export type EnhancedDashboardControllerResult = {
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  daysCount: number;
  defaultDateRange: { from: Date; to: Date };
  dashboardData: DashboardData | null;
  safeDashboard: SafeDashboardData;
  isLoading: boolean;
  error: string | null;
  isUsingMockData: boolean;
  isInitialized: boolean;
  activeTab: string;
  setActiveTab: (value: string) => void;
  handleDateRangeChange: (dateRange: DateRange | undefined) => void;
  handleExport: () => void;
  refreshDashboard: (range?: {
    fromDate?: string;
    toDate?: string;
  }) => Promise<void>;
};

const defaultStats: DashboardData["stats"] = {
  activeCustomers: 0,
  avgFollowups: 0,
  avgResponseTime: 0,
  conversionRate: 0,
  returningCustomers: 0,
  returningRate: 0,
  totalCancellations: 0,
  totalReservations: 0,
  uniqueCustomers: 0,
};

type UseEnhancedDashboardControllerOptions = {
  locale?: string;
};

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const DASHBOARD_STALE_TIME_MS = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

const defaultConversationAnalysis: DashboardData["conversationAnalysis"] = {
  avgMessageLength: 0,
  avgMessagesPerCustomer: 0,
  avgWordsPerMessage: 0,
  messageCountDistribution: {
    avg: 0,
    max: 0,
    median: 0,
  },
  responseTimeStats: {
    avg: 0,
    max: 0,
    median: 0,
  },
  totalMessages: 0,
  uniqueCustomers: 0,
};

const emptySafeDashboard: SafeDashboardData = {
  _isMockData: false,
  stats: defaultStats,
  prometheusMetrics: {},
  dailyTrends: [],
  typeDistribution: [],
  timeSlots: [],
  messageHeatmap: [],
  topCustomers: [],
  conversationAnalysis: defaultConversationAnalysis,
  wordFrequency: [],
  dayOfWeekData: [],
  monthlyTrends: [],
  funnelData: [],
  customerSegments: [],
};

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DEFAULT_YEAR = 2000;

function parseYmd(value: string): Date {
  const [year, month, day] = value
    .split("-")
    .map((segment) => Number.parseInt(segment, 10));
  return new Date(year || DEFAULT_YEAR, (month || 1) - 1, day || 1);
}

export function useEnhancedDashboardController(
  options: UseEnhancedDashboardControllerOptions = {}
): EnhancedDashboardControllerResult {
  const locale = options.locale || "en";
  const dashboardService = useMemo(() => createDashboardService(), []);

  const defaultDateRange = useMemo(
    () => ({
      from: subDays(new Date(), DEFAULT_DATE_RANGE_DAYS),
      to: new Date(),
    }),
    []
  );

  const [filters, setFilters] = useState<DashboardFilters>(() => ({
    dateRange: {
      from: subDays(new Date(), DEFAULT_DATE_RANGE_DAYS),
      to: new Date(),
    },
  }));
  const [activeTab, setActiveTab] = useState("overview");
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [pendingRange, setPendingRange] = useState<{
    from?: string;
    to?: string;
  } | null>(null);

  const formattedRange = useMemo(() => {
    const from = filters.dateRange?.from;
    const to = filters.dateRange?.to;
    if (!(from && to)) {
      return null;
    }
    return { from: formatYmd(from), to: formatYmd(to) };
  }, [filters.dateRange]);

  useEffect(() => {
    if (!pendingRange) {
      return;
    }
    const timeoutId = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        dateRange: {
          from: parseYmd(pendingRange.from || formatYmd(defaultDateRange.from)),
          to: parseYmd(pendingRange.to || formatYmd(defaultDateRange.to)),
        },
      }));
      setPendingRange(null);
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [pendingRange, defaultDateRange]);

  const {
    data: dashboardData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "dashboard",
      "stats",
      formattedRange?.from,
      formattedRange?.to,
      // Removed locale from query key to prevent refetch on language change
    ],
    queryFn: async () => {
      const fromDate = formattedRange?.from;
      const toDate = formattedRange?.to;
      if (fromDate === undefined || toDate === undefined) {
        throw new Error("Date range is required");
      }
      const stats = await dashboardService.getStats({
        fromDate,
        toDate,
        locale,
      });
      return stats;
    },
    enabled: Boolean(formattedRange?.from && formattedRange?.to),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // Prevent duplicate queries
    gcTime: DASHBOARD_STALE_TIME_MS,
  });

  useEffect(() => {
    setIsUsingMockData(Boolean(dashboardData?._isMockData));
  }, [dashboardData]);

  const daysCount = useMemo(() => {
    const from = filters.dateRange?.from;
    const to = filters.dateRange?.to;
    if (!(from && to)) {
      return 0;
    }
    return differenceInDays(to, from) + 1;
  }, [filters]);

  // Transform monthlyTrends month labels based on current locale using Intl API
  const transformedMonthlyTrends = useMemo(() => {
    if (
      !dashboardData?.monthlyTrends ||
      dashboardData.monthlyTrends.length === 0
    ) {
      return [];
    }
    const targetLocale = locale?.toLowerCase().startsWith("ar") ? "ar" : "en";

    const REFERENCE_YEAR = 2000;
    const MONTHS_IN_YEAR = 12;

    // Generate month labels using Intl API (browser's locale support)
    const getMonthLabel = (monthIndex: number, localeCode: string): string => {
      const date = new Date(REFERENCE_YEAR, monthIndex, 1); // Use reference year, month index (0-11)
      return date.toLocaleString(localeCode, { month: "short" });
    };

    // Build month label maps for both locales using Intl API
    const enMonthMap = new Map<string, number>();
    const arMonthMap = new Map<string, number>();
    for (let i = 0; i < MONTHS_IN_YEAR; i++) {
      const enLabel = getMonthLabel(i, "en");
      const arLabel = getMonthLabel(i, "ar");
      enMonthMap.set(enLabel, i);
      arMonthMap.set(arLabel, i);
    }

    // Detect source language by checking the first month label
    const firstMonth = dashboardData.monthlyTrends[0]?.month;
    if (!firstMonth) {
      return dashboardData.monthlyTrends;
    }

    // Determine source locale by checking which map contains the first month
    const isSourceArabic = arMonthMap.has(firstMonth);
    const sourceLocale = isSourceArabic ? "ar" : "en";

    // If source locale matches target locale, no transformation needed
    if (sourceLocale === targetLocale) {
      return dashboardData.monthlyTrends;
    }

    // Use the appropriate source map
    const sourceMonthMap = isSourceArabic ? arMonthMap : enMonthMap;

    return dashboardData.monthlyTrends.map((trend) => {
      const sourceMonth = trend.month;
      const monthIndex = sourceMonthMap.get(sourceMonth);

      // If we can't find the month index, return as-is
      if (monthIndex === undefined) {
        return trend;
      }

      // Transform to target locale using Intl API
      const transformedMonth = getMonthLabel(monthIndex, targetLocale);
      return {
        ...trend,
        month: transformedMonth,
      };
    });
  }, [dashboardData?.monthlyTrends, locale]);

  const safeDashboard = useMemo<SafeDashboardData>(() => {
    if (!dashboardData) {
      return emptySafeDashboard;
    }
    const result: SafeDashboardData = {
      _isMockData: dashboardData._isMockData ?? false,
      stats: dashboardData.stats ?? defaultStats,
      prometheusMetrics: dashboardData.prometheusMetrics ?? {},
      dailyTrends: dashboardData.dailyTrends ?? [],
      typeDistribution: dashboardData.typeDistribution ?? [],
      timeSlots: dashboardData.timeSlots ?? [],
      messageHeatmap: dashboardData.messageHeatmap ?? [],
      topCustomers: dashboardData.topCustomers ?? [],
      conversationAnalysis:
        dashboardData.conversationAnalysis ?? defaultConversationAnalysis,
      wordFrequency: dashboardData.wordFrequency ?? [],
      dayOfWeekData: dashboardData.dayOfWeekData ?? [],
      monthlyTrends: transformedMonthlyTrends,
      funnelData: dashboardData.funnelData ?? [],
      customerSegments: dashboardData.customerSegments ?? [],
    };
    // Only include wordFrequencyByRole if it exists (optional property)
    if (dashboardData.wordFrequencyByRole !== undefined) {
      result.wordFrequencyByRole = dashboardData.wordFrequencyByRole;
    }
    return result;
  }, [dashboardData, transformedMonthlyTrends]);

  const handleDateRangeChange = useCallback(
    (dateRange: DateRange | undefined) => {
      if (dateRange?.from && dateRange?.to) {
        setFilters((prev) => ({
          ...prev,
          dateRange: {
            from: dateRange.from as Date,
            to: dateRange.to as Date,
          },
        }));
      }
    },
    []
  );

  const handleExport = useCallback(() => {
    if (!dashboardData) {
      return;
    }
    const dataToExport = {
      exportedAt: new Date().toISOString(),
      dateRange: filters.dateRange,
      stats: dashboardData.stats,
      dailyTrends: dashboardData.dailyTrends,
      typeDistribution: dashboardData.typeDistribution,
      timeSlots: dashboardData.timeSlots,
      topCustomers: dashboardData.topCustomers,
      conversationAnalysis: dashboardData.conversationAnalysis,
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dashboard-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [dashboardData, filters.dateRange]);

  const refreshDashboard = useCallback(
    async (overrideRange?: { fromDate?: string; toDate?: string }) => {
      if (overrideRange?.fromDate && overrideRange?.toDate) {
        setPendingRange({
          from: overrideRange.fromDate,
          to: overrideRange.toDate,
        });
        return;
      }
      try {
        await refetch();
      } catch (caughtError) {
        logger.error(
          "[EnhancedDashboardController] Failed to refresh dashboard data",
          caughtError
        );
      }
    },
    [refetch]
  );

  const isInitialLoading = isLoading && !dashboardData;
  const queryError = error instanceof Error ? error.message : null;
  const initialized = Boolean(dashboardData);

  return {
    filters,
    setFilters,
    daysCount,
    defaultDateRange,
    dashboardData: dashboardData ?? null,
    safeDashboard,
    isLoading: isInitialLoading || isFetching,
    error: queryError,
    isUsingMockData,
    isInitialized: initialized,
    activeTab,
    setActiveTab,
    handleDateRangeChange,
    handleExport,
    refreshDashboard,
  };
}
