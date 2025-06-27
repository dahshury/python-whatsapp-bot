'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronsUpDown, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CustomerStatsCard } from '@/components/customer-stats-card'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import type { Conversations, Reservation } from '@/types/calendar'
import { useSidebarChatStore } from '@/lib/sidebar-chat-store'

interface ConversationComboboxProps {
  conversations: Conversations
  reservations: Record<string, Reservation[]>
  selectedConversationId: string | null
  onConversationSelect: (conversationId: string) => void
  isRTL?: boolean
}

export const ConversationCombobox: React.FC<ConversationComboboxProps> = ({
  conversations,
  reservations,
  selectedConversationId,
  onConversationSelect,
  isRTL = false
}) => {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [showHoverCard, setShowHoverCard] = useState(false)
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null)
  const [closeTimer, setCloseTimer] = useState<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hoverCardRef = useRef<HTMLDivElement>(null)
  const { setLoadingConversation } = useSidebarChatStore()

  // After conversationOptions memo
  const conversationOptions = React.useMemo(() => {
    return Object.keys(conversations).map(waId => {
      // Try to get customer name from any reservation (always check all since we fetch all data)
      let customerName = null
      const customerReservations = reservations[waId]
      
      if (customerReservations && customerReservations.length > 0) {
        // Check ALL reservations to find any customer name
        for (const reservation of customerReservations) {
          if (reservation.customer_name) {
            customerName = reservation.customer_name
            break
          }
        }
      }
      
      const messageCount = conversations[waId]?.length || 0
      const lastMessage = conversations[waId]?.[conversations[waId].length - 1]
      
      return {
        value: waId,
        label: customerName ? `${customerName} (${waId})` : waId,
        customerName,
        messageCount,
        lastMessage,
        hasConversation: true
      }
    }).sort((a, b) => {
      // Sort by most recent message
      if (!a.lastMessage || !b.lastMessage) return 0
      const aTime = new Date(`${a.lastMessage.date} ${a.lastMessage.time}`)
      const bTime = new Date(`${b.lastMessage.date} ${b.lastMessage.time}`)
      return bTime.getTime() - aTime.getTime()
    })
  }, [conversations, reservations])

  // Current index for navigation (must be after conversationOptions is defined)
  const currentIndex = conversationOptions.findIndex(opt => opt.value === selectedConversationId)

  // Navigation handlers
  const handlePrevious = () => {
    if (conversationOptions.length === 0) return
    const newIndex = currentIndex >= conversationOptions.length - 1 ? 0 : currentIndex + 1
    setLoadingConversation(true)
    onConversationSelect(conversationOptions[newIndex].value)
  }

  const handleNext = () => {
    if (conversationOptions.length === 0) return
    const newIndex = currentIndex <= 0 ? conversationOptions.length - 1 : currentIndex - 1
    setLoadingConversation(true)
    onConversationSelect(conversationOptions[newIndex].value)
  }

  // Clear timers when component unmounts
  useEffect(() => {
    return () => {
      if (hoverTimer) {
        clearTimeout(hoverTimer)
      }
      if (closeTimer) {
        clearTimeout(closeTimer)
      }
    }
  }, [hoverTimer, closeTimer])

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return conversationOptions
    
    const searchLower = searchValue.toLowerCase()
    return conversationOptions.filter(option => 
      option.value.toLowerCase().includes(searchLower) ||
      option.customerName?.toLowerCase().includes(searchLower)
    )
  }, [conversationOptions, searchValue])

  // Get selected option
  const selectedOption = conversationOptions.find(
    option => option.value === selectedConversationId
  )

  // Format time for display
  const formatTime = (lastMessage: any) => {
    if (!lastMessage) return ''
    
    try {
      const messageDate = new Date(`${lastMessage.date} ${lastMessage.time}`)
      const now = new Date()
      const diffMs = now.getTime() - messageDate.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffDays > 0) {
        return isRTL ? `قبل ${diffDays}ي` : `${diffDays}d ago`
      } else if (diffHours > 0) {
        return isRTL ? `قبل ${diffHours}س` : `${diffHours}h ago`
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return isRTL ? `قبل ${diffMinutes}د` : `${diffMinutes}m ago`
      }
    } catch {
      return ''
    }
  }

  const handleMouseEnter = useCallback(() => {
    // Only start timer if combobox is closed and we have a selected conversation with actual messages
    if (!open && selectedConversationId && conversations[selectedConversationId]) {
      // Clear any close timer
      if (closeTimer) {
        clearTimeout(closeTimer)
        setCloseTimer(null)
      }
      
      // Clear any existing hover timer
      if (hoverTimer) {
        clearTimeout(hoverTimer)
      }
      
      const timer = setTimeout(() => {
        setShowHoverCard(true)
      }, 2000)
      setHoverTimer(timer)
    }
  }, [open, selectedConversationId, conversations, closeTimer, hoverTimer])

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    // Don't do anything if combobox is open
    if (open) return
    
    // Check if we're moving to the hover card
    const relatedTarget = e.relatedTarget as HTMLElement
    if (relatedTarget && hoverCardRef.current?.contains(relatedTarget)) {
      // Moving to hover card, keep it open
      return
    }
    
    // Clear any pending hover timer
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
    
    // Clear any existing close timer
    if (closeTimer) {
      clearTimeout(closeTimer)
    }
    
    // Use a small delay before closing to prevent flicker
    const timer = setTimeout(() => {
      setShowHoverCard(false)
    }, 100)
    
    setCloseTimer(timer)
  }, [hoverTimer, closeTimer, open])



  // Scroll to selected item when dropdown opens
  useEffect(() => {
    if (open && selectedConversationId) {
      // Small delay to ensure the dropdown is rendered
      setTimeout(() => {
        const selectedElement = document.querySelector(`[data-value="${selectedConversationId}"]`)
        if (selectedElement) {
          selectedElement.scrollIntoView({ block: 'center', behavior: 'auto' })
        }
      }, 50)
    }
  }, [open, selectedConversationId])

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
              <Popover open={open} onOpenChange={(newOpen) => {
                setOpen(newOpen)
                // Close hover card when opening combobox
                if (newOpen) {
                  setShowHoverCard(false)
                  if (hoverTimer) {
                    clearTimeout(hoverTimer)
                    setHoverTimer(null)
                  }
                }
              }}>
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
                          : (isRTL ? "اختر محادثة..." : "Select conversation...")}
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
                      placeholder={isRTL ? "ابحث في المحادثات..." : "Search conversations..."} 
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
                              setLoadingConversation(true)
                              onConversationSelect(option.value)
                              setOpen(false)
                            }}
                            className={cn(
                              "text-sm py-1.5",
                              selectedConversationId === option.value && "ring-1 ring-primary ring-offset-1"
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
          
          {selectedConversationId && !open && (
            <HoverCardContent 
              ref={hoverCardRef}
              className="w-[300px] p-0 z-50" 
              align="center"
              sideOffset={5}
              onMouseEnter={() => {
                // Clear any close timer when entering hover card
                if (closeTimer) {
                  clearTimeout(closeTimer)
                  setCloseTimer(null)
                }
                // Clear hover timer too
                if (hoverTimer) {
                  clearTimeout(hoverTimer)
                  setHoverTimer(null)
                }
              }}
              onMouseLeave={(e: React.MouseEvent) => {
                // Check if we're moving back to the trigger
                const relatedTarget = e.relatedTarget as HTMLElement
                if (relatedTarget && triggerRef.current?.contains(relatedTarget)) {
                  return
                }
                // Otherwise close the hover card after a small delay
                const timer = setTimeout(() => {
                  setShowHoverCard(false)
                }, 100)
                setCloseTimer(timer)
              }}
            >
              <CustomerStatsCard
                selectedConversationId={selectedConversationId}
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
          disabled={conversationOptions.length === 0 || currentIndex === conversationOptions.length - 1}
          className="h-8 w-8 p-0 flex-shrink-0"
          title={isRTL ? "الأقدم" : "Older"}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 