import type { ConversationMessage as CalendarConversationMessage } from "@/entities/conversation";
import type { Reservation as CalendarReservation } from "@/entities/event";
import { buildDashboardData } from "@/features/dashboard/model/build";
import type {
  DashboardConversationMessage,
  DashboardData,
  DashboardReservation,
  PrometheusMetrics,
} from "@/features/dashboard/types";

export type ConversationMessage = CalendarConversationMessage & {
  ts?: string;
  text?: string;
  datetime?: string;
  sender?: string;
  author?: string;
};

export type Reservation = CalendarReservation & {
  start?: string;
  end?: string;
  updated_at?: string;
  modified_at?: string;
  last_modified?: string;
  modified_on?: string;
  update_ts?: string;
  title?: string;
  cancelled?: boolean;
  history?: Array<{ ts?: string; timestamp?: string }>;
};

export function computeFullDashboardData(
  conversations: Record<string, ConversationMessage[]>,
  reservations: Record<string, Reservation[]>,
  activeRange?: { fromDate?: string; toDate?: string },
  prometheusMetrics?: PrometheusMetrics
): DashboardData {
  const options: {
    activeRange?: { fromDate?: string; toDate?: string };
    prometheusMetrics?: PrometheusMetrics;
  } = {};

  if (activeRange) {
    options.activeRange = activeRange;
  }
  if (prometheusMetrics) {
    options.prometheusMetrics = prometheusMetrics;
  }

  return buildDashboardData(
    conversations as unknown as Record<string, DashboardConversationMessage[]>,
    reservations as unknown as Record<string, DashboardReservation[]>,
    options
  );
}
