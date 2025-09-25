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
    reservations: Record<string, Array<{ id?: string | number; title?: string; start?: string; end?: string; customer_name?: string }>>;
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

    // Build base customers list by combining conversations and reservations
    const baseCustomers = React.useMemo<CustomerDataState["customers"]>(() => {
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

    // Realtime overlays for add/update/delete without requiring snapshots
    const [customerOverrides, setCustomerOverrides] = React.useState<
        Map<string, { name?: string; phone?: string }>
    >(new Map());
    const [deletedCustomers, setDeletedCustomers] = React.useState<
        Set<string>
    >(new Set());

    // Listen for websocket fan-out events to keep customer names/entries fresh
    React.useEffect(() => {
        const handler = (ev: Event) => {
            try {
                const { type, data } = (ev as CustomEvent).detail || {};
                if (!type) return;
                const t = String(type).toLowerCase();
                const d = (data || {}) as Record<string, unknown>;
                const wa = String(
                    (d?.wa_id as string) ||
                        (d?.waId as string) ||
                        (d?.id as string) ||
                        "",
                );
                if (!wa) return;

                if (
                    t === "customer_updated" ||
                    t === "customer_profile" ||
                    t === "customer_created"
                ) {
                    // Apply name/phone overrides and clear any delete marker
                    setCustomerOverrides((prev) => {
                        const next = new Map(prev);
                        const cur = next.get(wa) || {};
                        const nameAny = (d?.name as string) ||
                            (d?.customer_name as string) ||
                            undefined;
                        const phoneAny = (d?.phone as string) || undefined;
                        next.set(wa, {
                            ...cur,
                            ...(nameAny !== undefined ? { name: nameAny } : {}),
                            ...(phoneAny !== undefined ? { phone: phoneAny } : {}),
                        });
                        return next;
                    });
                    setDeletedCustomers((prev) => {
                        if (!prev.has(wa)) return prev;
                        const n = new Set(prev);
                        n.delete(wa);
                        return n;
                    });
                    return;
                }

                if (t === "customer_deleted" || t === "customer_removed") {
                    // Mark as deleted and drop any overrides
                    setDeletedCustomers((prev) => {
                        const n = new Set(prev);
                        n.add(wa);
                        return n;
                    });
                    setCustomerOverrides((prev) => {
                        if (!prev.has(wa)) return prev;
                        const n = new Map(prev);
                        n.delete(wa);
                        return n;
                    });
                    return;
                }
            } catch {}
        };
        window.addEventListener("realtime", handler as EventListener);
        return () =>
            window.removeEventListener("realtime", handler as EventListener);
    }, []);

    // Merge base customers with realtime overlays, supporting adds/updates/deletes
    const customers = React.useMemo<CustomerDataState["customers"]>(() => {
        const merged = new Map<string, { id: string; name: string; phone?: string }>();

        // Helper to parse message timestamp into a numeric value (dup of above)
        const parseMessageDate = (m: { ts?: string } & Record<string, unknown>) => {
            const tryParse = (v?: string) => {
                if (!v) return 0;
                const d = new Date(v);
                return Number.isNaN(d.getTime()) ? 0 : d.getTime();
            };
            const ts1 = tryParse(m?.ts as string);
            const ts2 = tryParse((m as { datetime?: string })?.datetime);
            if (ts1 || ts2) return Math.max(ts1, ts2);
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

        // Seed with base customers (excluding those marked deleted) and apply overrides
        for (const c of baseCustomers) {
            if (deletedCustomers.has(c.id)) continue;
            const ov = customerOverrides.get(c.id);
            merged.set(c.id, {
                id: c.id,
                name: (ov?.name ?? c.name) || "",
                phone: ov?.phone || c.phone || c.id,
            });
        }

        // Add any override entries not present in base (new customers delivered via WS)
        for (const [wa, ov] of customerOverrides.entries()) {
            if (deletedCustomers.has(wa)) continue;
            if (!merged.has(wa)) {
                merged.set(wa, { id: wa, name: ov?.name || "", phone: ov?.phone || wa });
            }
        }

        const arr = Array.from(merged.values());
        arr.sort((a, b) => {
            const tb = getLastMessageTs(b.id);
            const ta = getLastMessageTs(a.id);
            if (tb !== ta) return tb - ta; // newest first
            return a.id.localeCompare(b.id);
        });
        return arr;
    }, [baseCustomers, customerOverrides, deletedCustomers, conversations]);

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
