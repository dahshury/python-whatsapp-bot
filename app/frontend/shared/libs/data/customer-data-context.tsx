"use client";
import {
	buildBaseCustomers,
	mergeCustomerOverlays,
	sortCustomersByLastMessage,
} from "@processes/customers/customer-list.process";
import { fetchCustomerNames } from "@shared/libs/api";
import {
	useConversationsData,
	useReservationsData,
} from "@shared/libs/data/websocket-data-provider";
import {
	createContext,
	type FC,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

export type CustomerDataState = {
	customers: Array<{ id: string; name: string; phone?: string }>;
	conversations: Record<
		string,
		Array<{ id?: string; text?: string; ts?: string }>
	>;
	reservations: Record<
		string,
		Array<{
			id?: string | number;
			title?: string;
			start?: string;
			end?: string;
			customer_name?: string;
		}>
	>;
	loading: boolean;
	refresh: () => Promise<void>;
};

const CustomerDataContext = createContext<CustomerDataState | undefined>(
	undefined
);

export const CustomerDataProvider: FC<PropsWithChildren> = ({ children }) => {
	// Source canonical data from the unified websocket/data provider
	const { conversations, isLoading: conversationsLoading } =
		useConversationsData();
	const { reservations, isLoading: reservationsLoading } =
		useReservationsData();

	// Build base customers list by combining conversations and reservations
	const baseCustomers = useMemo<CustomerDataState["customers"]>(
		() => buildBaseCustomers(conversations, reservations),
		[conversations, reservations]
	);

	// Realtime overlays for add/update/delete without requiring snapshots
	const [customerOverrides, setCustomerOverrides] = useState<
		Map<string, { name?: string; phone?: string }>
	>(new Map());
	const [deletedCustomers, setDeletedCustomers] = useState<Set<string>>(
		new Set()
	);

	// Listen for websocket fan-out events to keep customer names/entries fresh
	useEffect(() => {
		const handleCustomerEvent = (
			type: string,
			wa: string,
			data: Record<string, unknown>
		) => {
			if (type === "customer_updated" || type === "customer_created") {
				// Apply name/phone overrides and clear any delete marker
				setCustomerOverrides((prev) => {
					const next = new Map(prev);
					const cur = next.get(wa) || {};
					const nameAny =
						(data?.name as string) ||
						(data?.customer_name as string) ||
						undefined;
					const phoneAny = (data?.phone as string) || undefined;
					next.set(wa, {
						...cur,
						...(nameAny !== undefined ? { name: nameAny } : {}),
						...(phoneAny !== undefined ? { phone: phoneAny } : {}),
					});
					return next;
				});
				setDeletedCustomers((prev) => {
					if (!prev.has(wa)) {
						return prev;
					}
					const n = new Set(prev);
					n.delete(wa);
					return n;
				});
				return;
			}

			if (type === "customer_deleted" || type === "customer_removed") {
				// Mark as deleted and drop any overrides
				setDeletedCustomers((prev) => {
					const n = new Set(prev);
					n.add(wa);
					return n;
				});
				setCustomerOverrides((prev) => {
					if (!prev.has(wa)) {
						return prev;
					}
					const n = new Map(prev);
					n.delete(wa);
					return n;
				});
			}
		};

		const handler = (ev: Event) => {
			try {
				const { type, data } = (ev as CustomEvent).detail || {};
				if (!type) {
					return;
				}
				const t = String(type).toLowerCase();
				const d = (data || {}) as Record<string, unknown>;
				const wa = String(
					(d?.wa_id as string) || (d?.waId as string) || (d?.id as string) || ""
				);
				if (!wa) {
					return;
				}
				handleCustomerEvent(t, wa, d);
			} catch (_error) {
				// Silently ignore event parsing errors to prevent disrupting realtime stream
			}
		};
		window.addEventListener("realtime", handler as EventListener);
		return () =>
			window.removeEventListener("realtime", handler as EventListener);
	}, []);

	// Merge base customers with realtime overlays, supporting adds/updates/deletes
	const customers = useMemo<CustomerDataState["customers"]>(() => {
		const merged = mergeCustomerOverlays(
			baseCustomers,
			customerOverrides,
			deletedCustomers
		);
		return sortCustomersByLastMessage(merged, conversations);
	}, [baseCustomers, customerOverrides, deletedCustomers, conversations]);

	const loading = conversationsLoading || reservationsLoading;

	// Enrich base customers with names from backend for wa_ids that lack names
	useEffect(() => {
		const missing = baseCustomers
			.filter((c) => !String(c.name || "").trim())
			.map((c) => c.id)
			.filter(Boolean);
		// biome-ignore lint/suspicious/noConsole: temporary debug logging
		console.log(
			"[CustomerDataProvider] Enrichment check: baseCustomers=",
			baseCustomers.length,
			"missing=",
			missing.length
		);
		if (missing.length === 0) {
			return;
		}
		let aborted = false;
		const controller = new AbortController();
		fetchCustomerNames(missing, controller.signal)
			.then((resp) => {
				if (aborted || controller.signal.aborted) {
					return;
				}
				try {
					const map =
						(resp as { data?: Record<string, string | null> }).data || {};
					// biome-ignore lint/suspicious/noConsole: temporary debug logging
					console.log(
						"[CustomerDataProvider] Fetched",
						Object.keys(map).length,
						"names, non-null:",
						Object.values(map).filter(Boolean).length
					);
					setCustomerOverrides((prev) => {
						const next = new Map(prev);
						for (const [wa, name] of Object.entries(map)) {
							if ((name || "").trim()) {
								next.set(wa, { ...(next.get(wa) || {}), name: String(name) });
							}
						}
						// biome-ignore lint/suspicious/noConsole: temporary debug logging
						console.log(
							"[CustomerDataProvider] Overrides updated, size:",
							next.size
						);
						return next;
					});
				} catch (err) {
					// biome-ignore lint/suspicious/noConsole: temporary debug logging
					console.error("[CustomerDataProvider] Enrichment error:", err);
				}
			})
			.catch((err) => {
				if (aborted || controller.signal.aborted) {
					return;
				}
				if (err instanceof DOMException && err.name === "AbortError") {
					return;
				}
				// biome-ignore lint/suspicious/noConsole: temporary debug logging
				console.error("[CustomerDataProvider] Fetch error:", err);
			});
		return () => {
			aborted = true;
			try {
				controller.abort("cleanup");
			} catch (_abortError) {
				// AbortController may already be settled; ignore to avoid noisy errors
			}
		};
		// Only when baseCustomers changes; overrides/deletes are applied separately
	}, [baseCustomers]);

	const refresh = useCallback(async () => {
		// No-op: unified provider manages refresh; expose to satisfy consumers
		await Promise.resolve();
	}, []);

	// Transform conversations to match CustomerDataState interface
	const transformedConversations = useMemo(() => {
		const result: Record<
			string,
			Array<{ id?: string; text?: string; ts?: string }>
		> = {};
		for (const [waId, messages] of Object.entries(conversations || {})) {
			result[waId] = messages.map((msg, index) => ({
				id: `${waId}-${index}`,
				text: msg.message,
				ts: msg.date && msg.time ? `${msg.date}T${msg.time}` : "",
			}));
		}
		return result;
	}, [conversations]);

	const value = useMemo(
		() => ({
			customers,
			conversations: transformedConversations,
			reservations,
			loading,
			refresh,
		}),
		[customers, transformedConversations, reservations, loading, refresh]
	);

	return (
		<CustomerDataContext.Provider value={value}>
			{children}
		</CustomerDataContext.Provider>
	);
};

export function useCustomerData(): CustomerDataState {
	const ctx = useContext(CustomerDataContext);
	if (!ctx) {
		throw new Error("useCustomerData must be used within CustomerDataProvider");
	}
	return ctx;
}
