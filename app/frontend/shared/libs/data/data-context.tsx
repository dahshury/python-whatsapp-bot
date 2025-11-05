"use client";
import { createContext } from "react";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import type { Vacation } from "@/entities/vacation";
import type { PrometheusMetrics } from "@/features/dashboard/types";

export type DataShape = {
  conversations: Record<string, ConversationMessage[]>;
  reservations: Record<string, Reservation[]>;
  vacations: Vacation[];
  prometheusMetrics: PrometheusMetrics;
  isLoading: boolean;
  error: string | null;
  refresh: (range?: { fromDate?: string; toDate?: string }) => Promise<void>;
  activeRange?: { fromDate?: string; toDate?: string };
  sendVacationUpdate?: (payload: {
    periods?: Array<{ start: string | Date; end: string | Date }>;
    start_dates?: string;
    durations?: string;
  }) => Promise<void> | void;
};

export const DataContext = createContext<DataShape>({
  conversations: {},
  reservations: {},
  vacations: [],
  prometheusMetrics: {},
  isLoading: false,
  error: null,
  refresh: async () => {
    // Default no-op handler
  },
  activeRange: {},
  sendVacationUpdate: async () => {
    // Default no-op handler
  },
});
