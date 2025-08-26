"use client";

import { Calendar, Clock, MessageSquare } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { ChatSidebarContent } from "@/components/chat-sidebar-content";
import { PrayerTimesWidget } from "@/components/prayer-times-widget";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	useSidebar,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/lib/language-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import {
	useConversationsData,
	useReservationsData,
} from "@/lib/websocket-data-provider";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { isRTL } = useLanguage();
	const { setOpenMobile, setOpen, open, openMobile } = useSidebar();

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
		isChatSidebarOpen,
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
		],
	);

	const _closeSidebar = useCallback(() => {
		setChatSidebarOpen(false);
	}, [setChatSidebarOpen]);

	const setOpenState = useCallback(
		(isOpen: boolean) => {
			setChatSidebarOpen(isOpen);
		},
		[setChatSidebarOpen],
	);

	const refreshData = async () => {
		// This will be handled by the unified provider
	};

	const isInitialized = !chatLoading && _hasHydrated;

	// Build customers list from unified data
	const customers = useMemo(() => {
		const customerMap = new Map();

		// Add customers from conversations
		Object.keys(conversations).forEach((waId) => {
			if (!customerMap.has(waId)) {
				customerMap.set(waId, {
					phone: waId,
					formattedPhone: waId.startsWith("+") ? waId : `+${waId}`,
				});
			}
		});

		// Add customer names from reservations
		Object.entries(reservations).forEach(([waId, customerReservations]) => {
			if (
				Array.isArray(customerReservations) &&
				customerReservations.length > 0
			) {
				const customerName = customerReservations.find(
					(r) => !!r?.customer_name,
				)?.customer_name;
				if (customerName) {
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
				}
			}
		});

		return Array.from(customerMap.values());
	}, [conversations, reservations]);

	const conversationOptions = useMemo(() => {
		return customers.map((customer) => ({
			waId: customer.phone,
			customerName: customer.name,
			messageCount: conversations[customer.phone]?.length || 0,
			lastMessage:
				conversations[customer.phone]?.[
					conversations[customer.phone].length - 1
				],
		}));
	}, [customers, conversations]);

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Only handle arrow keys when chat tab is active and no input is focused
			if (activeTab !== "chat" || conversationOptions.length === 0) return;

			const activeElement = document.activeElement;
			if (
				activeElement &&
				(activeElement.tagName === "INPUT" ||
					activeElement.tagName === "TEXTAREA" ||
					activeElement.getAttribute("contenteditable") === "true")
			) {
				return; // Don't interfere with input fields
			}

			const currentIndex = conversationOptions.findIndex(
				(option) => option.waId === selectedConversationId,
			);

			if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
				event.preventDefault();

				let newIndex: number;
				if (event.key === "ArrowLeft") {
					// Previous conversation
					newIndex = Math.max(0, currentIndex - 1);
				} else {
					// Next conversation
					newIndex = Math.min(conversationOptions.length - 1, currentIndex + 1);
				}

				const newConversationId = conversationOptions[newIndex].waId;
				if (newConversationId) {
					setLoadingConversation(true);
					selectConversation(newConversationId);
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [
		activeTab,
		conversationOptions,
		selectedConversationId,
		selectConversation,
		setLoadingConversation,
	]);

	// Auto-open sidebar when switching to chat tab or when hydrated with chat tab active
	useEffect(() => {
		if (isInitialized) {
			// Debug logging
			console.log("App sidebar state after initialization:", {
				activeTab,
				selectedConversationId,
				isChatSidebarOpen,
				_hasHydrated,
			});

			if (activeTab === "chat") {
				// Set the chat sidebar as open
				setOpenState(true);
			} else {
				// Set as closed when not on chat tab
				setOpenState(false);
			}
		}
	}, [
		activeTab,
		isInitialized,
		setOpenState,
		selectedConversationId,
		isChatSidebarOpen,
		_hasHydrated,
	]);

	// Listen for chat open requests from calendar
	useEffect(() => {
		if (shouldOpenChat && conversationIdToOpen) {
			// Only open sidebar if it's currently closed, respect user's current state
			if (!open) setOpen(true);
			if (!openMobile) setOpenMobile(true);

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
		[setActiveTab, setChatSidebarOpen],
	);

	return (
		<Sidebar {...props} className="bg-sidebar">
			<SidebarHeader className="border-b border-sidebar-border p-4 bg-sidebar">
				<div className="flex items-center gap-2 mb-4">
					<Calendar className="h-6 w-6" />
					<span className="font-semibold">
						{isRTL ? "مدير الحجوزات" : "Reservation Manager"}
					</span>
				</div>

				{/* Tab Navigation */}
				<div className="flex space-x-0.5 bg-muted p-0.5 rounded-md border border-border">
					<button
						type="button"
						onClick={() => handleTabChange("calendar")}
						className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
							activeTab === "calendar"
								? "bg-background text-foreground shadow-sm border border-border"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Calendar className="h-3.5 w-3.5" />
						{isRTL ? "التقويم" : "Calendar"}
					</button>
					<button
						type="button"
						onClick={() => handleTabChange("chat")}
						className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
							activeTab === "chat"
								? "bg-background text-foreground shadow-sm border border-border"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<MessageSquare className="h-3.5 w-3.5" />
						{isRTL ? "الدردشة" : "Chat"}
					</button>
				</div>
			</SidebarHeader>

			<SidebarContent className="p-0 bg-sidebar">
				{activeTab === "calendar" ? (
					<div className="space-y-4">
						{/* Prayer Times */}
						<SidebarGroup className="p-4">
							<SidebarGroupLabel className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								{isRTL ? "مواقيت الصلاة" : "Prayer Times"}
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<PrayerTimesWidget />
							</SidebarGroupContent>
						</SidebarGroup>
					</div>
				) : (
					<ChatSidebarContent
						selectedConversationId={selectedConversationId ?? null}
						onConversationSelect={selectConversation}
						onRefresh={refreshData}
						className="flex-1"
					/>
				)}
			</SidebarContent>
		</Sidebar>
	);
}
