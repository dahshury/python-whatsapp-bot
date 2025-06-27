import { useCallback } from 'react'
import { 
  handleEventChange as handleEventChangeService,
  handleCancelReservation as handleCancelReservationService,
  handleOpenConversation as handleOpenConversationService
} from '@/lib/calendar-event-handlers'
import { convertDataTableEventToCalendarEvent } from '@/lib/calendar-event-converters'
import type { CalendarEvent } from '@/types/calendar'

interface UseCalendarEventHandlersProps {
  events: CalendarEvent[]
  conversations: any
  isRTL: boolean
  currentView: string
  isVacationDate: (date: string) => boolean
  handleRefreshWithBlur: () => Promise<void>
  openConversation: (id: string) => void
  fetchConversations: () => Promise<void>
  addEvent: (event: CalendarEvent) => void
  updateEvent: (id: string, event: CalendarEvent) => void
  removeEvent: (id: string) => void
  dataTableEditor: any
}

export function useCalendarEventHandlers({
  events,
  conversations,
  isRTL,
  currentView,
  isVacationDate,
  handleRefreshWithBlur,
  openConversation,
  fetchConversations,
  addEvent,
  updateEvent,
  removeEvent,
  dataTableEditor
}: UseCalendarEventHandlersProps) {
  // Handle event change (drag and drop)
  const handleEventChange = useCallback(async (info: any) => {
    await handleEventChangeService({
      info,
      isVacationDate,
      isRTL,
      currentView,
      onRefresh: handleRefreshWithBlur
    })
  }, [isVacationDate, isRTL, currentView, handleRefreshWithBlur])

  // Handle open conversation
  const handleOpenConversation = useCallback(async (eventId: string) => {
    await handleOpenConversationService({
      eventId,
      events,
      conversations,
      isRTL,
      openConversation,
      fetchConversations
    })
  }, [events, conversations, isRTL, openConversation, fetchConversations])

  // Context menu handlers
  const handleCancelReservation = useCallback(async (eventId: string) => {
    await handleCancelReservationService({
      eventId,
      events,
      isRTL,
      onRefresh: handleRefreshWithBlur
    })
  }, [events, isRTL, handleRefreshWithBlur])

  const handleViewDetails = useCallback((eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (event) {
      dataTableEditor.handleEditReservation(event)
    }
  }, [events, dataTableEditor])

  // Data table editor event handlers
  const handleEventAdded = useCallback((event: any) => {
    addEvent(convertDataTableEventToCalendarEvent(event))
  }, [addEvent])

  const handleEventModified = useCallback((eventId: string, event: any) => {
    updateEvent(eventId, convertDataTableEventToCalendarEvent(event))
  }, [updateEvent])

  const handleEventCancelled = useCallback((eventId: string) => {
    removeEvent(eventId)
  }, [removeEvent])

  return {
    handleEventChange,
    handleOpenConversation,
    handleCancelReservation,
    handleViewDetails,
    handleEventAdded,
    handleEventModified,
    handleEventCancelled
  }
} 