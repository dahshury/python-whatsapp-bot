export const queryKeys = {
	conversations: {
		all: ["conversations"] as const,
		list: (filters?: {
			waId?: string;
			fromDate?: string;
			toDate?: string;
			limit?: number;
			recent?: string;
		}) => ["conversations", "list", filters] as const,
		messages: (
			waId: string,
			filters?: { fromDate?: string; toDate?: string; limit?: number }
		) => ["conversations", "messages", waId, filters] as const,
	},
	reservations: {
		all: ["reservations"] as const,
		list: (filters?: {
			future?: boolean;
			includeCancelled?: boolean;
			fromDate?: string;
			toDate?: string;
		}) => ["reservations", "list", filters] as const,
	},
	customers: {
		all: ["customers"] as const,
		detail: (waId: string) => ["customers", "detail", waId] as const,
	},
	vacations: {
		all: ["vacations"] as const,
	},
} as const;

export type QueryKeys = typeof queryKeys;
