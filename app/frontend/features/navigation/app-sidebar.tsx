"use client";

import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { cn } from "@shared/libs/utils";
import { Calendar, Clock, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { ChatSidebarContent } from "@/features/chat/chat-sidebar-content";
import { useCustomerNames } from "@/features/chat/hooks/useCustomerNames";
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
  const { data: customerNames, isLoading: isLoadingCustomerNames } =
    useCustomerNames();
  const chatLoading = isLoadingCustomerNames;

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

  // Build customers list from customer names
  const customers = useMemo(() => {
    if (!customerNames) {
      return [];
    }

    return Object.entries(customerNames).map(([waId, customer]) => ({
      phone: waId,
      name: customer.customer_name || undefined,
      formattedPhone: waId.startsWith("+") ? waId : `+${waId}`,
    }));
  }, [customerNames]);

  const conversationOptions = useMemo(
    () =>
      customers
        .map((customer) => {
          // Conversations are now loaded on-demand - no need to include message count here
          return {
            waId: customer.phone,
            customerName: customer.name,
            messageCount: 0, // Not available - conversations loaded on-demand
            lastMessage: undefined, // Not available - conversations loaded on-demand
          };
        })
        .sort((a, b) => {
          // Multi-criteria sorting: 1) has name, 2) phone number
          // (removed message sorting since conversations are loaded on-demand)

          // 1. Sort by customers who have names (primary criteria)
          const aHasName = !!a.customerName;
          const bHasName = !!b.customerName;
          if (aHasName && !bHasName) {
            return -1; // a has name, b doesn't - a comes first
          }
          if (!aHasName && bHasName) {
            return 1; // b has name, a doesn't - b comes first
          }

          // 2. Sort by phone number (secondary criteria)
          return a.waId.localeCompare(b.waId, undefined, { numeric: true });
        }),
    [customers]
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when chat tab is active and no input is focused
      if (activeTab !== "chat" || conversationOptions.length === 0) {
        return;
      }

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
        (option) => option.waId === selectedConversationId
      );

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();

        let newIndex: number;
        if (event.key === "ArrowLeft") {
          // Previous conversation (older, since array is sorted newest first)
          newIndex = Math.min(conversationOptions.length - 1, currentIndex + 1);
        } else {
          // Next conversation (newer, since array is sorted newest first)
          newIndex = Math.max(0, currentIndex - 1);
        }

        const selectedConversation = conversationOptions[newIndex];
        if (selectedConversation?.waId) {
          setLoadingConversation(true);
          selectConversation(selectedConversation.waId);
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
