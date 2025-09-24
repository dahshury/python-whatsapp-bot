"use client";
import * as React from "react";
import type { PrometheusMetrics } from "@/types/dashboard";
import type { ConversationMessage, Reservation, Vacation } from "@/types/unified";

export interface DataShape {
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
}

export const DataContext = React.createContext<DataShape>({
	conversations: {},
	reservations: {},
	vacations: [],
	prometheusMetrics: {},
	isLoading: false,
	error: null,
	refresh: async () => {},
	activeRange: {},
	sendVacationUpdate: async () => {},
});


