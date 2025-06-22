/**
 * FullCalendar Component
 * 
 * Main calendar component that orchestrates all services, hooks, and components.
 * Clean separation of concerns with proper dependency injection and state management.
 * Follows Domain-Driven Design principles for maintainable and scalable code.
 */

"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/lib/language-context'
import { useVacation } from '@/lib/vacation-context'
import { useSidebar } from '@/components/ui/sidebar'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

// Custom hooks
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useCalendarState } from '@/hooks/useCalendarState'

// Components
import { CalendarCore, type CalendarCoreRef } from './calendar-core'
import { CalendarSkeleton } from './calendar-skeleton'
import { ErrorBoundary, CalendarErrorFallback } from './error-boundary'
import { CalendarEventContextMenu } from './calendar-event-context-menu'

import { DataTableEditorLoading } from './data-table-editor-loading'
import { useSidebarChatStore } from '@/lib/sidebar-chat-store'
import { useChatSidebar } from '@/lib/use-chat-sidebar'
import { HoverCard, HoverCardContent } from '@/components/ui/hover-card'
import { CustomerStatsCard } from '@/components/customer-stats-card'

// Services and utilities
import { 
  createCalendarCallbacks, 
  type CalendarCallbackHandlers,
  type VacationDateChecker
} from '@/lib/calendar-callbacks'
import { getTimezone, SLOT_DURATION_HOURS } from '@/lib/calendar-config'
import { modifyReservation, cancelReservation, getMessage, undoModifyReservation, undoCancelReservation } from '@/lib/api'
import type { CalendarEvent } from '@/types/calendar'
import { cn } from '@/lib/utils'

// Lazy load DataTableEditor to improve initial performance
const LazyDataTableEditor = dynamic(
  () => import('./data-table-editor').then(mod => ({ default: mod.DataTableEditor })), 
  {
  ssr: false,
  loading: () => <DataTableEditorLoading />
  }
)

interface FullCalendarComponentProps {
  freeRoam?: boolean
  initialView?: string
  initialDate?: string
}

