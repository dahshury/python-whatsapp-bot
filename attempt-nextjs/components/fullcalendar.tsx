/**
 * FullCalendar Component
 * 
 * Main calendar component that orchestrates all services, hooks, and components.
 * Clean separation of concerns with proper dependency injection and state management.
 * Follows Domain-Driven Design principles for maintainable and scalable code.
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
import { CalendarEventContextMenu } from './calendar-event-context-menu'
import { CalendarLegend } from './calendar-legend'
import { DataTableEditorLoading } from './data-table-editor-loading'

// Services and utilities
import { 
  createCalendarCallbacks, 
  type CalendarCallbackHandlers,
  type VacationDateChecker
} from '@/lib/calendar-callbacks'
import { getTimezone, SLOT_DURATION_HOURS } from '@/lib/calendar-config'
import { modifyReservation, cancelReservation, getMessage, undoModifyReservation, undoCancelReservation } from '@/lib/api'
import type { CalendarEvent } from '@/types/calendar'

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

  // Calculate calendar height based on viewport and view
  useEffect(() => {
    const calculateHeight = () => {
      if (currentView?.includes('timeGrid')) {
        const viewportHeight = window.innerHeight;
        const containerTop = 200; // Approximate header height
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
  }, [currentView]);

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
      // TODO: Open conversation view
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

  const handleOpenConversation = useCallback((eventId: string) => {
    toast.info(isRTL ? "قريباً" : "Coming Soon", {
      description: isRTL ? "سيتم إضافة فتح المحادثات قريباً" : "Conversation view will be added soon",
      duration: 3000,
    })
  }, [isRTL])

  const handleContextMenu = useCallback((event: CalendarEvent, position: { x: number; y: number }) => {
    setContextMenuEvent(event)
    setContextMenuPosition(position)
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuEvent(null)
    setContextMenuPosition(null)
  }, [])

  // Show loading state
  if (loading || !isHydrated) {
    return <CalendarSkeleton />
  }

  const calendarContent = (
    <ErrorBoundary fallback={CalendarErrorFallback}>
      <div className="flex flex-col gap-4 h-full">
        {/* Calendar Legend */}
        <CalendarLegend freeRoam={freeRoam} />
        
        <div className="flex-1">
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
        onEventClick={callbacks.eventClick}
        onEventChange={handleEventChange}
        onContextMenu={handleContextMenu}
        onViewDidMount={(info) => {
          if (isHydrated) setCurrentView(info.view.type);
        }}
        onDatesSet={(info) => {
          if (isHydrated) setCurrentView(info.view.type);
        }}
        onUpdateSize={handleUpdateSize}
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
    </ErrorBoundary>
  )

  // Show blurred calendar when refreshing
  if (isRefreshing) {
    return <CalendarSkeleton isBlurred={true}>{calendarContent}</CalendarSkeleton>
  }

  return calendarContent
} 