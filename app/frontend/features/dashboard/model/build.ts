import { computeConversationAnalysis } from "@/features/dashboard/model/calculators/analysis";
import {
  computeAvgFollowups,
  computeConversionRate,
  countPrevUniqueCustomersFirstReservation,
  countReturningCustomers,
  countTotalReservations,
  countUniqueCustomersFirstReservation,
  filterByRange,
  filterMsgsByRange,
  filterPrevByRange,
  filterPrevMsgsByRange,
} from "@/features/dashboard/model/calculators/base";
import { computeResponseTimeStats } from "@/features/dashboard/model/calculators/conversation";
import { computeDayOfWeekData } from "@/features/dashboard/model/calculators/day-of-week";
import {
  computeDailyTrends,
  computeMessageHeatmap,
  computeTimeSlots,
  computeTopCustomers,
  computeTypeDistribution,
} from "@/features/dashboard/model/calculators/distributions";
import { computeMonthlyTrends } from "@/features/dashboard/model/calculators/monthly";
import { computeCustomerSegments } from "@/features/dashboard/model/calculators/segments";
import { computeTrend } from "@/features/dashboard/model/calculators/trends";
import { normalizePrometheusMetrics } from "@/features/dashboard/model/prometheus";
import type {
  DashboardConversationMessage,
  DashboardData,
  DashboardReservation,
  PrometheusMetrics,
} from "@/features/dashboard/types";
import type { ActiveRange } from "@/shared/libs/date/range";
import { computeWordFrequency } from "@/shared/libs/text/word-frequency";

const PERCENT = 100;

