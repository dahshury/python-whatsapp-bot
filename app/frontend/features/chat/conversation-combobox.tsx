"use client";

import { sortWaIdsByChatOrder } from "@processes/customers/customer-list.process";
import { useCustomerData } from "@shared/libs/data/customer-data-context";
import { i18n } from "@shared/libs/i18n";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { Button } from "@ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import type { PhoneOption } from "@/entities/phone";
import { CustomerStatsCard } from "@/features/dashboard/customer-stats-card";
import { ButtonGroup } from "@/shared/ui/button-group";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/shared/ui/hover-card";
import { PhoneCombobox } from "@/shared/ui/phone-combobox";

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
		const waIds = customers.map((c) => String(c.phone ?? ""));
		const nameMap = new Map(
			waIds.map((wa) => [
				wa,
				customers.find((c) => String(c.phone ?? "") === wa)?.name || "",
			])
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
	}, [customers, conversations]);

	// Current index for navigation (must be after conversationOptions is defined)
	const currentIndex = conversationOptions.findIndex(
		(opt) => opt.value === effectiveSelectedId
	);

	// Enhanced conversation selection handler that updates persistent store
	const handleConversationSelect = useCallback(
		(conversationId: string) => {
			// Update the persistent store
			setSelectedConversation(conversationId);

			// Also call the parent callback for any additional logic
			onConversationSelect(conversationId);
		},
		[setSelectedConversation, onConversationSelect]
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
	const phoneOptions: PhoneOption[] = React.useMemo(() => {
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
	}, [customers, conversations]);

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
						<HoverCardTrigger asChild>
							<div className="w-full max-w-full">
								<PhoneCombobox
									className="w-full min-w-0 max-w-full"
									onChange={handleConversationSelect}
									onMouseEnter={handleMouseEnter}
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
							</div>
						</HoverCardTrigger>

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
