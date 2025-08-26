"use client";
import * as React from "react";
import {
	useConversationsData,
	useReservationsData,
} from "@/lib/websocket-data-provider";

export interface CustomerDataState {
	customers: Array<{ id: string; name: string; phone?: string }>;
	conversations: Record<string, any[]>;
	reservations: Record<string, any[]>;
	loading: boolean;
	refresh: () => Promise<void>;
}

const CustomerDataContext = React.createContext<CustomerDataState | undefined>(
	undefined,
);

export const CustomerDataProvider: React.FC<React.PropsWithChildren<{}>> = ({
	children,
}) => {
	// Source canonical data from the unified websocket/data provider
	const {
		conversations,
		isLoading: conversationsLoading,
		refresh: refreshUnified,
	} = useConversationsData();
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
						(r: any) => r?.customer_name,
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

		return Array.from(customerMap.values()).sort((a, b) =>
			a.id.localeCompare(b.id),
		);
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
