import { useCallback } from 'react'
import { 
  handleEventChange as handleEventChangeService,
  handleCancelReservation as handleCancelReservationService,
  handleOpenConversation as handleOpenConversationService
} from '@/lib/calendar-event-handlers'
import { convertDataTableEventToCalendarEvent } from '@/lib/calendar-event-converters'
import type { CalendarEvent } from '@/types/calendar'
import type { CalendarCoreRef } from '@/components/calendar-core'

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
  calendarRef?: React.RefObject<CalendarCoreRef>  // Optional calendar ref for API access
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
  dataTableEditor,
  calendarRef
}: UseCalendarEventHandlersProps) {
  // Handle event change (drag and drop)
  const handleEventChange = useCallback(async (info: any) => {
    // Debug calendar API access
    const getCalendarApi = calendarRef?.current ? () => {
      console.log('Calendar ref current:', !!calendarRef.current)
      const api = calendarRef.current!.getApi()
      console.log('Calendar API obtained:', !!api)
      if (api) {
        console.log('Calendar API methods available:', Object.keys(api).slice(0, 10)) // Show first 10 methods
      }
      return api
    } : undefined
    
    if (!getCalendarApi) {
      console.warn('No calendar ref available for event change handling')
    }
    
    await handleEventChangeService({
      info,
      isVacationDate,
      isRTL,
      currentView,
      onRefresh: handleRefreshWithBlur,
      getCalendarApi,
      updateEvent
    })
  }, [isVacationDate, isRTL, currentView, handleRefreshWithBlur, calendarRef, updateEvent])

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
    // Debug calendar API access (for future cancel undo optimizations)
    const getCalendarApi = calendarRef?.current ? () => {
      console.log('Cancel: Calendar ref current:', !!calendarRef.current)
      return calendarRef.current!.getApi()
    } : undefined
    
    await handleCancelReservationService({
      eventId,
      events,
      isRTL,
      onRefresh: handleRefreshWithBlur,
      getCalendarApi
    })
  }, [events, isRTL, handleRefreshWithBlur, calendarRef])

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