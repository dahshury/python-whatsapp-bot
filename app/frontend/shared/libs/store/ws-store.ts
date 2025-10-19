import type { PrometheusMetrics } from "@features/dashboard/types";
import { create } from "zustand";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import type { Vacation } from "@/entities/vacation";

export type WsRange = {
	fromDate?: string;
	toDate?: string;
	includeConversations?: boolean;
};

type ConversationRange = { fromDate?: string; toDate?: string; limit?: number };

type RefreshFn = (range?: WsRange) => Promise<void>;
type LoadConversationMessagesFn = (
	waId: string,
	range?: ConversationRange
) => Promise<void>;
type SendVacationUpdateFn = (payload: {
	periods?: Array<{ start: string | Date; end: string | Date }>;
	start_dates?: string;
	durations?: string;
}) => Promise<void> | void;

export type WsStoreState = {
	// Data
	conversations: Record<string, ConversationMessage[]>;
	reservations: Record<string, Reservation[]>;
	vacations: Vacation[];
	prometheusMetrics: PrometheusMetrics;
	// Status
	isLoading: boolean;
	error: string | null;
	activeRange?: WsRange;
	// Operations (injected by provider)
	refresh: RefreshFn;
	loadConversationMessages: LoadConversationMessagesFn;
	sendVacationUpdate?: SendVacationUpdateFn | undefined;
	// Actions
	setConversations: (map: Record<string, ConversationMessage[]>) => void;
	setReservations: (map: Record<string, Reservation[]>) => void;
	setVacations: (items: Vacation[]) => void;
	setMetrics: (metrics: PrometheusMetrics) => void;
	setActiveRange: (range?: WsRange) => void;
	setLoading: (value: boolean) => void;
	setError: (msg: string | null) => void;
	setRefresh: (fn: RefreshFn) => void;
	setLoadConversationMessages: (fn: LoadConversationMessagesFn) => void;
	setSendVacationUpdate: (fn?: SendVacationUpdateFn) => void;
};

export const useWsStore = create<WsStoreState>()((set) => ({
	conversations: {},
	reservations: {},
	vacations: [],
	prometheusMetrics: {},
	isLoading: false,
	error: null,
	activeRange: {},
	refresh: async () => {
		// No-op by default; provider injects real implementation
	},
	loadConversationMessages: async () => {
		// No-op by default; provider injects real implementation
	},
	// omit sendVacationUpdate initially to satisfy exactOptionalPropertyTypes
	setConversations: (map) => set({ conversations: map }),
	setReservations: (map) => set({ reservations: map }),
	setVacations: (items) => set({ vacations: items }),
	setMetrics: (metrics) => set({ prometheusMetrics: metrics }),
	setActiveRange: (range) => set({ activeRange: range ?? {} }),
	setLoading: (value) => set({ isLoading: value }),
	setError: (msg) => set({ error: msg }),
	setRefresh: (fn) => set({ refresh: fn }),
	setLoadConversationMessages: (fn) => set({ loadConversationMessages: fn }),
	setSendVacationUpdate: (fn) => {
		if (typeof fn === "function") {
			set({ sendVacationUpdate: fn });
		}
	},
}));
