"use client";
import * as React from "react";
import {
	useConversationsData,
	useReservationsData,
} from "@/lib/websocket-data-provider";

export interface CustomerDataState {
	customers: Array<{ id: string; name: string; phone?: string }>;
	conversations: Record<
		string,
		Array<{ id?: string; text?: string; ts?: string }>
	>;
	reservations: Record<
		string,
		Array<{
			id: string;
			title: string;
			start: string;
			end?: string;
			customer_name?: string;
		}>
	>;
	loading: boolean;
	refresh: () => Promise<void>;
}

const CustomerDataContext = React.createContext<CustomerDataState | undefined>(
	undefined,
);

export const CustomerDataProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	// Source canonical data from the unified websocket/data provider
	const { conversations, isLoading: conversationsLoading } =
		useConversationsData();
	const { reservations, isLoading: reservationsLoading } =
		useReservationsData();

	// Build customers list by combining conversations and reservations
	const customers = React.useMemo<CustomerDataState["customers"]>(() => {
		const customerMap = new Map<
			string,
			{ id: string; name: string; phone?: string }
		>();

		// Add every waId found in conversations
		Object.keys(conversations || {}).forEach((waId) => {
			if (!customerMap.has(waId)) {
				customerMap.set(waId, {
					id: waId,
					name: "",
					phone: waId,
				});
			}
		});

		// Enrich with names from reservations when available
		Object.entries(reservations || {}).forEach(
			([waId, customerReservations]) => {
				if (
					Array.isArray(customerReservations) &&
					customerReservations.length > 0
				) {
					const name = customerReservations.find(
						(r) => r?.customer_name,
					)?.customer_name;
					if (name) {
						const existing = customerMap.get(waId);
						if (existing) {
							customerMap.set(waId, { ...existing, name });
						} else {
							customerMap.set(waId, { id: waId, name, phone: waId });
						}
					}
				}
			},
		);

		// Helper to parse message timestamp into a numeric value
		const parseMessageDate = (m: { ts?: string } & Record<string, unknown>) => {
			const tryParse = (v?: string) => {
				if (!v) return 0;
				const d = new Date(v);
				return Number.isNaN(d.getTime()) ? 0 : d.getTime();
			};
			// try ts or datetime
			const ts1 = tryParse(m?.ts as string);
			const ts2 = tryParse((m as { datetime?: string })?.datetime);
			if (ts1 || ts2) return Math.max(ts1, ts2);
			// try (date, time)
			const date = (m as { date?: string })?.date;
			const time = (m as { time?: string })?.time;
			if (date && time) return tryParse(`${date}T${time}`);
			if (date) return tryParse(`${date}T00:00:00`);
			return 0;
		};

		const getLastMessageTs = (waId: string): number => {
			try {
				const msgs = conversations?.[waId] || [];
				let maxTs = 0;
				for (const m of msgs) {
					const t = parseMessageDate(m as unknown as Record<string, unknown>);
					if (t > maxTs) maxTs = t;
				}
				return maxTs;
			} catch {
				return 0;
			}
		};

		return Array.from(customerMap.values()).sort((a, b) => {
			const tb = getLastMessageTs(b.id);
			const ta = getLastMessageTs(a.id);
			if (tb !== ta) return tb - ta; // newest first
			return a.id.localeCompare(b.id);
		});
	}, [conversations, reservations]);

	const loading = conversationsLoading || reservationsLoading;

	const refresh = React.useCallback(async () => {
		// No-op: unified provider manages refresh; expose to satisfy consumers
		await Promise.resolve();
	}, []);

	const value = React.useMemo(
		() => ({ customers, conversations, reservations, loading, refresh }),
		[customers, conversations, reservations, loading, refresh],
	);

	return (
		<CustomerDataContext.Provider value={value}>
			{children}
		</CustomerDataContext.Provider>
	);
};

export function useCustomerData(): CustomerDataState {
	const ctx = React.useContext(CustomerDataContext);
	if (!ctx)
		throw new Error("useCustomerData must be used within CustomerDataProvider");
	return ctx;
}