export function FullCalendarComponent({ 
  freeRoam = false, 
  initialView = 'multiMonthYear',
  initialDate
}: FullCalendarComponentProps) {
  const { isRTL } = useLanguage()
  const { handleDateClick: handleVacationDateClick, recordingState, setOnVacationUpdated, vacationPeriods } = useVacation()
  const { state: sidebarState } = useSidebar()
  const { openConversation } = useSidebarChatStore()
  const { conversations, reservations, fetchConversations } = useChatSidebar()

  // Ref for calendar component to access updateSize API
  const calendarRef = useRef<CalendarCoreRef>(null)

  // Calendar events management
  const { 
    events, 
    loading, 
    error, 
    refetchEvents,
    refreshData
  } = useCalendarEvents({
    freeRoam,
    isRTL,
    autoRefresh: false
  })

  // Calendar state management
  const {
    currentView,
    currentDate,
    slotTimes,
    slotTimesKey,
    isHydrated,
    isChangingHours,
    setCurrentView,
    setCurrentDate,
    updateSlotTimes,
    setIsChangingHours
  } = useCalendarState({
    freeRoam,
    initialView,
    initialDate
  })

  // Process events to mark past reservations as non-editable in free roam mode
  const processedEvents = useMemo(() => {
    if (freeRoam) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Compare date part only
      return events.map(event => {
        const eventStartDate = new Date(event.start);
        if (event.extendedProps?.type !== 2 && eventStartDate < today) {
          return {
            ...event,
            editable: false,
            eventStartEditable: false, // Explicitly set for clarity
            eventDurationEditable: false, // Explicitly set for clarity
            // Add a specific class for potential custom styling of these non-interactive past events
            className: event.className ? [...event.className, 'past-reservation-freeroam'] : ['past-reservation-freeroam']
          };
        }
        return event;
      });
    }
    return events;
  }, [events, freeRoam]);

  // UI state
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(null)
  const [shouldLoadEditor, setShouldLoadEditor] = useState(false)
  const [calendarHeight, setCalendarHeight] = useState<number | 'auto'>(800)
  const [contextMenuEvent, setContextMenuEvent] = useState<CalendarEvent | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Hover card state
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
  const [hoverCardPosition, setHoverCardPosition] = useState<{ x: number; y: number; preferBottom?: boolean; eventHeight?: number } | null>(null)
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null)
  const [closeTimer, setCloseTimer] = useState<NodeJS.Timeout | null>(null)
  const [isHoverCardClosing, setIsHoverCardClosing] = useState(false)
  const [isHoveringCard, setIsHoveringCard] = useState(false)
  const [isHoverCardMounted, setIsHoverCardMounted] = useState(false)
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null)
  const [isMovingToCard, setIsMovingToCard] = useState(false)
  const [eventRect, setEventRect] = useState<DOMRect | null>(null)
  const lastMousePosition = useRef({ x: 0, y: 0 })
  const isHoveringCardRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  // Keep ref in sync with state
  useEffect(() => {
    isHoveringCardRef.current = isHoveringCard
  }, [isHoveringCard])

  // Helper to close hover card immediately
  const closeHoverCardImmediately = useCallback(() => {
    // Clear all timers
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
    if (closeTimer) {
      clearTimeout(closeTimer)
      setCloseTimer(null)
    }
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      setInactivityTimer(null)
    }
    
    // Close hover card without animation
    setHoveredEventId(null)
    setHoverCardPosition(null)
    setIsHoverCardClosing(false)
    setIsHoverCardMounted(false)
    setEventRect(null)
    setIsMovingToCard(false)
  }, [hoverTimer, closeTimer, inactivityTimer])

  // Vacation period checker - memoized for performance
  const isVacationDate: VacationDateChecker = useMemo(() => {
    // Use vacation periods from vacation context
    if (vacationPeriods.length === 0) return () => false;
    
    return (dateStr: string) => {
      for (const period of vacationPeriods) {
        // Create date strings from vacation period dates using same format as dateStr
        const vacationStart = `${period.start.getFullYear()}-${String(period.start.getMonth() + 1).padStart(2, '0')}-${String(period.start.getDate()).padStart(2, '0')}`
        const vacationEnd = `${period.end.getFullYear()}-${String(period.end.getMonth() + 1).padStart(2, '0')}-${String(period.end.getDate()).padStart(2, '0')}`
        
        if (dateStr >= vacationStart && dateStr <= vacationEnd) {
          return true;
        }
      }
      return false;
    };
  }, [vacationPeriods]);

  // Wrapper for refreshData that shows blur animation
  const handleRefreshWithBlur = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
    } finally {
      // Small delay to ensure smooth transition
      setTimeout(() => setIsRefreshing(false), 300)
    }
  }, [refreshData])

  // Register calendar refresh callback with vacation context
  useEffect(() => {
    setOnVacationUpdated(handleRefreshWithBlur)
  }, [setOnVacationUpdated, handleRefreshWithBlur])

  // Fetch conversations when component mounts
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Calculate calendar height based on viewport and view
  const calculateHeight = useCallback((viewType?: string) => {
    const view = viewType || currentView
    
    if (view?.includes('timeGrid')) {
      const viewportHeight = window.innerHeight;
      const containerTop = 200; // Approximate header height
      const footerSpace = 40;
      const availableHeight = viewportHeight - containerTop - footerSpace;
      return Math.max(availableHeight, 600);
    } else {
      // For list view and other views, use auto to let flexbox handle the height
      return 'auto';
    }
  }, [currentView]);

  // Set initial height and update on resize
  useEffect(() => {
    setCalendarHeight(calculateHeight());
    
    const handleResize = () => {
      setCalendarHeight(calculateHeight());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateHeight]);

  // Smooth updateSize handler called on container resize frames
  const handleUpdateSize = useCallback(() => {
    calendarRef.current?.updateSize();
  }, []);

  // Handle event change (drag and drop)
  const handleEventChange = useCallback(async (info: any) => {
    const event = info.event
    const oldEvent = info.oldEvent
    
    // Check if the new date falls within a vacation period
    const newDate = event.start
    const newDateString = newDate.toISOString().split('T')[0]
    
    if (isVacationDate(newDateString)) {
      info.revert()
      return
    }
    
    const extractedDate = event.start.toISOString().split('T')[0]
    const newTime = event.start.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric',
      minute: '2-digit'
    })
    
    const eventType = event.extendedProps.type || 0
    const customerName = event.title

    // Store original data for undo functionality
    const originalData = {
      wa_id: event.id, // Assuming event.id is the wa_id
      date: oldEvent?.start ? oldEvent.start.toISOString().split('T')[0] : extractedDate,
      time_slot: oldEvent?.start ? oldEvent.start.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: 'numeric',
        minute: '2-digit'
      }) : newTime,
      customer_name: customerName,
      type: eventType
    }

    const generateChangeDescription = () => {
      if (!oldEvent?.start) return getMessage('reservation_changed', isRTL)

      const oldDate = oldEvent.start.toISOString().split('T')[0]
      const oldTime = oldEvent.start.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: 'numeric',
        minute: '2-digit'
      })

      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
      }

      const oldDateFormatted = formatDate(oldDate)
      const newDateFormatted = formatDate(extractedDate)
      const dateChanged = oldDate !== extractedDate
      const timeChanged = oldTime !== newTime
      const isWeekView = currentView.includes('timeGrid')

      if (isRTL) {
        if (dateChanged && timeChanged) {
          return `تم نقل ${customerName} من ${oldDateFormatted} ${oldTime} إلى ${newDateFormatted} ${newTime}`
        } else if (dateChanged) {
          return isWeekView && timeChanged
            ? `تم نقل ${customerName} من ${oldDateFormatted} ${oldTime} إلى ${newDateFormatted} ${newTime}`
            : `تم نقل ${customerName} من ${oldDateFormatted} إلى ${newDateFormatted}`
        } else if (timeChanged) {
          return `تم نقل ${customerName} من ${oldTime} إلى ${newTime}`
        } else {
          return `تم تحديث حجز ${customerName}`
        }
      } else {
        if (dateChanged && timeChanged) {
          return `Moved ${customerName} from ${oldDateFormatted} ${oldTime} to ${newDateFormatted} ${newTime}`
        } else if (dateChanged) {
          return isWeekView && timeChanged
            ? `Moved ${customerName} from ${oldDateFormatted} ${oldTime} to ${newDateFormatted} ${newTime}`
            : `Moved ${customerName} from ${oldDateFormatted} to ${newDateFormatted}`
        } else if (timeChanged) {
          return `Moved ${customerName} from ${oldTime} to ${newTime}`
        } else {
          return `Updated ${customerName}'s reservation`
        }
      }
    }
    
    try {
      const result = await modifyReservation({
        id: event.id,
        date: extractedDate,
        time: newTime,
        type: eventType,
        approximate: true
      })
      
      if (result.success) {
        toast.success(isRTL ? "تم تحديث الحجز" : "Reservation Updated", {
          description: generateChangeDescription(),
          duration: 8000, // Longer duration to give time for undo
          action: {
            label: isRTL ? "تراجع" : "Undo",
            onClick: async () => {
              try {
                const undoResult = await undoModifyReservation(
                  event.extendedProps.reservationId, 
                  originalData, 
                  isRTL
                )
                
                if (undoResult.success) {
                  toast.success(isRTL ? "تم التراجع" : "Undone", {
                    description: isRTL ? "تم إرجاع الحجز إلى موضعه الأصلي" : "Reservation reverted to original position",
                    duration: 4000,
                  })
                  // Refresh data to show the reverted state
                  await handleRefreshWithBlur()
                } else {
                  toast.error(isRTL ? "فشل التراجع" : "Undo Failed", {
                    description: undoResult.message || getMessage('system_error_try_later', isRTL),
                    duration: 5000,
                  })
                }
              } catch (error) {
                toast.error(isRTL ? "خطأ في التراجع" : "Undo Error", {
                  description: getMessage('system_error_try_later', isRTL),
                  duration: 5000,
                })
              }
            }
          }
        })
      } else {
        info.revert()
        toast.error(isRTL ? "فشل في التحديث" : "Update Failed", {
          description: result.message || getMessage('system_error_try_later', isRTL),
          duration: 5000,
        })
      }
    } catch (error) {
      info.revert()
      toast.error(isRTL ? "خطأ في الشبكة" : "Network Error", {
        description: getMessage('system_error_try_later', isRTL),
        duration: 5000,
      })
    }
  }, [isVacationDate, isRTL, handleRefreshWithBlur])

  // Calendar callback handlers
  const callbackHandlers: CalendarCallbackHandlers = {
    onOpenDataEditor: (info) => {
      console.log("[onOpenDataEditor] Received info:", JSON.parse(JSON.stringify(info)));

      if (isChangingHours) {
        setIsChangingHours(false);
        return;
      }

      // Use the provided Date objects directly (UTC-coerced by FullCalendar)
      const isTimeSlotClick = 'dateStr' in info ? info.dateStr.includes('T') : 'startStr' in info ? info.startStr.includes('T') : false;
      const clickedDateTime = 'date' in info ? info.date : info.start;

      const now = new Date();

      if (clickedDateTime < now) {
        toast.error(getMessage('cannot_select_past', isRTL), {
          description: isRTL ? "لا يمكنك تحديد تاريخ أو وقت سابق." : "You cannot select a past date or time.",
          duration: 3000,
        });
        return;
      }
      
      // Extract UTC date string
      const year = clickedDateTime.getUTCFullYear();
      const month = String(clickedDateTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(clickedDateTime.getUTCDate()).padStart(2, '0');
      const selectedDateString = `${year}-${month}-${day}`;
      if (isVacationDate(selectedDateString)) {
        return;
      }

      // Normalize date range based on view
      const isTimeGridView = currentView.includes('timeGrid');
      
      let startStr: string;
      let endStr: string;

      if ('start' in info) {
        if (isTimeGridView) {
          startStr = info.startStr;
          endStr = info.endStr;
        } else {
          startStr = info.startStr;
          endStr = info.endStr;
        }
      } else {
        if (isTimeGridView) {
          startStr = info.dateStr;
        } else {
          startStr = info.dateStr;
        }
        endStr = startStr;
      }
      
      setSelectedDateRange({
        start: startStr,
        end: endStr
      });

      setEditorOpen(true);
      setTimeout(() => setShouldLoadEditor(true), 50);
    },
    onEventClick: (info) => {
      const event = info.event
      const eventType = event.extendedProps?.type
      
      // Open chat for all event types (conversations, reservations)
      // The event.id is the WhatsApp ID for all event types
      handleOpenConversation(event.id)
    },
    onEventChange: handleEventChange,
    onEventAdd: (info) => {
      // Event add handling
    },
    onEventRemove: (eventId) => {
      // Refresh events after removal
    }
  }

  // Create calendar callbacks with vacation support
  const callbacks = createCalendarCallbacks(
    callbackHandlers, 
    freeRoam, 
    getTimezone(), 
    currentDate,
    isVacationDate,
    // Only pass vacation click handler when actively recording
    recordingState.periodIndex !== null && recordingState.field !== null ? handleVacationDateClick : undefined,
    setCurrentDate,
    updateSlotTimes,
    currentView
  )

  // Context menu handlers
  const handleCancelReservation = useCallback(async (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (!event || !event.extendedProps?.reservationId) return

    try {
      const result = await cancelReservation({
        id: eventId,
        date: event.start.split('T')[0]
      })

      if (result.success) {
        toast.success(isRTL ? "تم إلغاء الحجز" : "Reservation Cancelled", {
          description: isRTL ? `تم إلغاء حجز ${event.title} بنجاح` : `Successfully cancelled reservation for ${event.title}`,
          duration: 8000, // Longer duration to give time for undo
          action: {
            label: isRTL ? "تراجع" : "Undo",
            onClick: async () => {
              try {
                const undoResult = await undoCancelReservation(
                  event.extendedProps!.reservationId, 
                  isRTL
                )
                
                if (undoResult.success) {
                  toast.success(isRTL ? "تم التراجع" : "Undone", {
                    description: isRTL ? "تم إستعادة الحجز" : "Reservation restored",
                    duration: 4000,
                  })
                  // Refresh data to show the restored reservation
                  await handleRefreshWithBlur()
                } else {
                  toast.error(isRTL ? "فشل التراجع" : "Undo Failed", {
                    description: undoResult.message || getMessage('system_error_try_later', isRTL),
                    duration: 5000,
                  })
                }
              } catch (error) {
                toast.error(isRTL ? "خطأ في التراجع" : "Undo Error", {
                  description: getMessage('system_error_try_later', isRTL),
                  duration: 5000,
                })
              }
            }
          }
        })
      } else {
        toast.error(isRTL ? "فشل في إلغاء الحجز" : "Cancellation Failed", {
          description: result.message || getMessage('system_error_try_later', isRTL),
          duration: 5000,
        })
      }
    } catch (error) {
      toast.error(isRTL ? "خطأ في الشبكة" : "Network Error", {
        description: getMessage('system_error_try_later', isRTL),
        duration: 5000,
      })
    }
  }, [events, isRTL, handleRefreshWithBlur])

  const handleEditReservation = useCallback((eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (event) {
      setSelectedDateRange({
        start: event.start,
        end: event.end
      })
      setEditorOpen(true)
      setShouldLoadEditor(true)
    }
  }, [events])

  const handleViewDetails = useCallback((eventId: string) => {
    handleEditReservation(eventId)
  }, [handleEditReservation])

  const handleOpenConversation = useCallback(async (eventId: string) => {
    // Find the event to get the customer's WhatsApp ID
    const event = events.find(e => e.id === eventId)
    if (!event) {
      toast.error(isRTL ? "خطأ" : "Error", {
        description: isRTL ? "لم يتم العثور على الحدث" : "Event not found",
        duration: 3000,
      })
      return
    }

    const conversationId = event.id

    // Show toast immediately if no conversation exists
    const existingConversation = conversations[conversationId]
    if (!existingConversation || existingConversation.length === 0) {
      const customerName = event.title
      toast.info(isRTL ? "لا توجد محادثة" : "No Conversation", {
        id: `no-conversation-${conversationId}-${crypto.randomUUID()}`,
        description: isRTL
          ? `لا توجد محادثة مع العميل ${customerName}`
          : `No conversation exists with customer ${customerName}`,
        duration: 4000,
      })
    }

    // Open the conversation immediately
    openConversation(conversationId)

    // Fetch fresh data
    try {
      await fetchConversations()
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }, [events, conversations, isRTL, openConversation, fetchConversations])

  const handleContextMenu = useCallback((event: CalendarEvent, position: { x: number; y: number }) => {
    setContextMenuEvent(event)
    setContextMenuPosition(position)
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuEvent(null)
    setContextMenuPosition(null)
  }, [])

  // Reset inactivity timer whenever there's interaction
  const resetInactivityTimer = useCallback(() => {
    // Don't set inactivity timer if hovering the card
    if (isHoveringCardRef.current) {
      return
    }
    
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
    }
    
    // Set a new timer for 3 seconds of inactivity
    const timer = setTimeout(() => {
      if (hoveredEventId && !isHoveringCardRef.current) {
        // Check if mouse is still on the event before closing
        if (eventRect) {
          const mouseX = lastMousePosition.current.x
          const mouseY = lastMousePosition.current.y
          
          const isStillOnEvent = 
            mouseX >= eventRect.left && 
            mouseX <= eventRect.right && 
            mouseY >= eventRect.top && 
            mouseY <= eventRect.bottom
          
          // Don't close if still hovering the event
          if (isStillOnEvent) {
            return
          }
        }
        
        setIsHoverCardClosing(true)
        
        setTimeout(() => {
          setHoveredEventId(null)
          setHoverCardPosition(null)
          setIsHoverCardClosing(false)
          setIsHoverCardMounted(false)
          setEventRect(null)
        }, 500) // Animation duration
      }
    }, 3000) // 3 seconds of inactivity
    
    setInactivityTimer(timer)
  }, [inactivityTimer, hoveredEventId, eventRect, lastMousePosition])

  // Handle event drag start
  const handleEventDragStart = useCallback((info: any) => {
    // Always allow drag to start and close any open hover card
    setIsDragging(true)
    // Close hover card immediately when dragging starts
    closeHoverCardImmediately()
  }, [closeHoverCardImmediately])

  // Handle event drag stop
  const handleEventDragStop = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle event mouse enter
  const handleEventMouseEnter = useCallback((info: any) => {
    const event = info.event
    const el = info.el
    
    // Don't show hover card while dragging
    if (isDragging) {
      return
    }
    
    // Update mouse position from the event
    if (info.jsEvent) {
      lastMousePosition.current = { x: info.jsEvent.clientX, y: info.jsEvent.clientY }
    }
    
    // If we're moving to the card, don't interfere
    if (isMovingToCard) {
      return
    }
    
    // Clear inactivity timer when hovering an event
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      setInactivityTimer(null)
    }
    
    // Clear any existing timers
    if (hoverTimer) {
      clearTimeout(hoverTimer)
    }
    if (closeTimer) {
      clearTimeout(closeTimer)
      setCloseTimer(null)
    }
    
    // Cancel any closing animation
    if (isHoverCardClosing) {
      setIsHoverCardClosing(false)
    }
    
    // If we're hovering a different event and a card is already shown
    if (hoveredEventId && hoveredEventId !== event.id) {
      // Don't immediately switch - user might be trying to reach the card
      return
    }
    
    // If no card is shown, set a timer to show it after delay
    if (!hoveredEventId) {
      const timer = setTimeout(() => {
        // Double-check we're not dragging
        if (isDragging) {
          return
        }
        
        const rect = el.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        const cardHeight = 250
        const cardWidth = 300
        
        const spaceAbove = rect.top
        const preferBottom = spaceAbove < cardHeight
        
        let xPosition = rect.left + rect.width / 2
        const halfCardWidth = cardWidth / 2
        if (xPosition - halfCardWidth < 0) {
          xPosition = halfCardWidth
        } else if (xPosition + halfCardWidth > viewportWidth) {
          xPosition = viewportWidth - halfCardWidth
        }
        
        setHoveredEventId(event.id)
        setHoverCardPosition({
          x: xPosition,
          y: preferBottom ? rect.bottom : rect.top,
          preferBottom,
          eventHeight: rect.height
        })
        setIsHoverCardClosing(false)
        setIsHoverCardMounted(false)
        setEventRect(rect)
      }, 1500) // 1.5 second delay for initial show
      
      setHoverTimer(timer)
    }
  }, [hoverTimer, closeTimer, isHoverCardClosing, hoveredEventId, isMovingToCard, inactivityTimer, isDragging])

  // Handle event mouse leave
  const handleEventMouseLeave = useCallback((info: any) => {
    const event = info.event
    
    // Clear timer if it exists
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
    
    // If leaving the currently hovered event, set moving to card state
    if (hoveredEventId === event.id && hoverCardPosition) {
      setIsMovingToCard(true)
      
      // Set a timer to clear the moving state if user doesn't reach the card
      const moveTimer = setTimeout(() => {
        setIsMovingToCard(false)
        // If not hovering the card, start close process
        if (!isHoveringCardRef.current) {
          resetInactivityTimer()
        }
      }, 1000) // 1 second to reach the card
      
      setCloseTimer(moveTimer)
    }
  }, [hoverTimer, hoveredEventId, hoverCardPosition, resetInactivityTimer])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimer) {
        clearTimeout(hoverTimer)
      }
      if (closeTimer) {
        clearTimeout(closeTimer)
      }
      if (inactivityTimer) {
        clearTimeout(inactivityTimer)
      }
    }
  }, [hoverTimer, closeTimer, inactivityTimer])

  // Set hover card as mounted after it appears
  useEffect(() => {
    if (hoveredEventId && hoverCardPosition && !isHoverCardClosing) {
      // Use requestAnimationFrame to ensure the initial render happens first
      requestAnimationFrame(() => {
        setIsHoverCardMounted(true)
      })
    }
  }, [hoveredEventId, hoverCardPosition, isHoverCardClosing])

  // Global mouse move handler to detect when mouse moves far away
  useEffect(() => {
    if (!hoveredEventId || !hoverCardPosition) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Update last mouse position
      lastMousePosition.current = { x: e.clientX, y: e.clientY }
      
      // Skip if we're hovering the card
      if (isHoveringCardRef.current) return

      // Calculate card boundaries
      const cardWidth = 300
      const cardHeight = 250
      const cardLeft = hoverCardPosition.x - cardWidth / 2
      const cardRight = hoverCardPosition.x + cardWidth / 2
      const cardTop = hoverCardPosition.preferBottom 
        ? hoverCardPosition.y 
        : hoverCardPosition.y - cardHeight
      const cardBottom = hoverCardPosition.preferBottom 
        ? hoverCardPosition.y + cardHeight 
        : hoverCardPosition.y

      // Check if near the event rect too
      let isNearEvent = false
      if (eventRect) {
        const eventPadding = 50 // Increased padding for more forgiveness
        isNearEvent = 
          e.clientX >= eventRect.left - eventPadding && 
          e.clientX <= eventRect.right + eventPadding &&
          e.clientY >= eventRect.top - eventPadding && 
          e.clientY <= eventRect.bottom + eventPadding
      }

      // Add larger padding around card boundaries
      const padding = 100 // Increased for more forgiveness
      const isNearCard = 
        e.clientX >= cardLeft - padding && 
        e.clientX <= cardRight + padding &&
        e.clientY >= cardTop - padding && 
        e.clientY <= cardBottom + padding

      // If mouse is outside both the card and event areas, start close timer
      if (!isNearCard && !isNearEvent) {
        setIsMovingToCard(false)
        // Start closing immediately
        setIsHoverCardClosing(true)
        setTimeout(() => {
          setHoveredEventId(null)
          setHoverCardPosition(null)
          setIsHoverCardClosing(false)
          setIsHoverCardMounted(false)
          setEventRect(null)
        }, 500)
      }
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    return () => document.removeEventListener('mousemove', handleGlobalMouseMove)
  }, [hoveredEventId, hoverCardPosition, isMovingToCard, resetInactivityTimer, isHoverCardMounted, eventRect])

  // Show loading state
  if (loading || !isHydrated) {
    return <CalendarSkeleton />
  }

  const calendarContent = (
    <ErrorBoundary fallback={CalendarErrorFallback}>
      <div className="flex h-full flex-1">
        {/* Main Calendar Area */}
        <div className="flex flex-col gap-4 w-full h-full">
          <div className="flex-1 flex flex-col">
            <CalendarCore
            ref={calendarRef}
            events={processedEvents}
        currentView={currentView}
        currentDate={currentDate}
        isRTL={isRTL}
        freeRoam={freeRoam}
        slotTimes={slotTimes}
        slotTimesKey={slotTimesKey}
        calendarHeight={calendarHeight}
        isVacationDate={isVacationDate}
        onDateClick={callbacks.dateClick}
        onSelect={callbacks.select}
        onEventClick={(info) => {
          const event = info.event
          const eventType = event.extendedProps?.type
          
          // Open chat for all event types (conversations, reservations)
          // The event.id is the WhatsApp ID for all event types
          handleOpenConversation(event.id)
          
          // Call the original callback too if needed
          if (callbacks.eventClick) {
            callbacks.eventClick(info)
          }
        }}
        onEventChange={handleEventChange}
        onContextMenu={handleContextMenu}
        onViewDidMount={(info) => {
          if (isHydrated) {
            // Immediately set the height for the new view to prevent flicker
            const newHeight = calculateHeight(info.view.type);
            setCalendarHeight(newHeight);
            setCurrentView(info.view.type);
            
            // Force immediate render for multiMonth view
            if (info.view.type === 'multiMonthYear') {
              requestAnimationFrame(() => {
                calendarRef.current?.updateSize();
              });
            }
          }
        }}
        onDatesSet={(info) => {
          if (isHydrated) setCurrentView(info.view.type);
        }}
        onUpdateSize={handleUpdateSize}
        onEventMouseEnter={handleEventMouseEnter}
        onEventMouseLeave={handleEventMouseLeave}
        onEventDragStart={handleEventDragStart}
        onEventDragStop={handleEventDragStop}
        onEventMouseDown={closeHoverCardImmediately}
      />
      
      {/* Context Menu for Events */}
      <CalendarEventContextMenu
        event={contextMenuEvent}
        position={contextMenuPosition}
        onClose={handleCloseContextMenu}
        onCancelReservation={handleCancelReservation}
        onEditReservation={handleEditReservation}
        onViewDetails={handleViewDetails}
        onOpenConversation={handleOpenConversation}
      />
      
      {/* Hover Card for Events */}
      {hoveredEventId && hoverCardPosition && !isDragging && (() => {
        const activeClass = isHoverCardMounted && !isHoverCardClosing ? 'hover-card-active' : ''
        const exitClass = isHoverCardClosing ? 'hover-card-fade-exit' : 'hover-card-fade-enter'
        
        return createPortal(
          <div
            className={cn(
              "fixed z-[50] pointer-events-none w-[300px]"
            )}
            style={{
              left: `${hoverCardPosition.x}px`,
              top: hoverCardPosition.preferBottom 
                ? `${hoverCardPosition.y}px`
                : `${hoverCardPosition.y}px`,
              transform: hoverCardPosition.preferBottom
                ? 'translateX(-50%) translateY(20px)'
                : 'translateX(-50%) translateY(calc(-100% - 20px))'
            }}
          >
            <div 
              className={cn(
                "relative pointer-events-auto rounded-md border bg-popover text-popover-foreground shadow-md overflow-visible",
                exitClass,
                activeClass
              )}
              style={{ 
                zIndex: 1,
                // Ensure card doesn't interfere with calendar event interactions
                pointerEvents: isHoverCardMounted && !isDragging ? 'auto' : 'none'
              }}
              onMouseEnter={() => {
                setIsHoveringCard(true)
                setIsMovingToCard(false) // Successfully reached the card
                // Cancel any timers
                if (closeTimer) {
                  clearTimeout(closeTimer)
                  setCloseTimer(null)
                }
                if (inactivityTimer) {
                  clearTimeout(inactivityTimer)
                  setInactivityTimer(null)
                }
                setIsHoverCardClosing(false)
              }}
              onMouseLeave={() => {
                setIsHoveringCard(false)
                // Start close timer when leaving the card
                const timer = setTimeout(() => {
                  if (!isHoveringCard) {
                    setIsHoverCardClosing(true)
                    
                    setTimeout(() => {
                      setHoveredEventId(null)
                      setHoverCardPosition(null)
                      setIsHoverCardClosing(false)
                      setIsHoverCardMounted(false)
                      setEventRect(null)
                    }, 500)
                  }
                }, 1000) // 1 second delay before closing
                
                setCloseTimer(timer)
              }}
            >

              <div style={{ pointerEvents: isHoverCardMounted && !isDragging ? 'auto' : 'none' }}>
                <CustomerStatsCard
                  selectedConversationId={hoveredEventId}
                  conversations={conversations}
                  reservations={reservations}
                  isRTL={isRTL}
                  isHoverCard={true}
                />
              </div>
            </div>
          </div>,
          document.body
        )
      })()}
      
      {/* Data Table Editor */}
      <LazyDataTableEditor
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setShouldLoadEditor(false);
          }
        }}
        slotDurationHours={SLOT_DURATION_HOURS}
        freeRoam={freeRoam}
        data={[]}
        calendarRef={calendarRef}
        events={shouldLoadEditor ? (() => {
          let processedEvents = events;
          if (freeRoam) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Compare date part only
            processedEvents = events.filter(event => {
              const eventStartDate = new Date(event.start);
              // Keep if it's a conversation (type 2) OR if it's not a past event (is today or in future)
              return event.extendedProps?.type === 2 || eventStartDate >= today;
            });
          }
          return processedEvents.map(event => ({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            type: event.extendedProps?.type === 2 ? "conversation" : "reservation",
            extendedProps: {
              customerName: event.title,
              phone: "", // Placeholder, consider fetching actual phone if needed
              description: "", // Placeholder, consider fetching actual description if needed
              status: event.extendedProps?.cancelled ? "cancelled" : "active",
              type: event.extendedProps?.type || 0,
              cancelled: event.extendedProps?.cancelled || false
            }
          }));
        })() : []}
        selectedDateRange={selectedDateRange}
        isRTL={isRTL}
        onSave={async (updatedEvents) => {
          // After saving, refresh the calendar data
          await handleRefreshWithBlur()
          setEditorOpen(false)
        }}
        onEventClick={(event) => {
          // Event click in table handled
        }}
      />
          </div>
        </div>


      </div>
    </ErrorBoundary>
  )

  // Show blurred calendar when refreshing
  if (isRefreshing) {
    return <CalendarSkeleton isBlurred={true}>{calendarContent}</CalendarSkeleton>
  }

  return calendarContent
} 