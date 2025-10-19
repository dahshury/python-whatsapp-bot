"use client";

import { sortWaIdsByChatOrder } from "@processes/customers/customer-list.process";
import { fetchCustomerNames } from "@shared/libs/api";
import { useCustomerData } from "@shared/libs/data/customer-data-context";
import { useConversationsData } from "@shared/libs/data/websocket-data-provider";
import { i18n } from "@shared/libs/i18n";
import { queryKeys } from "@shared/libs/query/query-keys";
import { prefetchConversationList } from "@shared/libs/query/query-prefetch";
import { useSettings } from "@shared/libs/state/settings-context";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { HoverCard, HoverCardContent } from "@shared/ui/hover-card";
import { PhoneCombobox } from "@shared/ui/phone-combobox";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import type { PhoneOption } from "@/entities/phone";
import { CustomerStatsCard } from "@/features/dashboard/customer-stats-card";
import { ButtonGroup } from "@/shared/ui/button-group";

const HOVER_CARD_DELAY_MS = 1500;
const HOVER_CARD_CLOSE_DELAY_MS = 100;

type ConversationComboboxProps = {
	conversations: Record<string, ConversationMessage[]>;
	reservations: Record<string, Reservation[]>;
	selectedConversationId: string | null;
	onConversationSelect: (conversationId: string) => void;
	isLocalized?: boolean;
};

