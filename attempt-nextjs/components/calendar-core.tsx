/**
 * Calendar Core Component
 * 
 * Pure FullCalendar rendering component focused solely on display and configuration.
 * Receives all data and handlers as props, contains no business logic.
 * Optimized for performance with proper memoization.
 */

'use client'

import { useRef, useLayoutEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'
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
  getButtonText, 
  getValidRange,
  SLOT_DURATION_HOURS
} from '@/lib/calendar-config'
import '@/app/fullcalendar.css'

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
  
  // Context menu handlers
  onContextMenu?: (event: CalendarEvent, position: { x: number; y: number }) => void
  
  // Resize callback
  onUpdateSize?: () => void
  
  // Drag and drop props for dual calendar mode
  droppable?: boolean
  onEventReceive?: (info: any) => void
  onEventLeave?: (info: any) => void
  eventAllow?: (dropInfo: any, draggedEvent: any) => boolean
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
    onContextMenu,
    onUpdateSize,
    droppable,
    onEventReceive,
    onEventLeave,
    eventAllow
  } = props

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
  
  // Memoize button text to prevent unnecessary recalculations
  const buttonText = useMemo(() => getButtonText(isRTL), [isRTL])
  
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
    multiMonthYear: { validRange: undefined }
  }), []);

  // Day cell class names with vacation support
  const getDayCellClassNames = useCallback((arg: any) => {
    const cellDate = arg.date;
    // Use local date string comparison to avoid timezone issues
    const currentDateStr = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const cellDateStr = new Date(cellDate.getTime() - cellDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    // Check if this date is a vacation period
    if (isVacationDate && isVacationDate(cellDateStr)) {
      return 'vacation-day cursor-not-allowed'
    }
    
    if (cellDateStr === currentDateStr) {
      return 'selected-date-cell'; // Remove conflicting Tailwind classes, let CSS handle styling
    }
    return 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer';
  }, [currentDate, isVacationDate]);

  // Day header class names with vacation support
  const getDayHeaderClassNames = useCallback((arg: any) => {
    const cellDate = arg.date;
    const cellDateStr = cellDate.toISOString().split('T')[0];
    
    // Check if this date is a vacation period
    if (isVacationDate && isVacationDate(cellDateStr)) {
      return 'vacation-day cursor-not-allowed'
    }
    
    return '';
  }, [isVacationDate]);

  // Handle event mounting with context menu support
  const handleEventDidMount = useCallback((info: any) => {
    const event = info.event
    const el = info.el
    
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
    
    // Call original handler if provided
    if (onEventDidMount) {
      onEventDidMount(info)
    }
  }, [onContextMenu, onEventDidMount])

  // Handle view mounting
  const handleViewDidMount = useCallback((info: any) => {
    // Single updateSize call after a short delay for view stabilization
    setTimeout(() => {
      if (onUpdateSize) {
        onUpdateSize()
      }
    }, 250)
    
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
  }, [onUpdateSize, onDatesSet])

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
    return true // Default to allow
  }, [freeRoam, eventAllow])

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full min-h-[600px] ${currentView !== 'multiMonthYear' ? 'transition-all duration-300 ease-in-out' : ''} ${getCalendarClassNames(currentView)}`}
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
        events={events}
        
        // Header configuration
        headerToolbar={{
          left: 'today prev,next',
          center: 'title',
          right: 'multiMonthYear,dayGridMonth,timeGridWeek,listMonth'
        }}
        
        // Enhanced calendar options
        editable={true}
        selectable={true}
        unselectAuto={false}
        selectMirror={false}
        selectMinDistance={0}
        eventStartEditable={true}
        eventDurationEditable={false}
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
        eventConstraint={undefined}
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
        buttonText={buttonText}
        firstDay={6} // Saturday as first day
        aspectRatio={1.4}
        
        // Multi-month specific options
        multiMonthMaxColumns={3}
        multiMonthMinWidth={350}
        fixedWeekCount={false}
        showNonCurrentDates={false}
        dayMaxEvents={true}
        moreLinkClick="popover"
        eventDisplay="block"
        displayEventTime={true}
        
        // Interaction control
        eventAllow={handleEventAllow}
        
        // Styling
        eventClassNames="rounded px-1 text-xs"
        dayCellClassNames={getDayCellClassNames}
        dayHeaderClassNames={getDayHeaderClassNames}
        viewClassNames="bg-white dark:bg-gray-900 rounded-lg shadow-sm"
        
        // Event callbacks
        dateClick={onDateClick}
        select={onSelect}
        eventClick={onEventClick}
        eventChange={onEventChange}
        viewDidMount={handleViewDidMount}
        eventDidMount={handleEventDidMount}
        datesSet={handleDatesSet}
        
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