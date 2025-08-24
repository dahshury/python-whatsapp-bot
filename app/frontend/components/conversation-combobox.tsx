"use client";

import {
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	MessageSquare,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CustomerStatsCard } from "@/components/customer-stats-card";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useCustomerData } from "@/lib/customer-data-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import { cn } from "@/lib/utils";
import type { Conversations, Reservation } from "@/types/calendar";

interface ConversationComboboxProps {
	conversations: Conversations;
	reservations: Record<string, Reservation[]>;
	selectedConversationId: string | null;
	onConversationSelect: (conversationId: string) => void;
	isRTL?: boolean;
}

export const ConversationCombobox: React.FC<ConversationComboboxProps> = ({
	conversations,
	reservations,
	selectedConversationId,
	onConversationSelect,
	isRTL = false,
}) => {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [showHoverCard, setShowHoverCard] = useState(false);
	const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
	const [closeTimer, setCloseTimer] = useState<NodeJS.Timeout | null>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
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
				const convList = (conversations as Record<string, any[]>)[key] ?? [];
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
					const aMessageTime = new Date(`${a.lastMessage.date} ${a.lastMessage.time}`);
					const bMessageTime = new Date(`${b.lastMessage.date} ${b.lastMessage.time}`);
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
		const newIndex =
			currentIndex >= conversationOptions.length - 1 ? 0 : currentIndex + 1;
		handleConversationSelect(conversationOptions[newIndex].value);
	};

	const handleNext = () => {
		if (conversationOptions.length === 0) return;
		const newIndex =
			currentIndex <= 0 ? conversationOptions.length - 1 : currentIndex - 1;
		handleConversationSelect(conversationOptions[newIndex].value);
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

	// Filter options based on search
	const filteredOptions = React.useMemo(() => {
		if (!searchValue) return conversationOptions;

		const searchLower = searchValue.toLowerCase();
		return conversationOptions.filter(
			(option) =>
				option.value.toLowerCase().includes(searchLower) ||
				option.customerName?.toLowerCase().includes(searchLower),
		);
	}, [conversationOptions, searchValue]);

	// Get selected option
	const selectedOption = conversationOptions.find(
		(option) => option.value === effectiveSelectedId,
	);

	// Format time for display
	const _formatTime = (lastMessage: any) => {
		if (!lastMessage) return "";

		try {
			const messageDate = new Date(`${lastMessage.date} ${lastMessage.time}`);
			const now = new Date();
			const diffMs = now.getTime() - messageDate.getTime();
			const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
			const diffDays = Math.floor(diffHours / 24);

			if (diffDays > 0) {
				return isRTL ? `قبل ${diffDays}ي` : `${diffDays}d ago`;
			} else if (diffHours > 0) {
				return isRTL ? `قبل ${diffHours}س` : `${diffHours}h ago`;
			} else {
				const diffMinutes = Math.floor(diffMs / (1000 * 60));
				return isRTL ? `قبل ${diffMinutes}د` : `${diffMinutes}m ago`;
			}
		} catch {
			return "";
		}
	};

	const handleMouseEnter = useCallback(() => {
		// Only start timer if combobox is closed and we have a selected conversation
		if (!open && effectiveSelectedId) {
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
			}, 2000);
			setHoverTimer(timer);
		}
	}, [open, effectiveSelectedId, closeTimer, hoverTimer]);

	const handleMouseLeave = useCallback(
		(e: React.MouseEvent) => {
			// Don't do anything if combobox is open
			if (open) return;

			// Check if we're moving to the hover card
			const relatedTarget = e.relatedTarget as HTMLElement;
			if (relatedTarget && hoverCardRef.current?.contains(relatedTarget)) {
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
		[hoverTimer, closeTimer, open],
	);

	// Scroll to selected item when dropdown opens
	useEffect(() => {
		if (open && effectiveSelectedId) {
			// Small delay to ensure the dropdown is rendered
			setTimeout(() => {
				const selectedElement = document.querySelector(
					`[data-value="${effectiveSelectedId}"]`,
				);
				if (selectedElement) {
					selectedElement.scrollIntoView({ block: "center", behavior: "auto" });
				}
			}, 50);
		}
	}, [open, effectiveSelectedId]);

	return (
		<div className="space-y-2">
			{/* Navigation Row */}
			<div className="flex items-center gap-1">
				<Button
					variant="outline"
					size="sm"
					onClick={handleNext}
					disabled={conversationOptions.length === 0 || currentIndex === 0}
					className="h-8 w-8 p-0 flex-shrink-0"
					title={isRTL ? "الأحدث" : "More Recent"}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>

				{/* Combobox + HoverCard */}
				<HoverCard open={showHoverCard && !open}>
					<HoverCardTrigger asChild>
						<div
							onMouseEnter={handleMouseEnter}
							onMouseLeave={handleMouseLeave}
							className="flex-1"
						>
							<Popover
								open={open}
								onOpenChange={(newOpen) => {
									setOpen(newOpen);
									// Close hover card when opening combobox
									if (newOpen) {
										setShowHoverCard(false);
										if (hoverTimer) {
											clearTimeout(hoverTimer);
											setHoverTimer(null);
										}
									}
								}}
							>
								<PopoverTrigger asChild>
									<Button
										ref={triggerRef}
										variant="outline"
										role="combobox"
										aria-expanded={open}
										className="w-full justify-between text-[11px] h-8 px-2"
									>
										<div className="flex items-center gap-1.5 truncate">
											<MessageSquare className="h-2.5 w-2.5 flex-shrink-0" />
											<span className="truncate">
												{selectedOption
													? selectedOption.label
													: isRTL
														? "اختر محادثة..."
														: "Select conversation..."}
											</span>
										</div>
										<ChevronsUpDown className="h-2.5 w-2.5 opacity-50 flex-shrink-0" />
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className="w-[var(--radix-popover-trigger-width)] p-0"
									align="start"
								>
									<Command shouldFilter={false}>
										{/* Disable built-in filtering since we have custom logic */}
										<CommandInput
											placeholder={
												isRTL
													? "ابحث في المحادثات..."
													: "Search conversations..."
											}
											className="text-sm"
											value={searchValue}
											onValueChange={setSearchValue}
										/>
										<CommandList>
											<CommandEmpty className="text-xs py-2 text-center">
												{isRTL ? "لا توجد محادثات" : "No conversations found"}
											</CommandEmpty>
											<CommandGroup>
												{filteredOptions.map((option) => (
													<CommandItem
														key={option.value}
														value={option.value}
														data-value={option.value}
														onSelect={() => {
															handleConversationSelect(option.value);
															setOpen(false);
														}}
														className={cn(
															"text-sm py-1.5",
															effectiveSelectedId === option.value &&
																"ring-1 ring-primary ring-offset-1",
														)}
													>
														<div className="flex items-center justify-between w-full">
															<div className="flex items-center gap-2 flex-1 min-w-0">
																<span className="truncate">{option.label}</span>
															</div>
														</div>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>
					</HoverCardTrigger>

					{effectiveSelectedId && !open && (
						<HoverCardContent
							ref={hoverCardRef}
							className="w-[300px] p-0 z-50"
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
								// Check if we're moving back to the trigger
								const relatedTarget = e.relatedTarget as HTMLElement;
								if (
									relatedTarget &&
									triggerRef.current?.contains(relatedTarget)
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
								isRTL={isRTL}
								isHoverCard={true}
							/>
						</HoverCardContent>
					)}
				</HoverCard>

				<Button
					variant="outline"
					size="sm"
					onClick={handlePrevious}
					disabled={
						conversationOptions.length === 0 ||
						currentIndex === conversationOptions.length - 1
					}
					className="h-8 w-8 p-0 flex-shrink-0"
					title={isRTL ? "الأقدم" : "Older"}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
};