export const ConversationCombobox: React.FC<ConversationComboboxProps> = ({
	conversations,
	reservations,
	selectedConversationId,
	onConversationSelect,
	isLocalized = false,
}) => {
	const { chatMessageLimit } = useSettings();
	const [showHoverCard, setShowHoverCard] = useState(false);
	const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
	const [closeTimer, setCloseTimer] = useState<NodeJS.Timeout | null>(null);

	const hoverCardRef = useRef<HTMLDivElement>(null);

	// Use persistent chat store for managing conversation selection
	const {
		selectedConversationId: persistentSelectedId,
		setSelectedConversation,
		_hasHydrated,
	} = useSidebarChatStore();

	// Use centralized customer data instead of processing locally
	const { customers } = useCustomerData();
	const queryClient = useQueryClient();

	// Only use persisted selection after hydration is complete, otherwise use prop
	const effectiveSelectedId =
		_hasHydrated && persistentSelectedId
			? persistentSelectedId
			: selectedConversationId;

	// Create conversation options from centralized customer data
	const MAX_RECENT = 50;
	const [recentPhoneOptions, setRecentPhoneOptions] = useState<PhoneOption[]>(
		[]
	);
	const [recentReady, setRecentReady] = useState(false);
	const recentDirtyRef = useRef(true);

	// Invalidate recents on new incoming messages
	useEffect(() => {
		const handler = (ev: Event) => {
			try {
				const { type } = (ev as CustomEvent).detail || {};
				if (type === "conversation_new_message") {
					recentDirtyRef.current = true;
				}
			} catch {
				// ignore
			}
		};
		window.addEventListener("realtime", handler as EventListener);
		return () =>
			window.removeEventListener("realtime", handler as EventListener);
	}, []);

	const conversationOptions = React.useMemo(() => {
		const waIds = recentPhoneOptions.map((p) => p.number);
		const nameMap = new Map(
			recentPhoneOptions.map((p) => [p.number, p.name || ""])
		);
		const ordered = sortWaIdsByChatOrder(waIds, conversations, (wa) =>
			nameMap.get(wa)
		);
		return ordered.map((wa) => {
			const convList = conversations[wa] ?? [];
			const messageCount = convList.length || 0;
			const lastMessage = convList.at(-1);
			const customerName = nameMap.get(wa) || "";
			return {
				value: wa,
				label: customerName ? `${customerName} (${wa})` : wa,
				customerName,
				messageCount,
				lastMessage,
				hasConversation: true,
			};
		});
	}, [recentPhoneOptions, conversations]);

	// Current index for navigation (must be after conversationOptions is defined)
	const currentIndex = conversationOptions.findIndex(
		(opt) => opt.value === effectiveSelectedId
	);

	const { loadConversationMessages } = useConversationsData();

	// On first open, ensure recent list conversations exist in memory by fetching latest slice
	const hasBootstrappedRef = React.useRef(false);
	function computeMonthRange(now: Date) {
		const y = now.getFullYear();
		const m = now.getMonth();
		const from = new Date(y, m, 1);
		const to = new Date(y, m + 1, 0);
		const toIso = (d: Date) =>
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		return { fromDate: toIso(from), toDate: toIso(to) } as const;
	}

	async function buildRecentPhones(
		conversationsData: Record<string, ConversationMessage[]>,
		customersPool: Array<{ id: string; name: string; phone?: string }>,
		max: number
	): Promise<PhoneOption[]> {
		const entries = Object.entries(conversationsData) as [
			string,
			ConversationMessage[],
		][];
		const withTs = entries.map(([wa, list]) => {
			const last = list.at(-1);
			let ts = 0;
			if (last) {
				const t = new Date(`${last.date} ${last.time}`).getTime();
				ts = Number.isNaN(t) ? 0 : t;
			}
			return { wa, ts };
		});
		withTs.sort((a, b) => b.ts - a.ts);
		const top = withTs.slice(0, max).map((x) => x.wa);
		const customerNameMap = new Map(
			customersPool.map((c) => [c.phone || c.id, c.name])
		);
		const missing = top.filter((wa) => !(customerNameMap.get(wa) || "").trim());
		// biome-ignore lint/suspicious/noConsole: temporary debug logging
		console.log(
			"[buildRecentPhones] Missing names for",
			missing.length,
			"wa_ids"
		);
		if (missing.length > 0) {
			try {
				const namesResp = (await fetchCustomerNames(missing)) as {
					success?: boolean;
					data?: Record<string, string | null>;
				};
				const map = namesResp?.data || {};
				// biome-ignore lint/suspicious/noConsole: temporary debug logging
				console.log(
					"[buildRecentPhones] Fetched",
					Object.keys(map).length,
					"names:",
					map
				);
				for (const [wa, name] of Object.entries(map)) {
					if ((name || "").trim()) {
						customerNameMap.set(wa, String(name));
					}
				}
			} catch (err) {
				// biome-ignore lint/suspicious/noConsole: temporary debug logging
				console.error("[buildRecentPhones] Fetch error:", err);
			}
		}
		return top.map((wa) => {
			const name = customerNameMap.get(wa) || "";
			return {
				number: wa,
				name,
				country: "US",
				label: name || wa,
				id: wa,
			} as PhoneOption;
		});
	}

	// Helper functions are stable and defined in the component scope without capturing reactive values.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const handleComboboxOpen = React.useCallback(() => {
		if (hasBootstrappedRef.current) {
			return;
		}
		hasBootstrappedRef.current = true;
		prefetchConversationList(queryClient, { recent: "month" }).catch(() => {
			// ignore prefetch errors
		});
		// Fetch a limited slice for visible recent options to avoid empty metadata
		const { fromDate, toDate } = computeMonthRange(new Date());

		// Fetch recent 50 conversations using React Query cache (memoized until dirty)
		const loadRecents = async () => {
			if (
				!recentDirtyRef.current &&
				recentReady &&
				recentPhoneOptions.length > 0
			) {
				return;
			}
			try {
				const qk = queryKeys.conversations.list({ recent: "month" });
				let resp = queryClient.getQueryData(qk) as
					| { data?: Record<string, ConversationMessage[]> }
					| undefined;
				if (!resp) {
					await prefetchConversationList(queryClient, { recent: "month" });
					resp = queryClient.getQueryData(qk) as
						| { data?: Record<string, ConversationMessage[]> }
						| undefined;
				}
				const data =
					(resp?.data as Record<string, ConversationMessage[]>) || {};
				const phones = await buildRecentPhones(data, customers, MAX_RECENT);
				// biome-ignore lint/suspicious/noConsole: temporary debug logging
				console.log(
					"[ConversationCombobox] Built phones:",
					phones.length,
					"with names:",
					phones.filter((p) => p.name).length
				);
				setRecentPhoneOptions(phones);
				recentDirtyRef.current = false;
				setRecentReady(true);
			} catch {
				// ignore errors; recent list will stay empty and fallback to search
			}
		};
		loadRecents();

		// Prefetch messages for visible recent options only if not present
		for (const opt of conversationOptions) {
			const wa = opt.value;
			try {
				const hasAny =
					Array.isArray(conversations[wa]) && conversations[wa].length > 0;
				if (!hasAny) {
					loadConversationMessages?.(wa, {
						fromDate,
						toDate,
						limit: chatMessageLimit,
					});
				}
			} catch {
				// ignore individual prefetch errors
			}
		}
	}, [
		conversationOptions,
		conversations,
		loadConversationMessages,
		chatMessageLimit,
		recentReady,
		recentPhoneOptions.length,
		queryClient,
		customers,
	]);

	// Preload recents on mount so options are available on first open
	useEffect(() => {
		if (!hasBootstrappedRef.current) {
			handleComboboxOpen();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handleComboboxOpen]);

	// Enhanced conversation selection: on-demand loading for the selected waId
	const handleConversationSelect = useCallback(
		(conversationId: string) => {
			const now = new Date();
			const y = now.getFullYear();
			const m = now.getMonth();
			const from = new Date(y, m, 1);
			const to = new Date(y, m + 1, 0);
			const toIso = (d: Date) =>
				`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
			loadConversationMessages?.(conversationId, {
				fromDate: toIso(from),
				toDate: toIso(to),
				limit: chatMessageLimit,
			});

			// Update the persistent store
			setSelectedConversation(conversationId);
			// Also call the parent callback
			onConversationSelect(conversationId);
		},
		[
			loadConversationMessages,
			setSelectedConversation,
			onConversationSelect,
			chatMessageLimit,
		]
	);

	// Navigation handlers
	const handlePrevious = () => {
		if (conversationOptions.length === 0) {
			return;
		}
		// Move toward older items; stop at the end
		if (currentIndex >= conversationOptions.length - 1) {
			return;
		}
		const newIndex = currentIndex + 1;
		const selectedOption = conversationOptions[newIndex];
		if (selectedOption) {
			handleConversationSelect(selectedOption.value);
		}
	};

	const handleNext = () => {
		if (conversationOptions.length === 0) {
			return;
		}
		// Move toward newer items; stop at the start
		if (currentIndex <= 0) {
			return;
		}
		const newIndex = currentIndex - 1;
		const selectedOption = conversationOptions[newIndex];
		if (selectedOption) {
			handleConversationSelect(selectedOption.value);
		}
	};

	// Clear timers when component unmounts
	useEffect(
		() => () => {
			if (hoverTimer) {
				clearTimeout(hoverTimer);
			}
			if (closeTimer) {
				clearTimeout(closeTimer);
			}
		},
		[hoverTimer, closeTimer]
	);

	// Removed local search state; PhoneCombobox manages its own input

	const handleMouseEnter = useCallback(() => {
		// Only start timer if we have a selected conversation
		if (effectiveSelectedId) {
			// Clear any close timer
			if (closeTimer) {
				clearTimeout(closeTimer);
				setCloseTimer(null);
			}

			// Clear any existing hover timer
			if (hoverTimer) {
				clearTimeout(hoverTimer);
			}

			const timer = setTimeout(() => {
				setShowHoverCard(true);
			}, HOVER_CARD_DELAY_MS);
			setHoverTimer(timer);
		}
	}, [effectiveSelectedId, closeTimer, hoverTimer]);

	const handleMouseLeave = useCallback(
		(e: React.MouseEvent) => {
			// Check if we're moving to the hover card
			const relatedTarget = e.relatedTarget as EventTarget | null;
			const hoverEl = hoverCardRef.current;
			if (
				relatedTarget &&
				hoverEl &&
				relatedTarget instanceof Node &&
				hoverEl.contains(relatedTarget as Node)
			) {
				// Moving to hover card, keep it open
				return;
			}

			// Clear any pending hover timer
			if (hoverTimer) {
				clearTimeout(hoverTimer);
				setHoverTimer(null);
			}

			// Clear any existing close timer
			if (closeTimer) {
				clearTimeout(closeTimer);
			}

			// Use a small delay before closing to prevent flicker
			const timer = setTimeout(() => {
				setShowHoverCard(false);
			}, HOVER_CARD_CLOSE_DELAY_MS);

			setCloseTimer(timer);
		},
		[hoverTimer, closeTimer]
	);

	// Note: Scroll behavior is now handled by the PhoneCombobox component

	// Build PhoneCombobox options from centralized customer data, sorted by recency
	// For the phone picker, use recents if available; otherwise build from customers as fallback
	const phoneOptions: PhoneOption[] = React.useMemo(() => {
		if (recentPhoneOptions.length > 0) {
			return recentPhoneOptions;
		}
		// Fallback: derive from customers list
		const enriched = customers.map((customer) => {
			const key = String(customer.phone ?? "");
			const convList = conversations[key] ?? [];
			const lastMessage = convList.at(-1);
			let lastMessageTime = 0;
			if (lastMessage) {
				const t = new Date(`${lastMessage.date} ${lastMessage.time}`).getTime();
				if (!Number.isNaN(t)) {
					lastMessageTime = t;
				}
			}
			return {
				number: key,
				name: customer.name || "",
				country: "US",
				label: customer.name || key,
				id: key,
				__lastMessageTime: lastMessageTime,
			};
		});
		enriched.sort(
			(a, b) => (b.__lastMessageTime || 0) - (a.__lastMessageTime || 0)
		);
		return enriched.map(({ __lastMessageTime, ...rest }) => rest);
	}, [recentPhoneOptions, customers, conversations]);

	return (
		<div className="space-y-2">
			{/* Navigation Row */}
			<ButtonGroup
				aria-label={i18n.getMessage("conversation_navigation", isLocalized)}
				className="flex w-full min-w-0 max-w-full items-stretch overflow-hidden"
				orientation="horizontal"
			>
				<Button
					className="h-8 w-8 p-0"
					disabled={
						conversationOptions.length === 0 ||
						currentIndex === conversationOptions.length - 1
					}
					onClick={handlePrevious}
					size="sm"
					title={i18n.getMessage("older", isLocalized)}
					variant="outline"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>

				{/* Conversation Selector with HoverCard */}
				<div className="min-w-0 max-w-full flex-1 overflow-hidden">
					<HoverCard open={showHoverCard}>
						{/* PhoneCombobox acts as the trigger (content to hover over) */}
						<PhoneCombobox
							className="w-full min-w-0 max-w-full"
							onChange={handleConversationSelect}
							onMouseEnter={() => {
								handleComboboxOpen();
								handleMouseEnter();
							}}
							onMouseLeave={handleMouseLeave}
							phoneOptions={phoneOptions}
							placeholder={i18n.getMessage(
								"chat_select_conversation",
								isLocalized
							)}
							preferPlaceholderWhenEmpty={true}
							rounded={false}
							showCountrySelector={false}
							showNameAndPhoneWhenClosed={true}
							shrinkTextToFit={true}
							size="sm"
							uncontrolled={false}
							value={effectiveSelectedId || ""}
						/>

						{effectiveSelectedId && (
							<HoverCardContent
								align="center"
								className="z-50 w-[18.75rem] p-0"
								onMouseEnter={() => {
									// Clear any close timer when entering hover card
									if (closeTimer) {
										clearTimeout(closeTimer);
										setCloseTimer(null);
									}
									// Clear hover timer too
									if (hoverTimer) {
										clearTimeout(hoverTimer);
										setHoverTimer(null);
									}
								}}
								onMouseLeave={(e: React.MouseEvent) => {
									// Check if we're moving back to the trigger (PhoneCombobox)
									const relatedTarget = e.relatedTarget as HTMLElement;
									if (
										relatedTarget &&
										(e.currentTarget as HTMLElement).contains(relatedTarget)
									) {
										return;
									}
									// Otherwise close the hover card after a small delay
									const timer = setTimeout(() => {
										setShowHoverCard(false);
									}, HOVER_CARD_CLOSE_DELAY_MS);
									setCloseTimer(timer);
								}}
								ref={hoverCardRef}
								sideOffset={5}
							>
								<CustomerStatsCard
									conversations={conversations}
									isHoverCard={true}
									isLocalized={isLocalized}
									reservations={reservations}
									selectedConversationId={effectiveSelectedId}
								/>
							</HoverCardContent>
						)}
					</HoverCard>
				</div>

				<Button
					className="h-8 w-8 p-0"
					disabled={conversationOptions.length === 0 || currentIndex === 0}
					onClick={handleNext}
					size="sm"
					title={i18n.getMessage("more_recent", isLocalized)}
					variant="outline"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</ButtonGroup>
		</div>
	);
};
