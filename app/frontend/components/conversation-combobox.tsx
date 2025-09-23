"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CustomerStatsCard } from "@/components/customer-stats-card";
import { Button } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
	PhoneCombobox,
	type PhoneOption,
} from "@/components/ui/phone-combobox";
import { useCustomerData } from "@/lib/customer-data-context";
import { i18n } from "@/lib/i18n";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import type { Conversations, Reservation } from "@/types/calendar";

interface ConversationComboboxProps {
	conversations: Conversations;
	reservations: Record<string, Reservation[]>;
	selectedConversationId: string | null;
	onConversationSelect: (conversationId: string) => void;
	isLocalized?: boolean;
}

export const ConversationCombobox: React.FC<ConversationComboboxProps> = ({
	conversations,
	reservations,
	selectedConversationId,
	onConversationSelect,
	isLocalized = false,
}) => {
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

	// Only use persisted selection after hydration is complete, otherwise use prop
	const effectiveSelectedId =
		_hasHydrated && persistentSelectedId
			? persistentSelectedId
			: selectedConversationId;

	// Create conversation options from centralized customer data
	const conversationOptions = React.useMemo(() => {
		return customers
			.map((customer) => {
				const key = String(customer.phone ?? "");
				const convList = conversations[key] ?? [];
				const messageCount = convList.length || 0;
				const lastMessage = convList[convList.length - 1];

				return {
					value: key,
					label: customer.name ? `${customer.name} (${key})` : key,
					customerName: customer.name,
					messageCount,
					lastMessage,
					hasConversation: true,
				};
			})
			.sort((a, b) => {
				// Multi-criteria sorting: 1) last message time, 2) has name, 3) phone number

				// 1. Sort by most recent message first (primary criteria)
				if (a.lastMessage && b.lastMessage) {
					const aMessageTime = new Date(
						`${a.lastMessage.date} ${a.lastMessage.time}`,
					);
					const bMessageTime = new Date(
						`${b.lastMessage.date} ${b.lastMessage.time}`,
					);
					const timeDiff = bMessageTime.getTime() - aMessageTime.getTime();
					if (timeDiff !== 0) return timeDiff;
				} else if (a.lastMessage && !b.lastMessage) {
					return -1; // a has message, b doesn't - a comes first
				} else if (!a.lastMessage && b.lastMessage) {
					return 1; // b has message, a doesn't - b comes first
				}

				// 2. Sort by customers who have both names and numbers (secondary criteria)
				const aHasName = !!a.customerName;
				const bHasName = !!b.customerName;
				if (aHasName && !bHasName) return -1; // a has name, b doesn't - a comes first
				if (!aHasName && bHasName) return 1; // b has name, a doesn't - b comes first

				// 3. Sort by phone number (tertiary criteria)
				return a.value.localeCompare(b.value, undefined, { numeric: true });
			});
	}, [customers, conversations]);

	// Current index for navigation (must be after conversationOptions is defined)
	const currentIndex = conversationOptions.findIndex(
		(opt) => opt.value === effectiveSelectedId,
	);

	// Enhanced conversation selection handler that updates persistent store
	const handleConversationSelect = useCallback(
		(conversationId: string) => {
			// Update the persistent store
			setSelectedConversation(conversationId);

			// Also call the parent callback for any additional logic
			onConversationSelect(conversationId);
		},
		[setSelectedConversation, onConversationSelect],
	);

	// Navigation handlers
	const handlePrevious = () => {
		if (conversationOptions.length === 0) return;
		// Move toward older items; stop at the end
		if (currentIndex >= conversationOptions.length - 1) return;
		const newIndex = currentIndex + 1;
		const selectedOption = conversationOptions[newIndex];
		if (selectedOption) {
			handleConversationSelect(selectedOption.value);
		}
	};

	const handleNext = () => {
		if (conversationOptions.length === 0) return;
		// Move toward newer items; stop at the start
		if (currentIndex <= 0) return;
		const newIndex = currentIndex - 1;
		const selectedOption = conversationOptions[newIndex];
		if (selectedOption) {
			handleConversationSelect(selectedOption.value);
		}
	};

	// Clear timers when component unmounts
	useEffect(() => {
		return () => {
			if (hoverTimer) {
				clearTimeout(hoverTimer);
			}
			if (closeTimer) {
				clearTimeout(closeTimer);
			}
		};
	}, [hoverTimer, closeTimer]);

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
			}, 1500);
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
			}, 100);

			setCloseTimer(timer);
		},
		[hoverTimer, closeTimer],
	);

	// Note: Scroll behavior is now handled by the PhoneCombobox component

	// Build PhoneCombobox options from centralized customer data, sorted by recency
	const phoneOptions: PhoneOption[] = React.useMemo(() => {
		const enriched = customers.map((customer) => {
			const key = String(customer.phone ?? "");
			const convList = conversations[key] ?? [];
			const lastMessage = convList[convList.length - 1];
			let lastMessageTime = 0;
			if (lastMessage) {
				const t = new Date(`${lastMessage.date} ${lastMessage.time}`).getTime();
				if (!Number.isNaN(t)) lastMessageTime = t;
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
			(a, b) => (b.__lastMessageTime || 0) - (a.__lastMessageTime || 0),
		);
		return enriched.map(({ __lastMessageTime, ...rest }) => rest);
	}, [customers, conversations]);

	return (
		<div className="space-y-2">
			{/* Navigation Row */}
			<div className="flex items-center gap-1">
				<Button
					variant="outline"
					size="sm"
					onClick={handlePrevious}
					disabled={
						conversationOptions.length === 0 ||
						currentIndex === conversationOptions.length - 1
					}
					className="h-8 w-8 p-0 flex-shrink-0"
					title={isLocalized ? "الأقدم" : "Older"}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>

				{/* Conversation Selector with HoverCard */}
				<div className="flex-1 min-w-0 overflow-hidden">
					<HoverCard open={showHoverCard}>
						<HoverCardTrigger asChild>
							<div className="w-full">
								<PhoneCombobox
									value={effectiveSelectedId || ""}
									onChange={handleConversationSelect}
									placeholder={i18n.getMessage(
										"chat_select_conversation",
										isLocalized,
									)}
									phoneOptions={phoneOptions}
									uncontrolled={false}
									showCountrySelector={false}
									showNameAndPhoneWhenClosed={true}
									size="sm"
									className="w-full"
									shrinkTextToFit={true}
									preferPlaceholderWhenEmpty={true}
									onMouseEnter={handleMouseEnter}
									onMouseLeave={handleMouseLeave}
								/>
							</div>
						</HoverCardTrigger>

						{effectiveSelectedId && (
							<HoverCardContent
								ref={hoverCardRef}
								className="w-[18.75rem] p-0 z-50"
								align="center"
								sideOffset={5}
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
									}, 100);
									setCloseTimer(timer);
								}}
							>
								<CustomerStatsCard
									selectedConversationId={effectiveSelectedId}
									conversations={conversations}
									reservations={reservations}
									isLocalized={isLocalized}
									isHoverCard={true}
								/>
							</HoverCardContent>
						)}
					</HoverCard>
				</div>

				<Button
					variant="outline"
					size="sm"
					onClick={handleNext}
					disabled={conversationOptions.length === 0 || currentIndex === 0}
					className="h-8 w-8 p-0 flex-shrink-0"
					title={isLocalized ? "الأحدث" : "More Recent"}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
};
