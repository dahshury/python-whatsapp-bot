/**
 * Dual Calendar Component
 * 
 * Renders two calendars side by side with drag and drop functionality between them.
 * Both calendars show all events and allow moving them between calendars with proper
 * date/time changes while preserving event types.
 */

"use client"

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
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


// Services and utilities
import { 
  createCalendarCallbacks, 
  type CalendarCallbackHandlers,
  type VacationDateChecker
} from '@/lib/calendar-callbacks'
import { getTimezone, SLOT_DURATION_HOURS } from '@/lib/calendar-config'
import { modifyReservation, undoModifyReservation } from '@/lib/api'
import type { CalendarEvent } from '@/types/calendar'

interface DualCalendarComponentProps {
  freeRoam?: boolean
  initialView?: string
  initialDate?: string
  initialLeftView?: string
  initialRightView?: string
  onViewChange?: (view: string) => void
  onLeftViewChange?: (view: string) => void
  onRightViewChange?: (view: string) => void
  // Add events props to avoid duplicate API calls
  events?: CalendarEvent[]
  loading?: boolean
  onRefreshData?: () => Promise<void>
}

export const DualCalendarComponent = React.forwardRef<
  { leftCalendarRef: React.RefObject<CalendarCoreRef>, rightCalendarRef: React.RefObject<CalendarCoreRef>, leftView: string, rightView: string },
  DualCalendarComponentProps
