/**
 * Calendar Core Component
 * 
 * Pure FullCalendar rendering component focused solely on display and configuration.
 * Receives all data and handlers as props, contains no business logic.
 * Optimized for performance with proper memoization.
 */

'use client'

import { useRef, useLayoutEffect, useMemo, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import multiMonthPlugin from '@fullcalendar/multimonth'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import arLocale from '@fullcalendar/core/locales/ar-sa'
import type { CalendarEvent } from '@/types/calendar'
import { 
  getBusinessHours, 
  getValidRange,
  SLOT_DURATION_HOURS
} from '@/lib/calendar-config'
import { cn } from '@/lib/utils'

export interface CalendarCoreProps {
  // Data props
  events: CalendarEvent[]
  
  // State props
  currentView: string
  currentDate: Date
  isRTL: boolean
  freeRoam: boolean
  slotTimes: {
    slotMinTime: string
    slotMaxTime: string
  }
  slotTimesKey: number
  calendarHeight: number | 'auto'
  
  // Vacation checker
  isVacationDate?: (dateStr: string) => boolean
  
  // Event handlers
  onDateClick?: (info: any) => void
  onSelect?: (info: any) => void
  onEventClick?: (info: any) => void
  onEventChange?: (info: any) => void
  onViewDidMount?: (info: any) => void
  onEventDidMount?: (info: any) => void
  onDatesSet?: (info: any) => void
  onEventMouseEnter?: (info: any) => void
  onEventMouseLeave?: (info: any) => void
  onEventDragStart?: (info: any) => void
  onEventDragStop?: (info: any) => void
  onViewChange?: (view: string) => void
  
  // Context menu handlers
  onContextMenu?: (event: CalendarEvent, position: { x: number; y: number }) => void
  
  // Resize callback
  onUpdateSize?: () => void
  
  // Mouse down handler for events
  onEventMouseDown?: () => void
  
  // Drag and drop props for dual calendar mode
  droppable?: boolean
  onEventReceive?: (info: any) => void
  onEventLeave?: (info: any) => void
  eventAllow?: (dropInfo: any, draggedEvent: any) => boolean
  
  // Add to CalendarCoreProps after onViewChange
  onNavDate?: (date: Date) => void
}

// Export the ref type for parent components
export interface CalendarCoreRef {
  getApi: () => any
  updateSize: () => void
}

/**
 * Get CSS class names for container based on current view
 */
const getCalendarClassNames = (currentView: string) => {
  if (currentView?.includes('timeGrid')) {
    return 'week-view-container';
  }
  return '';
};

/**
 * Calendar Core Component - Pure FullCalendar rendering
 */
export const CalendarCore = forwardRef<CalendarCoreRef, CalendarCoreProps>((props, ref) => {
  const {
    events,
    currentView,
    currentDate,
    isRTL,
    freeRoam,
    slotTimes,
    slotTimesKey,
    calendarHeight,
    isVacationDate,
    onDateClick,
    onSelect,
    onEventClick,
    onEventChange,
    onViewDidMount,
    onEventDidMount,
    onDatesSet,
    onEventMouseEnter,
    onEventMouseLeave,
    onEventDragStart,
    onEventDragStop,
    onViewChange,
    onContextMenu,
    onUpdateSize,
    onEventMouseDown,
    onNavDate,
    droppable,
    onEventReceive,
    onEventLeave,
    eventAllow
  } = props
  
  // Optimize events for multiMonth view - simplified event objects
  const optimizedEvents = useMemo(() => {
    if (currentView === 'multiMonthYear') {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Compare date part only
      
      // Return simplified events for multiMonth view
      return events.map(event => {
        const eventStartDate = new Date(event.start);
        const isPastEvent = eventStartDate < today;
        const isReservation = event.extendedProps?.type !== 2;
        
        // In free roam mode: allow dragging for future reservations only
        // In normal mode: allow dragging for future reservations only
        const allowDrag = !isPastEvent && isReservation;
        
        return {
          ...event,
          // Allow drag/drop for future reservations only
          editable: event.editable !== false ? allowDrag : false,
          eventStartEditable: event.editable !== false ? allowDrag : false,
          eventDurationEditable: false, // Keep duration editing disabled
          // In free roam mode, past events should remain clickable (don't set to false)
          // FullCalendar will still allow clicks even if editable is false
          // Simplify extended props
          extendedProps: {
            type: event.extendedProps?.type || 0,
            cancelled: event.extendedProps?.cancelled || false,
            reservationId: event.extendedProps?.reservationId
          }
        }
      })
    }
    return events
  }, [events, currentView, freeRoam])

  const calendarRef = useRef<FullCalendar>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Expose calendar API to parent component
  useImperativeHandle(ref, () => ({
    getApi: () => calendarRef.current?.getApi(),
    updateSize: () => {
      if (calendarRef.current) {
        calendarRef.current.getApi().updateSize()
      }
    }
  }), [])

  // Memoize business hours to prevent unnecessary recalculations
  const businessHours = useMemo(() => getBusinessHours(freeRoam), [freeRoam])
  
  
  /**
   * Global validRange function for FullCalendar
   * Applies to all views except where overridden in viewsProp
   */
  const globalValidRangeFunction = useMemo(() => {
    if (freeRoam) return undefined;
    // Default to today onward
    return getValidRange(freeRoam);
  }, [freeRoam]);

  // Prepare validRange prop for FullCalendar (omit if undefined)
  const validRangeProp = globalValidRangeFunction
    ? { validRange: globalValidRangeFunction }
    : {};

  // View-specific overrides: disable validRange for multiMonthYear view
  const viewsProp = useMemo(() => ({
    multiMonthYear: {
      validRange: undefined,
      displayEventTime: false as const,
      dayMaxEvents: true,
      dayMaxEventRows: true,
      moreLinkClick: 'popover' as const
    },
    dayGridMonth: {
      dayMaxEvents: true,
      dayMaxEventRows: true,
      moreLinkClick: 'popover' as const
    },
    dayGridWeek: {
      dayMaxEvents: true,
      dayMaxEventRows: true,
      moreLinkClick: 'popover' as const
    }
  }), []);

  // Day cell class names (vacation styling now handled by background events)
  const getDayCellClassNames = useCallback((arg: any) => {
    const cellDate = arg.date;
    // Use local date string comparison to avoid timezone issues
    const currentDateStr = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const cellDateStr = new Date(cellDate.getTime() - cellDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    // Check if this date is in the past
    const isPastDate = cellDate < new Date();

    // Add vacation-day class for cells inside any vacation period
    const vacationClass = isVacationDate && isVacationDate(cellDateStr) ? 'vacation-day' : '';

    // Disable hover for past dates when not in free roam
    if (!freeRoam && isPastDate) {
      return vacationClass;
    }

    if (cellDateStr === currentDateStr) {
      return cn('selected-date-cell', vacationClass);
    }

    return cn(vacationClass, 'hover:bg-muted cursor-pointer');
  }, [currentDate, freeRoam, isVacationDate]);

  // Day header class names (vacation styling now handled by background events)
  const getDayHeaderClassNames = useCallback((arg: any) => {
    // Note: Vacation styling is now handled by FullCalendar background events
    // No need to check isVacationDate here
    return '';
  }, []);

  // Handle event mounting with context menu support
  const handleEventDidMount = useCallback((info: any) => {
    const event = info.event
    const el = info.el
    const view = info.view
    
    // Optimize for multiMonth view - skip heavy operations
    const isMultiMonth = view.type === 'multiMonthYear'
    
    // Add data attributes for proper styling
    if (event.extendedProps.cancelled) {
      el.setAttribute('data-cancelled', 'true')
    }
    
    // Add conversation event class
    if (event.extendedProps.type === 2) {
      el.classList.add('conversation-event')
    }
    
    // Add reservation type class for follow-up reservations
    if (event.extendedProps.type === 1) {
      el.classList.add('reservation-type-1')
    }
    
    // Add mousedown handler to notify parent when event interaction starts
    if (onEventMouseDown) {
      el.addEventListener('mousedown', onEventMouseDown)
    }
    
    // Skip context menu for multiMonth view to improve performance
    if (!isMultiMonth) {
      // Add context menu functionality
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (onContextMenu) {
          // Convert FullCalendar event to our CalendarEvent type
          const calendarEvent: CalendarEvent = {
            id: event.id,
            title: event.title,
            start: event.startStr,
            end: event.endStr || event.startStr,
            backgroundColor: event.backgroundColor || '',
            borderColor: event.borderColor || '',
            editable: true,
            extendedProps: {
              type: event.extendedProps?.type || 0,
              cancelled: event.extendedProps?.cancelled || false,
              ...event.extendedProps
            }
          }
          
          onContextMenu(calendarEvent, { x: e.clientX, y: e.clientY })
        }
      }
      
      // Add right-click listener
      el.addEventListener('contextmenu', handleContextMenu)
    }
    
    // Call original handler if provided
    if (onEventDidMount) {
      onEventDidMount(info)
    }
  }, [onContextMenu, onEventDidMount, onEventMouseDown])

  // Handle view mounting
  const handleViewDidMount = useCallback((info: any) => {
    // Optimize timing based on view type
    const isMultiMonth = info.view.type === 'multiMonthYear'
    const delay = isMultiMonth ? 50 : 250 // Faster for multiMonth
    
    // Single updateSize call after a short delay for view stabilization
    setTimeout(() => {
      if (onUpdateSize) {
        onUpdateSize()
      }
    }, delay)
    
    // Call original handler if provided
    if (onViewDidMount) {
      onViewDidMount(info)
    }
  }, [onUpdateSize, onViewDidMount])

  // Handle dates set
  const handleDatesSet = useCallback((info: any) => {
    // Single updateSize call after a short delay
    setTimeout(() => {
      if (onUpdateSize) {
        onUpdateSize()
      }
    }, 250)
    
    // Call original handler if provided
    if (onDatesSet) {
      onDatesSet(info)
    }
    
    // Only call onNavDate for non-timegrid views to avoid conflicts with slot time switching
    // In timegrid views, dateClick handles the date updates directly
    if (onNavDate && !info.view.type.includes('timeGrid')) {
      onNavDate(info.view.currentStart)
    }
  }, [onUpdateSize, onDatesSet, onNavDate])

  // Update calendar size when container changes
  useLayoutEffect(() => {
    if (!calendarRef.current || !containerRef.current) return

    // Initial sizing - immediate
    calendarRef.current.getApi().updateSize()

    // Only observe container resize for views other than multiMonthYear
    const observers: ResizeObserver[] = []
    if (props.currentView !== 'multiMonthYear') {
      const resizeObserver = new ResizeObserver(() => {
        onUpdateSize?.()
      })
      resizeObserver.observe(containerRef.current)
      observers.push(resizeObserver)
    }

    // Always listen to window resize
    const handleWindowResize = () => {
      onUpdateSize?.()
    }
    window.addEventListener('resize', handleWindowResize)

    return () => {
      observers.forEach(obs => obs.disconnect())
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [props.currentView, isRTL, onUpdateSize])

  // Callback to determine if an event is allowed to be dragged or resized
  const handleEventAllow = useCallback((dropInfo: any, draggedEvent: any) => {
    if (freeRoam) {
      const eventStartDate = new Date(draggedEvent.start)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Compare dates only

      // Check if it's a reservation (not type 2) and is in the past
      if (draggedEvent.extendedProps?.type !== 2 && eventStartDate < today) {
        return false // Prevent interaction for past reservations in free roam
      }
    }
    
    // If an external eventAllow is provided, use it
    if (eventAllow) {
      return eventAllow(dropInfo, draggedEvent)
    }
    return true // Let API handle all validation
  }, [freeRoam, eventAllow])

  // Add state to track events being processed
  const processingEvents = useRef(new Set<string>())

  // Enhanced event change handler with processing state management
  const handleEventChangeWithProcessing = useCallback(async (info: any) => {
    const eventId = info.event.id
    
    // Prevent multiple simultaneous changes for the same event
    if (processingEvents.current.has(eventId)) {
      console.log(`Event ${eventId} is already being processed, reverting...`)
      info.revert()
      return
    }

    // Mark event as being processed
    processingEvents.current.add(eventId)
    
    // Add visual indication that event is being processed
    const eventEl = info.el
    if (eventEl) {
      eventEl.classList.add('processing')
    }

    try {
      if (onEventChange) {
        await onEventChange(info)
      }
    } finally {
      // Always clean up processing state
      processingEvents.current.delete(eventId)
      
      // Restore visual state
      if (eventEl) {
        eventEl.classList.remove('processing')
      }
    }
  }, [onEventChange])

  // // Navigate calendar when currentDate prop changes
  // useEffect(() => {
  //   if (calendarRef.current) {
  //     const api = calendarRef.current.getApi();
  //     const viewStart = api.getDate(); // current anchor date
  //     if (viewStart.getTime() !== currentDate.getTime()) {
  //       api.gotoDate(currentDate);
  //     }
  //   }
  // }, [currentDate]);

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full ${currentView === 'listMonth' ? 'flex flex-col' : 'min-h-[600px]'} ${getCalendarClassNames(currentView)}`}
      data-free-roam={freeRoam}
    >
      <FullCalendar
        key={slotTimesKey} // Force re-render when slot times change
        ref={calendarRef}
        plugins={[multiMonthPlugin, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={currentView}
        initialDate={currentDate}
        height={calendarHeight}
        contentHeight={calendarHeight}
        events={optimizedEvents}
        
        // Header configuration - disable native toolbar since we use dock navbar
        headerToolbar={false}
        
        // Enhanced calendar options
        editable={true}
        selectable={true}
        unselectAuto={false}
        selectMirror={false}
        selectMinDistance={0}
        eventStartEditable={true}
        eventDurationEditable={false}
        eventOverlap={true}
        expandRows={true}
        navLinks={true}
        weekNumbers={false}
        buttonIcons={{
          prev: 'chevron-left',
          next: 'chevron-right'
        }}
        nowIndicator={true}
        allDaySlot={false}
        slotDuration={{ hours: SLOT_DURATION_HOURS }}
        
        // Business hours and constraints
        businessHours={businessHours}
        eventConstraint={freeRoam ? undefined : "businessHours"}
        selectConstraint={freeRoam ? undefined : "businessHours"}
        hiddenDays={freeRoam ? [] : [5]} // Hide Friday unless in free roam
        
        // Valid range for navigation
        {...validRangeProp}
        // View-specific overrides for multiMonthYear
        views={viewsProp}
        
        // Dynamic slot times
        slotMinTime={slotTimes.slotMinTime}
        slotMaxTime={slotTimes.slotMaxTime}
        
        // Localization
        locale={isRTL ? arLocale : "en"}
        direction={isRTL ? "rtl" : "ltr"}

        firstDay={6} // Saturday as first day
        aspectRatio={1.4}
        
        // Multi-month specific options
        multiMonthMaxColumns={3}
        multiMonthMinWidth={280}
        fixedWeekCount={false}
        showNonCurrentDates={false}
        dayMaxEvents={true}
        dayMaxEventRows={true}
        moreLinkClick="popover"
        eventDisplay="block"
        displayEventTime={currentView !== 'multiMonthYear'}
        
        // Interaction control
        eventAllow={handleEventAllow}
        
        // Styling
        eventClassNames="rounded px-1 text-xs"
        dayCellClassNames={getDayCellClassNames}
        dayHeaderClassNames={getDayHeaderClassNames}
        viewClassNames="bg-card rounded-lg shadow-sm"
        
        // Event callbacks - use enhanced handler for eventChange
        dateClick={onDateClick}
        select={onSelect}
        eventClick={onEventClick}
        eventChange={handleEventChangeWithProcessing}
        viewDidMount={handleViewDidMount}
        eventDidMount={handleEventDidMount}
        datesSet={handleDatesSet}
        eventMouseEnter={onEventMouseEnter}
        eventMouseLeave={onEventMouseLeave}
        eventDragStart={onEventDragStart}
        eventDragStop={onEventDragStop}
        
        // Time grid specific options
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          omitZeroMinute: true,
          meridiem: 'short'
        }}
        slotLabelInterval={{ hours: 1 }}
        
        // Drag and drop options
        droppable={droppable}
        eventReceive={onEventReceive}
        eventLeave={onEventLeave}
      />
    </div>
  )
}) 