"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Calendar, Clock, MessageSquare } from 'lucide-react'

import { DockNav } from "@/components/dock-nav"
import { ChatSidebarContent } from "@/components/chat-sidebar-content"
import { ConversationCombobox } from "@/components/conversation-combobox"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { PrayerTimesWidget } from "@/components/prayer-times-widget"
import { HijriDateDisplay } from "@/components/hijri-date-display"
import { useLanguage } from "@/lib/language-context"
import { useChatSidebar } from "@/lib/use-chat-sidebar"
import { useSidebarChatStore } from "@/lib/sidebar-chat-store"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isRTL } = useLanguage()
  const { setOpenMobile, setOpen, open, openMobile } = useSidebar()
  
  // Always start with calendar tab to prevent hydration mismatch
  const [activeTab, setActiveTab] = useState('calendar')
  
  const {
    selectedConversationId,
    conversations,
    reservations,
    loading: chatLoading,
    openConversation,
    closeSidebar,
    selectConversation,
    refreshData,
    fetchConversations,
    setOpenState,
    isInitialized,
    isOpen: isChatOpen
  } = useChatSidebar({ autoRefresh: false })
  
  const { 
    shouldOpenChat, 
    conversationIdToOpen, 
    clearOpenRequest,
    isLoadingConversation,
    setLoadingConversation
  } = useSidebarChatStore()

  // Get customer name from conversations and reservations
  const getCustomerName = useCallback((waId: string) => {
    // First check if we have a customer name from reservations
    if (reservations[waId]) {
      for (const res of reservations[waId]) {
        if (res.customer_name) {
          return res.customer_name
        }
      }
    }
    
    return null
  }, [reservations])

  // Prepare data for ConversationCombobox
  const conversationOptions = useMemo(() => {
    return Object.keys(conversations).map(waId => {
      const customerName = getCustomerName(waId)
      const messageCount = conversations[waId]?.length || 0
      const lastMessage = conversations[waId]?.[conversations[waId].length - 1]
      
      return {
        waId,
        customerName,
        messageCount,
        lastMessage
      }
    })
  }, [conversations, getCustomerName])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when chat tab is active and no input is focused
      if (activeTab !== 'chat' || conversationOptions.length === 0) return
      
      const activeElement = document.activeElement
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      )) {
        return // Don't interfere with input fields
      }

      const currentIndex = conversationOptions.findIndex(option => option.waId === selectedConversationId)
      
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        
        let newIndex
        if (event.key === 'ArrowLeft') {
          // Previous conversation
          newIndex = currentIndex <= 0 ? conversationOptions.length - 1 : currentIndex - 1
        } else {
          // Next conversation
          newIndex = currentIndex >= conversationOptions.length - 1 ? 0 : currentIndex + 1
        }
        
        setLoadingConversation(true)
        selectConversation(conversationOptions[newIndex].waId)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, conversationOptions, selectedConversationId, selectConversation])

  // Fetch data when switching to chat tab
  useEffect(() => {
    if (activeTab === 'chat' && isInitialized) {
      // Set the chat sidebar as open
      setOpenState(true)
      console.log('[AppSidebar] Chat tab activated - opening sidebar')
    } else if (activeTab !== 'chat') {
      // Set as closed when not on chat tab
      setOpenState(false)
    }
  }, [activeTab, isInitialized, setOpenState])

  // Handle initial tab state after hydration when conversation is restored
  useEffect(() => {
    if (isInitialized && selectedConversationId && isChatOpen) {
      setActiveTab('chat')
      // Only auto-open sidebar if it's not explicitly closed by user
      // Don't interfere with user's sidebar state preference
    }
  }, [isInitialized, selectedConversationId, isChatOpen])

  // Listen for chat open requests from calendar
  useEffect(() => {
    if (shouldOpenChat && conversationIdToOpen) {
      // Only open sidebar if it's currently closed, respect user's current state
      if (!open) setOpen(true)
      if (!openMobile) setOpenMobile(true)
      
      // Switch to chat tab
      setActiveTab('chat')
      
      // Select the conversation directly - data is already loaded by CalendarDataService
      selectConversation(conversationIdToOpen)
      
      // Don't clear loading state here - it will be cleared when data is ready
      clearOpenRequest()
    }
  }, [shouldOpenChat, conversationIdToOpen, selectConversation, clearOpenRequest, setOpen, setOpenMobile, open, openMobile])

  return (
    <Sidebar {...props} className="bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4 bg-sidebar">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-6 w-6" />
          <span className="font-semibold">{isRTL ? "مدير الحجوزات" : "Reservation Manager"}</span>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-0.5 bg-muted p-0.5 rounded-md border border-border">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-sm text-xs font-medium transition-all duration-200 border ${
              activeTab === 'calendar'
                ? 'bg-background text-foreground shadow-sm border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border-transparent hover:border-border/50'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            {isRTL ? "التقويم" : "Calendar"}
          </button>
          <button
            onClick={() => {
              setActiveTab('chat')
              // Don't trigger data fetch here - data is already loaded by CalendarDataService
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-sm text-xs font-medium transition-all duration-200 border ${
              activeTab === 'chat'
                ? 'bg-background text-foreground shadow-sm border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border-transparent hover:border-border/50'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {isRTL ? "الدردشة" : "Chat"}
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-0 bg-sidebar">
        {activeTab === 'calendar' ? (
          <div className="space-y-4">
            {/* Hijri Date Display */}
            {isRTL && (
              <SidebarGroup className="p-4 pb-2">
                <SidebarGroupContent>
                  <HijriDateDisplay className="justify-center text-base" />
                </SidebarGroupContent>
              </SidebarGroup>
            )}
            
            {/* Prayer Times */}
            <SidebarGroup className="p-4 pt-2">
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
            selectedConversationId={selectedConversationId}
            conversations={conversations}
            reservations={reservations}
            onConversationSelect={selectConversation}
            onRefresh={refreshData}
            className="flex-1"
          />
        )}
      </SidebarContent>


    </Sidebar>
  )
}
