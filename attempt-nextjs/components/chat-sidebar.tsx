'use client'

import React, { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { Send, ChevronLeft, ChevronRight, MessageSquare, User, Bot, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemedScrollbar } from '@/components/themed-scrollbar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ConversationMessage, Conversations, Reservation } from '@/types/calendar'

interface ChatSidebarProps {
  selectedConversationId: string | null
  conversations: Conversations
  reservations: Record<string, Reservation[]>
  onConversationSelect: (conversationId: string) => void
  onClose: () => void
  onRefresh?: () => void
  className?: string
}

interface MessageBubbleProps {
  message: ConversationMessage
  isUser: boolean
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
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

  return (
    <div className={cn("flex gap-3 max-w-[85%]", isUser ? "ml-auto" : "mr-auto")}>
      {!isUser && (
        <Avatar className="h-6 w-6 mt-1">
          <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
            <Bot className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "group relative",
        isUser ? "order-first" : ""
      )}>
        <div className={cn(
          "rounded-2xl px-3 py-2 text-sm break-words",
          isUser 
            ? "bg-blue-600 text-white ml-auto" 
            : "bg-gray-100 text-gray-900"
        )}>
          {message.message}
        </div>
        
        <div className={cn(
          "flex items-center gap-1 mt-1 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity",
          isUser ? "justify-end" : "justify-start"
        )}>
          <Clock className="h-3 w-3" />
          <span>{message.date} {formatTime(message.time)}</span>
        </div>
      </div>

      {isUser && (
        <Avatar className="h-6 w-6 mt-1">
          <AvatarFallback className="text-xs bg-green-100 text-green-700">
            <User className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  selectedConversationId,
  conversations,
  reservations,
  onConversationSelect,
  onClose,
  onRefresh,
  className
}) => {
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get conversation options with customer names
  const conversationOptions = React.useMemo(() => {
    return Object.keys(conversations).map(waId => {
      // Try to get customer name from reservations
      let customerName = null
      if (reservations[waId]?.[0]?.customer_name) {
        customerName = reservations[waId][0].customer_name
      }
      
      return {
        id: waId,
        label: customerName ? `${waId} - ${customerName}` : waId,
        name: customerName,
        lastMessageTime: conversations[waId]?.length > 0 
          ? conversations[waId][conversations[waId].length - 1]
          : null
      }
    }).sort((a, b) => {
      // Sort by most recent message
      if (!a.lastMessageTime || !b.lastMessageTime) return 0
      const aTime = new Date(`${a.lastMessageTime.date} ${a.lastMessageTime.time}`)
      const bTime = new Date(`${b.lastMessageTime.date} ${b.lastMessageTime.time}`)
      return bTime.getTime() - aTime.getTime()
    })
  }, [conversations, reservations])

  const currentConversation = selectedConversationId ? conversations[selectedConversationId] || [] : []
  const currentIndex = conversationOptions.findIndex(option => option.id === selectedConversationId)

  // Sort messages by date and time
  const sortedMessages = React.useMemo(() => {
    return [...currentConversation].sort((a, b) => {
      const aTime = new Date(`${a.date} ${a.time}`)
      const bTime = new Date(`${b.date} ${b.time}`)
      return aTime.getTime() - bTime.getTime()
    })
  }, [currentConversation])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sortedMessages])

  // Navigation functions
  const goToPrevious = () => {
    if (currentIndex > 0) {
      onConversationSelect(conversationOptions[currentIndex - 1].id)
    }
  }

  const goToNext = () => {
    if (currentIndex < conversationOptions.length - 1) {
      onConversationSelect(conversationOptions[currentIndex + 1].id)
    }
  }

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
          role: 'admin', // or whatever role represents the current user
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
      // You might want to show an error toast here
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

  // Check if chat input should be disabled (24h lockout)
  const isInputDisabled = React.useMemo(() => {
    if (!sortedMessages.length) return false
    
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

  return (
    <div className={cn("flex flex-col h-full bg-white border-l border-gray-200", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Conversations</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* Conversation Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevious}
              disabled={currentIndex <= 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Select
              value={selectedConversationId || ''}
              onValueChange={onConversationSelect}
            >
              <SelectTrigger className="flex-1 h-8">
                <SelectValue placeholder="Select a conversation..." />
              </SelectTrigger>
              <SelectContent>
                {conversationOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{option.label}</span>
                      {option.name && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {option.name}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNext}
              disabled={currentIndex >= conversationOptions.length - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      {selectedConversationId ? (
        <>
          <ThemedScrollbar className="flex-1 scrollbar-autohide chat-scrollbar" style={{ height: '100%' }}>
            <div className="p-4 space-y-4">
              {sortedMessages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  isUser={message.role === 'user'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ThemedScrollbar>

          <Separator />

          {/* Message Input */}
          <div className="p-4 bg-gray-50">
            {isInputDisabled && (
              <div className="mb-2 p-2 text-xs text-amber-700 bg-amber-50 rounded-md border border-amber-200">
                Chat is locked due to 24-hour inactivity period
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isInputDisabled ? "Chat locked..." : "Type a message..."}
                disabled={isInputDisabled || isSending}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!messageInput.trim() || isInputDisabled || isSending}
                size="sm"
                className="px-3"
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Select a conversation to start chatting</p>
          </div>
        </div>
      )}
    </div>
  )
} 