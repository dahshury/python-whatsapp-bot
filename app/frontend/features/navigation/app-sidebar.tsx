"use client";

import {
	useConversationsData,
	useReservationsData,
} from "@shared/libs/data/websocket-data-provider";
import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { cn } from "@shared/libs/utils";
import { Calendar, Clock, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { ChatSidebarContent } from "@/features/chat/chat-sidebar-content";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	useSidebar,
} from "@/shared/ui/sidebar";
import { PrayerTimesWidget } from "@/widgets/prayer-times-widget";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { isLocalized } = useLanguage();
	const { setOpenMobile, setOpen, open, openMobile } = useSidebar();
	const pathname = usePathname();
	const isDashboardPage = pathname?.startsWith("/dashboard") ?? false;

	// Use unified data provider
	const { conversations, isLoading: conversationsLoading } =
		useConversationsData();
	const { reservations, isLoading: reservationsLoading } =
		useReservationsData();
	const chatLoading = conversationsLoading || reservationsLoading;

	// Use enhanced persistent chat store
	const {
		shouldOpenChat,
		conversationIdToOpen,
		clearOpenRequest,
		setLoadingConversation,
		selectedConversationId,
		activeTab,
		_hasHydrated,
		setSelectedConversation,
		setActiveTab,
		setChatSidebarOpen,
	} = useSidebarChatStore();

	const selectConversation = useCallback(
		(conversationId: string) => {
			setSelectedConversation(conversationId);
			setActiveTab("chat");
			setChatSidebarOpen(true);
			setLoadingConversation(false);
		},
		[
			setSelectedConversation,
			setActiveTab,
			setChatSidebarOpen,
			setLoadingConversation,
		]
	);

	const setOpenState = useCallback(
		(isOpen: boolean) => {
			setChatSidebarOpen(isOpen);
		},
		[setChatSidebarOpen]
	);

	const refreshData = async () => {
		// This will be handled by the unified provider
	};

	const isInitialized = !chatLoading && _hasHydrated;

	// Helper to add customers from conversations
	const addConversationCustomers = useCallback(
		(
			customerMap: Map<string, Record<string, string>>,
			conversationData: Record<string, unknown>
		): void => {
			for (const waId of Object.keys(conversationData)) {
				if (!customerMap.has(waId)) {
					customerMap.set(waId, {
						phone: waId,
						formattedPhone: waId.startsWith("+") ? waId : `+${waId}`,
					});
				}
			}
		},
		[]
	);

	// Helper to extract customer name from reservation
	const extractCustomerName = useCallback(
		(customerReservations: unknown[]): string | undefined => {
			const found = customerReservations.find((r: unknown) => {
				const reserv = r as { customer_name?: string };
				return !!reserv?.customer_name;
			}) as { customer_name?: string } | undefined;
			return found?.customer_name;
		},
		[]
	);

	// Helper to add or update customer entry
	const addOrUpdateCustomer = useCallback(
		(
			customerMap: Map<string, Record<string, string>>,
			waId: string,
			customerName: string
		): void => {
			const existing = customerMap.get(waId);
			if (existing) {
				existing.name = customerName;
			} else {
				customerMap.set(waId, {
					phone: waId,
					name: customerName,
					formattedPhone: waId.startsWith("+") ? waId : `+${waId}`,
				});
			}
		},
		[]
	);

	// Helper to add customer names from reservations
	const addReservationCustomers = useCallback(
		(
			customerMap: Map<string, Record<string, string>>,
			reservationData: Record<string, unknown>
		): void => {
			for (const [waId, customerReservations] of Object.entries(
				reservationData
			)) {
				if (
					Array.isArray(customerReservations) &&
					customerReservations.length > 0
				) {
					const customerName = extractCustomerName(customerReservations);
					if (customerName) {
						addOrUpdateCustomer(customerMap, waId, customerName);
					}
				}
			}
		},
		[extractCustomerName, addOrUpdateCustomer]
	);

	// Build customers list from unified data
	const customers = useMemo(() => {
		const customerMap = new Map<string, Record<string, string>>();
		addConversationCustomers(customerMap, conversations);
		addReservationCustomers(customerMap, reservations);
		return Array.from(customerMap.values());
	}, [
		conversations,
		reservations,
		addConversationCustomers,
		addReservationCustomers,
	]);

	const conversationOptions = useMemo(
		() =>
			customers.map((customer) => {
				const customerPhone = customer.phone;
				const customerConversations = customerPhone
					? conversations[customerPhone]
					: undefined;
				return {
					waId: customer.phone,
					customerName: customer.name,
					messageCount: (customerConversations as unknown[])?.length || 0,
					lastMessage: ((customerConversations as unknown[]) ?? [])[
						((customerConversations as unknown[])?.length ?? 1) - 1
					],
				};
			}),
		[customers, conversations]
	);

	// Helper to check if element is an input field
	const isInputElement = useCallback((element: Element | null): boolean => {
		if (!element) {
			return false;
		}
		return (
			element.tagName === "INPUT" ||
			element.tagName === "TEXTAREA" ||
			element.getAttribute("contenteditable") === "true"
		);
	}, []);

	// Helper to handle arrow key navigation
	const handleArrowKeyNavigation = useCallback(
		(_event: KeyboardEvent, key: "ArrowLeft" | "ArrowRight"): void => {
			const currentIndex = conversationOptions.findIndex(
				(option) => option.waId === selectedConversationId
			);

			let newIndex: number;
			if (key === "ArrowLeft") {
				newIndex = Math.max(0, currentIndex - 1);
			} else {
				newIndex = Math.min(conversationOptions.length - 1, currentIndex + 1);
			}

			const selectedConversation = conversationOptions[newIndex];
			if (selectedConversation?.waId) {
				setLoadingConversation(true);
				selectConversation(selectedConversation.waId);
			}
		},
		[
			conversationOptions,
			selectedConversationId,
			setLoadingConversation,
			selectConversation,
		]
	);

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Only handle arrow keys when chat tab is active and no input is focused
			if (activeTab !== "chat" || conversationOptions.length === 0) {
				return;
			}

			if (isInputElement(document.activeElement)) {
				return;
			}

			if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
				event.preventDefault();
				handleArrowKeyNavigation(
					event,
					event.key as "ArrowLeft" | "ArrowRight"
				);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [
		activeTab,
		conversationOptions,
		handleArrowKeyNavigation,
		isInputElement,
	]);

	// Auto-open sidebar when switching to chat tab or when hydrated with chat tab active
	useEffect(() => {
		if (isInitialized) {
			if (activeTab === "chat") {
				setOpenState(true);
			} else {
				setOpenState(false);
			}
		}
	}, [activeTab, isInitialized, setOpenState]);

	// Listen for chat open requests from calendar
	useEffect(() => {
		if (shouldOpenChat && conversationIdToOpen) {
			// Only open sidebar if it's currently closed, respect user's current state
			if (!open) {
				setOpen(true);
			}
			if (!openMobile) {
				setOpenMobile(true);
			}

			// Set the conversation as selected and switch to chat tab
			setSelectedConversation(conversationIdToOpen);
			setActiveTab("chat");
			setChatSidebarOpen(true);

			// Reset loading state since conversation is now selected
			setLoadingConversation(false);

			// Clear the request
			clearOpenRequest();
		}
	}, [
		shouldOpenChat,
		conversationIdToOpen,
		setSelectedConversation,
		setActiveTab,
		setChatSidebarOpen,
		setLoadingConversation,
		clearOpenRequest,
		setOpen,
		setOpenMobile,
		open,
		openMobile,
	]);

	// Handle tab clicks
	const handleTabChange = useCallback(
		(tab: "calendar" | "chat") => {
			setActiveTab(tab);
			if (tab === "chat") {
				setChatSidebarOpen(true);
			}
		},
		[setActiveTab, setChatSidebarOpen]
	);

	// Dashboard page: hide sidebar entirely
	if (isDashboardPage) {
		return null;
	}

	return (
		<Sidebar {...props} className="bg-sidebar">
			<SidebarHeader className="border-sidebar-border border-b bg-sidebar p-4">
				<div className="mb-4 flex items-center gap-2">
					<Calendar className="h-6 w-6" />
					<span className="font-semibold">
						{i18n.getMessage("reservation_manager", isLocalized)}
					</span>
				</div>

				{/* Tab Navigation */}
				<div className="flex space-x-0.5 rounded-md border border-border bg-muted p-0.5">
					<button
						className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors ${
							activeTab === "calendar"
								? "border border-border bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
						onClick={() => handleTabChange("calendar")}
						type="button"
					>
						<Calendar className="h-3.5 w-3.5" />
						{i18n.getMessage("calendar", isLocalized)}
					</button>
					<button
						className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors ${
							activeTab === "chat"
								? "border border-border bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
						onClick={() => handleTabChange("chat")}
						type="button"
					>
						<MessageSquare className="h-3.5 w-3.5" />
						{i18n.getMessage("chat", isLocalized)}
					</button>
				</div>
			</SidebarHeader>

			<SidebarContent className="overflow-x-hidden bg-sidebar p-0">
				{activeTab === "calendar" ? (
					<div className="space-y-4">
						{/* Prayer Times */}
						<SidebarGroup className="p-4">
							<SidebarGroupLabel className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								{i18n.getMessage("prayer_times", isLocalized)}
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<PrayerTimesWidget />
							</SidebarGroupContent>
						</SidebarGroup>
					</div>
				) : (
					<ChatSidebarContent
						className={cn("flex-1", pathname === "/" && "calendar-chat")}
						onConversationSelect={selectConversation}
						onRefresh={refreshData}
						selectedConversationId={selectedConversationId ?? null}
					/>
				)}
			</SidebarContent>
		</Sidebar>
	);
}