export function buildDashboardData(
  conversations: Record<string, DashboardConversationMessage[]>,
  reservations: Record<string, DashboardReservation[]>,
  options?: {
    activeRange?: ActiveRange;
    prometheusMetrics?: PrometheusMetrics;
    locale?: string;
  }
): DashboardData {
  const reservationEntries = Object.entries(reservations ?? {});
  const conversationEntries = Object.entries(conversations ?? {});

  const activeRange = options?.activeRange;
  const locale = options?.locale ?? "en";
  const prometheusMetrics = options?.prometheusMetrics;

  const filteredReservationEntries = filterByRange(
    reservationEntries,
    activeRange
  );
  const filteredConversationEntries = filterMsgsByRange(
    conversationEntries,
    activeRange
  );
  const prevReservationEntries = filterPrevByRange(
    reservationEntries,
    activeRange
  );
  const prevConversationEntries = filterPrevMsgsByRange(
    conversationEntries,
    activeRange
  );

  const totalReservations = countTotalReservations(filteredReservationEntries);
  const prevTotalReservations = countTotalReservations(prevReservationEntries);
  // totalMessages used inside analysis only; no separate usage here

  const returningCustomers = countReturningCustomers(
    filteredReservationEntries
  );

  const uniqueCustomers = countUniqueCustomersFirstReservation(
    reservationEntries,
    activeRange
  );
  const prevUniqueCustomers = countPrevUniqueCustomersFirstReservation(
    reservationEntries,
    activeRange
  );

  const conversionRate = computeConversionRate(
    filteredReservationEntries,
    filteredConversationEntries
  );
  const avgFollowups = computeAvgFollowups(filteredReservationEntries);
  const prevConversionRate = computeConversionRate(
    prevReservationEntries,
    prevConversationEntries
  );
  const prevAvgFollowups = computeAvgFollowups(prevReservationEntries);

  const prevRespStats = computeResponseTimeStats(prevConversationEntries);
  const respStats = computeResponseTimeStats(filteredConversationEntries);

  const activeUpcomingCustomerIds = new Set<string>();
  const now = new Date();
  for (const [id, items] of reservationEntries) {
    const hasUpcoming = (Array.isArray(items) ? items : []).some((r) => {
      const start = (r as DashboardReservation).start;
      const dateOnly = (r as DashboardReservation & { date?: string }).date;
      let parsed: Date | null = null;
      if (start) {
        parsed = new Date(start);
      } else if (dateOnly) {
        parsed = new Date(`${dateOnly}T00:00:00`);
      } else {
        parsed = null;
      }
      if (!parsed) {
        return false;
      }
      if (Number.isNaN(parsed.getTime())) {
        return false;
      }
      const notCancelled = (r as DashboardReservation).cancelled !== true;
      return parsed > now && notCancelled;
    });
    if (hasUpcoming) {
      activeUpcomingCustomerIds.add(id);
    }
  }

  const totalCancellations = filteredReservationEntries.reduce(
    (sum, [, items]) =>
      sum +
      (Array.isArray(items)
        ? items.filter((r) => (r as DashboardReservation).cancelled === true)
            .length
        : 0),
    0
  );
  const prevTotalCancellations = prevReservationEntries.reduce(
    (sum, [, items]) =>
      sum +
      (Array.isArray(items)
        ? items.filter((r) => (r as DashboardReservation).cancelled === true)
            .length
        : 0),
    0
  );

  const prom = normalizePrometheusMetrics(prometheusMetrics);

  const uniqueCustomerIds = new Set<string>([
    ...Object.keys(reservations ?? {}),
    ...Object.keys(conversations ?? {}),
  ]);

  return {
    _isMockData: false,
    stats: {
      totalReservations,
      totalCancellations,
      uniqueCustomers,
      conversionRate,
      returningCustomers,
      returningRate: uniqueCustomers
        ? (returningCustomers / uniqueCustomers) * PERCENT
        : 0,
      avgFollowups,
      avgResponseTime: Number.isFinite(respStats.avg) ? respStats.avg : 0,
      activeCustomers: activeUpcomingCustomerIds.size,
      trends: {
        totalReservations: computeTrend(
          totalReservations,
          prevTotalReservations,
          true
        ),
        cancellations: computeTrend(
          totalCancellations,
          prevTotalCancellations,
          false
        ),
        avgResponseTime: computeTrend(respStats.avg, prevRespStats.avg, false),
        avgFollowups: computeTrend(avgFollowups, prevAvgFollowups, true),
        uniqueCustomers: computeTrend(
          uniqueCustomers,
          prevUniqueCustomers,
          true
        ),
        conversionRate: computeTrend(conversionRate, prevConversionRate, true),
      },
    },
    prometheusMetrics: prom,
    dailyTrends: computeDailyTrends(
      filteredReservationEntries,
      reservationEntries,
      activeRange
    ),
    typeDistribution: computeTypeDistribution(filteredReservationEntries),
    timeSlots: computeTimeSlots(filteredReservationEntries),
    messageHeatmap: computeMessageHeatmap(filteredConversationEntries),
    topCustomers: computeTopCustomers(
      filteredConversationEntries,
      filteredReservationEntries,
      uniqueCustomerIds
    ),
    conversationAnalysis: computeConversationAnalysis(
      filteredConversationEntries,
      uniqueCustomers
    ),
    wordFrequency: computeWordFrequency(filteredConversationEntries),
    dayOfWeekData: computeDayOfWeekData(filteredReservationEntries),
    monthlyTrends: computeMonthlyTrends(
      filteredReservationEntries,
      filteredConversationEntries,
      locale
    ),
    funnelData: (() => {
      const conversationsCount = filteredConversationEntries.filter(
        ([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0
      ).length;
      const madeReservationCount = filteredReservationEntries.filter(
        ([, items]) => (Array.isArray(items) ? items.length : 0) > 0
      ).length;
      const returnedCount = returningCustomers;
      const CANCELLED_COUNT_DEFAULT = 0;
      const cancelledCount = CANCELLED_COUNT_DEFAULT;
      return [
        { stage: "Conversations", count: conversationsCount },
        { stage: "Made reservation", count: madeReservationCount },
        { stage: "Returned for another", count: returnedCount },
        { stage: "Cancelled", count: cancelledCount },
      ];
    })(),
    customerSegments: computeCustomerSegments(
      filteredReservationEntries,
      uniqueCustomers
    ),
  };
}
