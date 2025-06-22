'use client'

import React, { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Send, MessageSquare, User, Bot, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemedScrollbar } from '@/components/themed-scrollbar'
import { useScrollbarVariant } from '@/hooks/useScrollbarVariant'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { ConversationCombobox } from '@/components/conversation-combobox'
import type { ConversationMessage, Conversations, Reservation } from '@/types/calendar'
import { marked } from 'marked'
import { useSidebarChatStore } from '@/lib/sidebar-chat-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'

interface ChatSidebarContentProps {
  selectedConversationId: string | null
  conversations: Conversations
  reservations: Record<string, Reservation[]>
  onConversationSelect: (conversationId: string) => void
  onRefresh?: () => void
  className?: string
}

interface MessageBubbleProps {
  message: ConversationMessage
  isUser: boolean
}

// Configure marked for safe HTML
marked.setOptions({
  breaks: true,
  gfm: true,
})

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
  const [showTooltip, setShowTooltip] = useState(false)
  
  const formatTime = (timeStr: string) => {
    try {
      // Handle various time formats
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        return timeStr
      }
      // Convert 24-hour format to 12-hour format
      const [hours, minutes] = timeStr.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    } catch {
      return timeStr
    }
  }

  // Parse markdown to HTML
  const messageHtml = React.useMemo(() => {
    try {
      return marked.parse(message.message)
    } catch {
      return message.message
    }
  }, [message.message])

  const handleMouseEnter = () => {
      setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  return (
    <div 
      className={cn(
        "w-full py-0.5 px-2 group" // Added group class for hover
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative">
        <div 
          className={cn(
            "rounded-lg p-2.5 mx-auto max-w-4xl relative", // Added relative positioning
            // Message-specific backgrounds - only user messages have backgrounds
            isUser
              ? "bg-muted"
              : ""
          )}
        >
          <div className="flex gap-2 items-start">
            {/* Avatar - rounded rectangle style */}
            <div className={cn(
              "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium",
              isUser 
                ? "bg-primary text-primary-foreground"
                : "bg-muted-foreground text-background"
            )}>
              {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Message content with markdown - no label */}
              <div 
                className="text-sm prose prose-sm max-w-none
                  prose-p:my-0.5 prose-headings:mt-1.5 prose-headings:mb-0.5 prose-ul:my-0.5 prose-ol:my-0.5
                  prose-li:my-0 prose-pre:my-0.5 prose-code:text-xs"
                dangerouslySetInnerHTML={{ __html: messageHtml }}
              />
          </div>
        </div>
        
          {/* Tooltip positioned inside message bubble at bottom right */}
          <div className={cn(
            "absolute z-10 px-1.5 py-0.5 text-[9px] bg-background/90 text-muted-foreground rounded",
            "bottom-1 right-1",
            "transition-all duration-150 ease-out origin-bottom-right",
            showTooltip 
              ? "opacity-100 scale-100" 
              : "opacity-0 scale-95 pointer-events-none"
          )}>
            {formatTime(message.time)}
          </div>
        </div>
      </div>
    </div>
  )
}

export const ChatSidebarContent: React.FC<ChatSidebarContentProps> = ({
  selectedConversationId,
  conversations,
  reservations,
  onConversationSelect,
  onRefresh,
  className
}) => {
  const { isRTL } = useLanguage()
  const { isLoadingConversation, setLoadingConversation } = useSidebarChatStore()
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousConversationIdRef = useRef<string | null>(null)

  // Log the data state
  console.log('[ChatSidebarContent] Conversations:', Object.keys(conversations).length, 'Reservations:', Object.keys(reservations).length)

  const currentConversation = selectedConversationId ? conversations[selectedConversationId] || [] : []

  // Sort messages by date and time
  const sortedMessages = React.useMemo(() => {
    return [...currentConversation].sort((a, b) => {
      const aTime = new Date(`${a.date} ${a.time}`)
      const bTime = new Date(`${b.date} ${b.time}`)
      return aTime.getTime() - bTime.getTime()
    })
  }, [currentConversation])

  // Monitor when conversation data and rendering is complete
  useEffect(() => {
    if (!isLoadingConversation || !selectedConversationId) return
    
    // Track conversation change
    const conversationChanged = selectedConversationId !== previousConversationIdRef.current
    if (conversationChanged) {
      previousConversationIdRef.current = selectedConversationId
    }
    
    // Determine if we're ready to clear loading:
    // 1. We have the conversations object (API responded)
    // 2. We've processed the current conversation (sortedMessages computed)
    // 3. We know if conversation exists or not
    
    const apiResponded = conversations !== undefined && conversations !== null
    const conversationProcessed = currentConversation !== undefined // This is always an array, even if empty
    
    if (apiResponded && conversationProcessed) {
      // Everything is ready - clear loading immediately
      setLoadingConversation(false)
    }
  }, [selectedConversationId, conversations, currentConversation, sortedMessages, isLoadingConversation, setLoadingConversation, reservations, isRTL])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sortedMessages])

  // Send message function
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId || isSending) return

    setIsSending(true)
    try {
      const now = new Date()
      const currentDate = format(now, 'yyyy-MM-dd')
      const currentTime = format(now, 'HH:mm:ss')
      
      // Send WhatsApp message
      const sendResponse = await fetch('/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wa_id: selectedConversationId,
          text: messageInput
        })
      })

      if (!sendResponse.ok) {
        throw new Error('Failed to send message')
      }

      // Append message to conversation
      const appendResponse = await fetch(`/api/message/append?wa_id=${selectedConversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'admin',
          message: messageInput,
          date: currentDate,
          time: currentTime
        })
      })

      if (!appendResponse.ok) {
        throw new Error('Failed to append message to conversation')
      }

      // Clear input and refresh conversations
      setMessageInput('')
      
      // Refresh the conversations to get the latest messages
      if (onRefresh) {
        onRefresh()
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Check if chat input should be disabled
  const isInputDisabled = React.useMemo(() => {
    // First check if there's no conversation at all
    if (!sortedMessages.length) return true // Disable if no messages
    
    // Then check for 24h lockout
    const lastUserMessage = [...sortedMessages].reverse().find(msg => msg.role === 'user')
    if (!lastUserMessage) return false

    try {
      const lastMessageTime = new Date(`${lastUserMessage.date} ${lastUserMessage.time}`)
      const now = new Date()
      const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60)
      return hoursSinceLastMessage > 24
    } catch {
      return false
    }
  }, [sortedMessages])
  
  // Determine the reason for disabling
  const disableReason = React.useMemo(() => {
    if (!sortedMessages.length) {
      return isRTL ? "لا توجد محادثة مع هذا العميل" : "No conversation with this customer"
    }
    if (isInputDisabled && sortedMessages.length > 0) {
      return isRTL ? "الدردشة مقفلة بسبب عدم النشاط لمدة 24 ساعة" : "Chat locked due to 24h inactivity"
    }
    return null
  }, [sortedMessages, isInputDisabled, isRTL])

  // Show combobox only when we have data
  const shouldShowCombobox = Object.keys(conversations).length > 0

  if (!selectedConversationId) {
    return (
      <div className={cn("flex flex-col h-full bg-card relative", className)}>
        {/* Loading overlay with blur effect */}
        {isLoadingConversation && (
          <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? "جاري تحميل المحادثة..." : "Loading conversation..."}
              </p>
            </div>
          </div>
        )}
        
        {/* Header with Omnibox */}
        <div className="p-3 border-b border-sidebar-border bg-card">
          {shouldShowCombobox ? (
            <ConversationCombobox
              conversations={conversations}
              reservations={reservations}
              selectedConversationId={selectedConversationId}
              onConversationSelect={onConversationSelect}
              isRTL={isRTL}
            />
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">
              {isRTL ? "جاري تحميل المحادثات..." : "Loading conversations..."}
            </div>
          )}
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-sm">
              {shouldShowCombobox 
                ? (isRTL ? "ابحث واختر محادثة لبدء الدردشة" : "Search and select a conversation to start chatting")
                : (isRTL ? "لا توجد محادثات متاحة" : "No conversations available")
              }
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-card relative", className)}>
      {/* Loading overlay with blur effect */}
      {isLoadingConversation && (
        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">
              {isRTL ? "جاري تحميل المحادثة..." : "Loading conversation..."}
            </p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border bg-card">
        {/* Conversation Selection Combobox */}
        <ConversationCombobox
          conversations={conversations}
          reservations={reservations}
          selectedConversationId={selectedConversationId}
          onConversationSelect={onConversationSelect}
          isRTL={isRTL}
        />
      </div>

      {/* Messages Area */}
      <ThemedScrollbar 
        className="flex-1 bg-card scrollbar-autohide chat-scrollbar" 
        style={{ height: '100%' }}
        noScrollX={true}
        rtl={isRTL}
      >
        <div className="space-y-0">
          {sortedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground p-4">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm">
                  {isRTL 
                    ? "لا توجد رسائل في هذه المحادثة" 
                    : "No messages in this conversation"
                  }
                </p>
              </div>
            </div>
          ) : (
            sortedMessages.map((message, idx) => (
              <MessageBubble
                key={idx}
                message={message}
                isUser={message.role === 'user'}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ThemedScrollbar>

      {/* Message Input */}
      <div className="p-3 border-t border-sidebar-border bg-card">
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isInputDisabled 
              ? (isRTL ? "الدردشة مقفلة..." : "Chat locked...")
              : (isRTL ? "اكتب رسالة..." : "Type message...")
            }
            disabled={isInputDisabled || isSending}
            title={disableReason || undefined}
            className={cn(
              "flex-1 text-xs h-8",
              (isInputDisabled || isSending) && "opacity-60 cursor-not-allowed bg-muted text-muted-foreground border-border"
            )}
          />
          <Button
            onClick={sendMessage}
            disabled={!messageInput.trim() || isInputDisabled || isSending}
            size="sm"
            className="px-2 h-8"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 