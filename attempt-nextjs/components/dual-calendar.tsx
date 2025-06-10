/**
 * Dual Calendar Component
 * 
 * Renders two calendars side by side with drag and drop functionality between them.
 * Both calendars show all events and allow moving them between calendars with proper
 * date/time changes while preserving event types.
 */

"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
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
import { CalendarLegend } from './calendar-legend'

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
}

export function DualCalendarComponent({ 
  freeRoam = false, 
  initialView = 'multiMonthYear',
  initialDate
}: DualCalendarComponentProps) {
  const { isRTL } = useLanguage()
  const { handleDateClick: handleVacationDateClick, recordingState, setOnVacationUpdated, vacationPeriods } = useVacation()
  const { state: sidebarState } = useSidebar()

  // Refs for both calendars
  const leftCalendarRef = useRef<CalendarCoreRef>(null)
  const rightCalendarRef = useRef<CalendarCoreRef>(null)

  // Calendar events management
  const { 
    events: allEvents, 
    loading, 
    error, 
    refetchEvents,
    refreshData
  } = useCalendarEvents({
    freeRoam,
    isRTL,
    autoRefresh: false
  })

  // Calendar state management for both calendars
  const leftCalendarState = useCalendarState({
    freeRoam,
    initialView,
    initialDate
  })

  const rightCalendarState = useCalendarState({
    freeRoam,
    initialView,
    initialDate
  })

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

  // Calculate calendar height
  const [calendarHeight, setCalendarHeight] = useState<number | 'auto'>(800)

  useEffect(() => {
    const calculateHeight = () => {
      if (leftCalendarState.currentView?.includes('timeGrid') || rightCalendarState.currentView?.includes('timeGrid')) {
        const viewportHeight = window.innerHeight;
        const containerTop = 200;
        const footerSpace = 40;
        const availableHeight = viewportHeight - containerTop - footerSpace;
        setCalendarHeight(Math.max(availableHeight, 600));
      } else {
        setCalendarHeight('auto');
      }
    };
    
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, [leftCalendarState.currentView, rightCalendarState.currentView]);

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

      if (isRTL) {
        if (dateChanged && timeChanged) {
          return `تم نقل ${customerName} من ${oldDateFormatted} ${oldTime} إلى ${newDateFormatted} ${newTime}`
        } else if (dateChanged) {
          return `تم نقل ${customerName} من ${oldDateFormatted} إلى ${newDateFormatted}`
        } else if (timeChanged) {
          return `تم نقل ${customerName} من ${oldTime} إلى ${newTime}`
        } else {
          return `تم تحديث حجز ${customerName}`
        }
      } else {
        if (dateChanged && timeChanged) {
          return `Moved ${customerName} from ${oldDateFormatted} ${oldTime} to ${newDateFormatted} ${newTime}`
        } else if (dateChanged) {
          return `Moved ${customerName} from ${oldDateFormatted} to ${newDateFormatted}`
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
      <div className="flex flex-col gap-4 h-full">
        {/* Calendar Legend */}
        <CalendarLegend freeRoam={freeRoam} />
        
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 ${isRefreshing ? 'opacity-75 pointer-events-none' : ''}`}>
        {/* Left Calendar - All Events */}
        <div className="flex flex-col">
          <div className="mb-2 text-center">
            <h3 className="text-lg font-semibold text-foreground">
              {isRTL ? "التقويم الأيسر" : "Left Calendar"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isRTL ? "اسحب الأحداث بين التقويمين" : "Drag events between calendars"}
            </p>
          </div>
          <div className="flex-1 border rounded-lg p-2">
            <CalendarCore
              ref={leftCalendarRef}
              events={processedLeftEvents}
              currentView={leftCalendarState.currentView}
              currentDate={leftCalendarState.currentDate}
              isRTL={isRTL}
              freeRoam={freeRoam}
              slotTimes={leftCalendarState.slotTimes}
              slotTimesKey={leftCalendarState.slotTimesKey}
              calendarHeight={calendarHeight}
              isVacationDate={isVacationDate}
              droppable={true}
              onDateClick={leftCallbacks.dateClick}
              onSelect={leftCallbacks.select}
              onEventClick={leftCallbacks.eventClick}
              onEventChange={handleEventChange}
              onEventReceive={handleEventChange} // Use the same handler for cross-calendar drops
              onViewDidMount={(info) => {
                if (leftCalendarState.isHydrated) leftCalendarState.setCurrentView(info.view.type);
              }}
              onDatesSet={(info) => {
                if (leftCalendarState.isHydrated) leftCalendarState.setCurrentView(info.view.type);
              }}
              onUpdateSize={handleLeftUpdateSize}
            />
          </div>
        </div>

        {/* Right Calendar - All Events */}
        <div className="flex flex-col">
          <div className="mb-2 text-center">
            <h3 className="text-lg font-semibold text-foreground">
              {isRTL ? "التقويم الأيمن" : "Right Calendar"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isRTL ? "اسحب الأحداث بين التقويمين" : "Drag events between calendars"}
            </p>
          </div>
          <div className="flex-1 border rounded-lg p-2">
            <CalendarCore
              ref={rightCalendarRef}
              events={processedRightEvents}
              currentView={rightCalendarState.currentView}
              currentDate={rightCalendarState.currentDate}
              isRTL={isRTL}
              freeRoam={freeRoam}
              slotTimes={rightCalendarState.slotTimes}
              slotTimesKey={rightCalendarState.slotTimesKey}
              calendarHeight={calendarHeight}
              isVacationDate={isVacationDate}
              droppable={true}
              onDateClick={rightCallbacks.dateClick}
              onSelect={rightCallbacks.select}
              onEventClick={rightCallbacks.eventClick}
              onEventChange={handleEventChange}
              onEventReceive={handleEventChange} // Use the same handler for cross-calendar drops
              onViewDidMount={(info) => {
                if (rightCalendarState.isHydrated) rightCalendarState.setCurrentView(info.view.type);
              }}
              onDatesSet={(info) => {
                if (rightCalendarState.isHydrated) rightCalendarState.setCurrentView(info.view.type);
              }}
              onUpdateSize={handleRightUpdateSize}
            />
          </div>
        </div>
        </div>
      </div>
    </ErrorBoundary>
  )
} 