>(({ 
  freeRoam = false, 
  initialView = 'multiMonthYear',
  initialDate,
  initialLeftView,
  initialRightView,
  onViewChange,
  onLeftViewChange,
  onRightViewChange,
  events: externalEvents,
  loading: externalLoading,
  onRefreshData: externalRefreshData
}, ref) => {
  const { isRTL } = useLanguage()
  const { handleDateClick: handleVacationDateClick, recordingState, setOnVacationUpdated, vacationPeriods } = useVacation()
  const { state: sidebarState, open: sidebarOpen } = useSidebar()

  // Refs for both calendars
  const leftCalendarRef = useRef<CalendarCoreRef>(null)
  const rightCalendarRef = useRef<CalendarCoreRef>(null)

  // Calendar state management for both calendars
  // For dual calendars, we use the specific initial views passed in
  // and don't rely on the shared localStorage 'calendar-view' key
  const leftCalendarState = useCalendarState({
    freeRoam,
    initialView: initialLeftView || 'multiMonthYear',
    initialDate,
  })

  const rightCalendarState = useCalendarState({
    freeRoam,
    initialView: initialRightView || 'multiMonthYear',
    initialDate,
  })

  // Expose refs to parent - must be after state declaration but before any conditional returns
  React.useImperativeHandle(ref, () => ({
    leftCalendarRef,
    rightCalendarRef,
    leftView: leftCalendarState.currentView,
    rightView: rightCalendarState.currentView
  }), [leftCalendarState.currentView, rightCalendarState.currentView])

  // Calendar events management - avoid duplicate API calls when external events provided
  const localEventsState = !externalEvents ? useCalendarEvents({
    freeRoam,
    isRTL,
    autoRefresh: false
  }) : {
    events: [],
    loading: false,
    error: null,
    refreshData: async () => {},
    refetchEvents: async () => {},
    invalidateCache: () => {}
  }

  // Use external events if provided, otherwise use local state
  const allEvents = externalEvents ?? localEventsState.events
  const loading = externalLoading ?? localEventsState.loading
  const error = localEventsState.error
  const refreshData = externalRefreshData ?? localEventsState.refreshData

  // Process events to mark past reservations as non-editable in free roam mode
  const processedAllEvents = useMemo(() => {
    if (freeRoam) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Compare date part only
      return allEvents.map(event => {
        const eventStartDate = new Date(event.start);
        // Check if it's a reservation (not type 2) and is in the past
        if (event.extendedProps?.type !== 2 && eventStartDate < today) {
          return {
            ...event,
            editable: false,
            eventStartEditable: false,
            eventDurationEditable: false,
            className: event.className ? [...event.className, 'past-reservation-freeroam'] : ['past-reservation-freeroam']
          };
        }
        return event;
      });
    }
    return allEvents;
  }, [allEvents, freeRoam]);

  // Use processed events for both calendars
  const processedLeftEvents = processedAllEvents;
  const processedRightEvents = processedAllEvents;

  // Vacation period checker
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

  // Calculate calendar height based on viewport for each calendar individually
  const calculateLeftHeight = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const headerHeight = 64; // Header with sidebar trigger and dock nav
    const containerPadding = 8; // p-1 on both top and bottom (4px * 2)
    const footerSpace = 4; // Minimal buffer
    
    const availableHeight = viewportHeight - headerHeight - containerPadding - footerSpace;
    
    // For list view and multiMonth view, use auto to let content determine height
    if (leftCalendarState.currentView === 'listMonth' || leftCalendarState.currentView === 'multiMonthYear') {
      return 'auto';
    }
    
    // For all other views, use calculated height
    return Math.max(availableHeight, 600);
  }, [leftCalendarState.currentView]);

  const calculateRightHeight = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const headerHeight = 64; // Header with sidebar trigger and dock nav
    const containerPadding = 8; // p-1 on both top and bottom (4px * 2)
    const footerSpace = 4; // Minimal buffer
    
    const availableHeight = viewportHeight - headerHeight - containerPadding - footerSpace;
    
    // For list view and multiMonth view, use auto to let content determine height
    if (rightCalendarState.currentView === 'listMonth' || rightCalendarState.currentView === 'multiMonthYear') {
      return 'auto';
    }
    
    // For all other views, use calculated height
    return Math.max(availableHeight, 600);
  }, [rightCalendarState.currentView]);

  // Set initial heights and update on resize
  const [leftCalendarHeight, setLeftCalendarHeight] = useState<number | 'auto'>(800)
  const [rightCalendarHeight, setRightCalendarHeight] = useState<number | 'auto'>(800)

  useEffect(() => {
    setLeftCalendarHeight(calculateLeftHeight());
    setRightCalendarHeight(calculateRightHeight());
    
    const handleResize = () => {
      setLeftCalendarHeight(calculateLeftHeight());
      setRightCalendarHeight(calculateRightHeight());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateLeftHeight, calculateRightHeight]);

  // Update calendar size when sidebar state changes
  useEffect(() => {
    // Small delay to allow CSS transition to start
    const timer = setTimeout(() => {
      setLeftCalendarHeight(calculateLeftHeight());
      setRightCalendarHeight(calculateRightHeight());
      // Update both calendars
      leftCalendarRef.current?.updateSize();
      rightCalendarRef.current?.updateSize();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [sidebarOpen, calculateLeftHeight, calculateRightHeight]);

  // Wrapper for refreshData that shows blur animation
  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefreshWithBlur = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
    } finally {
      // Small delay to ensure smooth transition
      setTimeout(() => setIsRefreshing(false), 300)
    }
  }, [refreshData])

  // Handle event change (drag and drop) - Same logic as original calendar
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
      wa_id: event.id,
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
      if (!oldEvent?.start) return isRTL ? "تم تحديث الحجز" : "Reservation updated"

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
      const isWeekView = leftCalendarState.currentView.includes('timeGrid') || rightCalendarState.currentView.includes('timeGrid')

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
        type: eventType, // Preserve the original type
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
                    description: undoResult.message || (isRTL ? "نظام خطأ حاول مرة أخرى لاحقاً" : "System error, try again later"),
                    duration: 5000,
                  })
                }
              } catch (error) {
                toast.error(isRTL ? "خطأ في التراجع" : "Undo Error", {
                  description: (isRTL ? "نظام خطأ حاول مرة أخرى لاحقاً" : "System error, try again later"),
                  duration: 5000,
                })
              }
            }
          }
        })
        // Refresh data to show the updated event
        await handleRefreshWithBlur()
      } else {
        // Revert the event if the API call failed
        info.revert()
        toast.error(isRTL ? "فشل في التحديث" : "Update Failed", {
          description: result.message || (isRTL ? "حدث خطأ أثناء تحديث الحدث" : "Failed to update event"),
          duration: 5000,
        })
      }
    } catch (error) {
      info.revert()
      toast.error(isRTL ? "خطأ في الشبكة" : "Network Error", {
        description: (isRTL ? "حدث خطأ في الشبكة، يرجى التحقق من اتصالك" : "A network error occurred, please check your connection"),
        duration: 5000,
      })
    }
  }, [isVacationDate, isRTL, handleRefreshWithBlur])

  // Update size handlers for smooth resizing
  const handleLeftUpdateSize = useCallback(() => {
    leftCalendarRef.current?.updateSize();
  }, []);

  const handleRightUpdateSize = useCallback(() => {
    rightCalendarRef.current?.updateSize();
  }, []);

  // Calendar callback handlers for both calendars
  const leftCallbackHandlers: CalendarCallbackHandlers = {
    onOpenDataEditor: () => {} // Empty for now, dual calendar doesn't need data editor
  }

  const rightCallbackHandlers: CalendarCallbackHandlers = {
    onOpenDataEditor: () => {} // Empty for now, dual calendar doesn't need data editor
  }

  const leftCallbacks = createCalendarCallbacks(
    leftCallbackHandlers, 
    freeRoam, 
    getTimezone(), 
    leftCalendarState.currentDate,
    isVacationDate,
    // Only pass vacation click handler when actively recording
    recordingState.periodIndex !== null && recordingState.field !== null ? handleVacationDateClick : undefined
  )

  const rightCallbacks = createCalendarCallbacks(
    rightCallbackHandlers, 
    freeRoam, 
    getTimezone(), 
    rightCalendarState.currentDate,
    isVacationDate,
    // Only pass vacation click handler when actively recording
    recordingState.periodIndex !== null && recordingState.field !== null ? handleVacationDateClick : undefined
  )

  // Register calendar refresh callback with vacation context
  useEffect(() => {
    setOnVacationUpdated(handleRefreshWithBlur)
  }, [setOnVacationUpdated, handleRefreshWithBlur])

  // Show loading state
  if (loading || !leftCalendarState.isHydrated || !rightCalendarState.isHydrated) {
    return <CalendarSkeleton />
  }

  return (
    <ErrorBoundary fallback={CalendarErrorFallback}>
      <div className={`flex h-full gap-4 ${isRefreshing ? 'opacity-75 pointer-events-none' : ''}`}>
        {/* Left Calendar */}
        <div className="flex-1 border rounded-lg p-2 overflow-hidden">
          <CalendarCore
            ref={leftCalendarRef}
            events={processedLeftEvents}
            currentView={leftCalendarState.currentView}
            currentDate={leftCalendarState.currentDate}
            isRTL={isRTL}
            freeRoam={freeRoam}
            slotTimes={leftCalendarState.slotTimes}
            slotTimesKey={leftCalendarState.slotTimesKey}
            calendarHeight={leftCalendarHeight}
            isVacationDate={isVacationDate}
            droppable={true}
            onDateClick={leftCallbacks.dateClick}
            onSelect={leftCallbacks.select}
            onEventClick={leftCallbacks.eventClick}
            onEventChange={handleEventChange}
            onEventReceive={handleEventChange}
            onViewChange={onLeftViewChange}
            onViewDidMount={(info) => {
              if (leftCalendarState.isHydrated) {
                const newHeight = calculateLeftHeight();
                setLeftCalendarHeight(newHeight);
                leftCalendarState.setCurrentView(info.view.type);
                onLeftViewChange?.(info.view.type);
              }
            }}
            onDatesSet={(info) => {
              if (leftCalendarState.isHydrated) {
                leftCalendarState.setCurrentView(info.view.type);
                onLeftViewChange?.(info.view.type);
              }
            }}
            onUpdateSize={handleLeftUpdateSize}
            onNavDate={leftCalendarState.setCurrentDate}
          />
        </div>

        {/* Right Calendar */}
        <div className="flex-1 border rounded-lg p-2 overflow-hidden">
          <CalendarCore
            ref={rightCalendarRef}
            events={processedRightEvents}
            currentView={rightCalendarState.currentView}
            currentDate={rightCalendarState.currentDate}
            isRTL={isRTL}
            freeRoam={freeRoam}
            slotTimes={rightCalendarState.slotTimes}
            slotTimesKey={rightCalendarState.slotTimesKey}
            calendarHeight={rightCalendarHeight}
            isVacationDate={isVacationDate}
            droppable={true}
            onDateClick={rightCallbacks.dateClick}
            onSelect={rightCallbacks.select}
            onEventClick={rightCallbacks.eventClick}
            onEventChange={handleEventChange}
            onEventReceive={handleEventChange}
            onViewChange={onRightViewChange}
            onViewDidMount={(info) => {
              if (rightCalendarState.isHydrated) {
                const newHeight = calculateRightHeight();
                setRightCalendarHeight(newHeight);
                rightCalendarState.setCurrentView(info.view.type);
                onRightViewChange?.(info.view.type);
              }
            }}
            onDatesSet={(info) => {
              if (rightCalendarState.isHydrated) {
                rightCalendarState.setCurrentView(info.view.type);
                onRightViewChange?.(info.view.type);
              }
            }}
            onUpdateSize={handleRightUpdateSize}
            onNavDate={rightCalendarState.setCurrentDate}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
})

DualCalendarComponent.displayName = 'DualCalendarComponent' 