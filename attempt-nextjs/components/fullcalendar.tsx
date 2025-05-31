"use client"

import { useRef, useLayoutEffect, useState, useEffect, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import multiMonthPlugin from '@fullcalendar/multimonth'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { useLanguage } from '@/lib/language-context'
import arLocale from '@fullcalendar/core/locales/ar-sa'
import { getReservations, getConversations, modifyReservation, cancelReservation, getVacationPeriods, getMessage } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { CalendarEvent, Reservation } from '@/types/calendar'
import { 
  getBusinessHours, 
  getSlotTimes, 
  getButtonText, 
  getTimezone,
  getValidRange,
  parseTime,
  getVacationEvents,
  SLOT_DURATION_HOURS,
  type VacationPeriod
} from '@/lib/calendar-config'
import { 
  createCalendarCallbacks, 
  type CalendarCallbackHandlers, 
  type DateClickArg, 
  type DateSelectArg 
} from '@/lib/calendar-callbacks'
import { DataTableEditor } from './data-table-editor'
import { CalendarSkeleton } from './calendar-skeleton'
import { ErrorBoundary, CalendarErrorFallback } from './error-boundary'
import { CalendarEventContextMenu } from './calendar-event-context-menu'
import '@/app/fullcalendar.css'
import { useSidebar } from '@/components/ui/sidebar'
import dynamic from 'next/dynamic'

// Lazy load DataTableEditor to improve initial performance
const LazyDataTableEditor = dynamic(() => import('./data-table-editor').then(mod => ({ default: mod.DataTableEditor })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-4">Loading editor...</div>
})

// Add a custom CSS class to the container when in timeGrid views
const getCalendarClassNames = (currentView: string) => {
  if (currentView?.includes('timeGrid')) {
    return 'week-view-container';
  }
  return '';
};

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
  const calendarRef = useRef<FullCalendar>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isRTL } = useLanguage()
  const { toast } = useToast()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(null)
  const [shouldLoadEditor, setShouldLoadEditor] = useState(false)
  
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('calendar-date');
      if (savedDate) {
        const date = new Date(savedDate);
        if (!isNaN(date.getTime())) { // Check if the date is valid
          return date;
        }
      }
    }
    return initialDate ? new Date(initialDate) : new Date();
  });

  const initialViewFromStorageOrProp = useMemo(() => {
    let viewToUse = initialView;
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('calendar-view');
      if (savedView) {
        viewToUse = savedView;
      }
    }
    return viewToUse;
  }, [initialView]);

  const [currentView, setCurrentView] = useState<string>(initialViewFromStorageOrProp);
  const viewRef = useRef<string>(initialViewFromStorageOrProp);
  const displayedDateRef = useRef<Date>(currentDate); // Align with currentDate from the start
  
  const [isHydrated, setIsHydrated] = useState(false);

  const [slotTimesKey, setSlotTimesKey] = useState(0);
  const [slotTimes, setSlotTimes] = useState(() => getSlotTimes(currentDate, freeRoam, currentView)); // Use currentView here
  const [isChangingHours, setIsChangingHours] = useState(false)
  const { state: sidebarState } = useSidebar()
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([])
  const [calendarHeight, setCalendarHeight] = useState<number | 'auto'>(800);
  const [contextMenuEvent, setContextMenuEvent] = useState<CalendarEvent | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)

  // Debounced updateSize function
  const debouncedUpdateSize = useMemo(() => {
    // IMPORTANT: This delay should ideally match your sidebar's CSS transition duration.
    // Common values are 250ms to 350ms.
    const DEBOUNCE_DELAY = 300; // ms
    
    let timeoutId: NodeJS.Timeout | null = null;
    return () => {
      if (!calendarRef.current) return;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        const api = calendarRef.current?.getApi();
        if (api) {
          api.updateSize();
        }
      }, DEBOUNCE_DELAY);
    };
  }, []); // Empty dependency array ensures this is created once

  // Memoized vacation checking function for performance
  const isVacationDate = useMemo(() => {
    if (vacationPeriods.length === 0) return () => false;
    
    return (dateStr: string) => {
      for (const vacationPeriod of vacationPeriods) {
        const vacationStart = vacationPeriod.start.toISOString().split('T')[0]
        const vacationEnd = vacationPeriod.end.toISOString().split('T')[0]
        
        if (dateStr >= vacationStart && dateStr <= vacationEnd) {
          return true;
        }
      }
      return false;
    };
  }, [vacationPeriods]);

  // Add a useEffect to update slotTimes and re-render when freeRoam or currentDate changes
  useEffect(() => {
    setSlotTimes(getSlotTimes(currentDate, freeRoam, currentView));
    setSlotTimesKey(prevKey => prevKey + 1); // Changing the key forces FullCalendar to re-render with new slot times
  }, [freeRoam, currentDate, currentView]);

  // Helper to format a Date object to 'YYYY-MM-DDTHH:MM:SS' (local ISO-like string)
  const formatToLocalISO = (dt: Date | null): string => {
    if (!dt) return '';
    const year = dt.getUTCFullYear();
    const month = (dt.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = dt.getUTCDate().toString().padStart(2, '0');
    const hours = dt.getUTCHours().toString().padStart(2, '0');
    const minutes = dt.getUTCMinutes().toString().padStart(2, '0');
    const seconds = dt.getUTCSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Hydration effect
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Save view to localStorage when it changes after hydration
  useEffect(() => {
    if (isHydrated && currentView) {
      localStorage.setItem('calendar-view', currentView);
    }
  }, [currentView, isHydrated]);
  
  // Save date to localStorage when it changes after hydration
  useEffect(() => {
    if (isHydrated && currentDate) {
      localStorage.setItem('calendar-date', currentDate.toISOString());
    }
  }, [currentDate, isHydrated]);

  // Fetch vacation periods
  useEffect(() => {
    const fetchVacationPeriods = async () => {
      try {
        const periods = await getVacationPeriods()
        setVacationPeriods(periods)
      } catch (error) {
        console.error('Error fetching vacation periods:', error)
      }
    }
    
    fetchVacationPeriods()
  }, [])

  // Calculate calendar height based on viewport and container
  useEffect(() => {
    const calculateHeight = () => {
      if (!containerRef.current) return;
      
      if (currentView?.includes('timeGrid')) {
        // For week/day view, calculate dynamic height
        // Get viewport height
        const viewportHeight = window.innerHeight;
        // Get container position from top
        const containerTop = containerRef.current.getBoundingClientRect().top;
        // Allow space for footer/margins (adjust as needed)
        const footerSpace = 40;
        
        // Calculate available height
        const availableHeight = viewportHeight - containerTop - footerSpace;
        // Ensure minimum height
        setCalendarHeight(Math.max(availableHeight, 600));
      } else {
        // For other views, use auto height
        setCalendarHeight('auto');
      }
    };
    
    // Calculate immediately
    calculateHeight();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateHeight);
    
    return () => {
      window.removeEventListener('resize', calculateHeight);
    };
  }, [currentView, containerRef.current]);

  // Process reservations with free roam logic (matching Python calendar_view.py lines 45-68)
  const processReservations = (allReservations: Record<string, Reservation[]>) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today for comparison
    
    const activeReservations: Record<string, Reservation[]> = {}
    const cancelledReservations: Record<string, Reservation[]> = {}
    
    for (const [waId, customerReservations] of Object.entries(allReservations)) {
      const active: Reservation[] = []
      const cancelled: Reservation[] = []
      
      for (const reservation of customerReservations) {
        const dateStr = reservation.date
        if (dateStr) {
          const reservationDate = new Date(dateStr)
          reservationDate.setHours(0, 0, 0, 0)
          
          // In free_roam mode include all dates, else only future dates (matching Python logic)
          if (freeRoam) {
            if (reservation.cancelled) {
              cancelled.push(reservation)
            } else {
              active.push(reservation)
            }
          } else if (reservationDate >= today && !reservation.cancelled) {
            active.push(reservation)
          }
        }
      }
      
      if (active.length > 0) {
        activeReservations[waId] = active
      }
      if (cancelled.length > 0) {
        cancelledReservations[waId] = cancelled
      }
    }
    
    return { activeReservations, cancelledReservations, allCustomerData: allReservations }
  }

  // Generate calendar events from reservations and conversations (matching Python logic)
  const generateCalendarEvents = (
    allReservations: Record<string, Reservation[]>, 
    conversationsData: Record<string, any[]> = {}
  ): CalendarEvent[] => {
    const calendarEvents: CalendarEvent[] = []
    
    // Add vacation events first if not in free roam mode
    if (!freeRoam) {
      const vacationEvents = getVacationEvents(vacationPeriods, isRTL)
      calendarEvents.push(...vacationEvents)
    }
    
    // Validate input data
    if (!allReservations || typeof allReservations !== 'object') {
      console.warn('Invalid reservations data received')
      return calendarEvents
    }
    
    // Process reservations based on free roam mode (matching Python logic)
    const { activeReservations, cancelledReservations, allCustomerData } = processReservations(allReservations)
    
    // Constants from Python implementation
    const slotDurationHours = SLOT_DURATION_HOURS // 2-hour slots
    const numReservationsPerSlot = 6 // Match Python's 6 reservations per slot
    
    // Adjust duration for free roam mode - use longer events to improve visibility
    let eventDurationMs: number
    if (freeRoam) {
      // In free roam mode, use longer events for better visibility across 24 hours (45 minutes)
      eventDurationMs = 45 * 60 * 1000 // 45 minutes per event
    } else {
      // Normal mode uses the original calculation
      eventDurationMs = (slotDurationHours * 60 * 60 * 1000) / numReservationsPerSlot // Duration per reservation
    }
    
    // Step 1: Group reservations by date and time slot (matching Python logic lines 324-333)
    const groupedReservations: Record<string, Array<{ id: string, reservation: Reservation }>> = {}
    
    for (const [customerId, customerReservations] of Object.entries(activeReservations)) {
      for (const reservation of customerReservations) {
        if (reservation && reservation.customer_name && reservation.date && reservation.time_slot) {
          const dateStr = reservation.date
          const timeStr = reservation.time_slot
          const key = `${dateStr}_${timeStr}`
          
          if (!groupedReservations[key]) {
            groupedReservations[key] = []
          }
          
          groupedReservations[key].push({
            id: customerId,
            reservation
          })
        }
      }
    }
    
    // Step 1.5: Sort each group by reservation type then customer name (exactly matching Python logic)
    for (const key of Object.keys(groupedReservations)) {
      groupedReservations[key].sort((a, b) => {
        const typeA = a.reservation.type || 0
        const typeB = b.reservation.type || 0
        if (typeA !== typeB) return typeA - typeB
        return (a.reservation.customer_name || "").localeCompare(b.reservation.customer_name || "")
      })
    }
    
    // Step 2: Process each time slot group sequentially (matching Python logic lines 338-383)
    for (const [timeKey, reservations] of Object.entries(groupedReservations)) {
      let previousEndTimeMs: number | null = null // Store as UTC milliseconds

      for (const { id, reservation } of reservations) {
        const customerName = reservation.customer_name
        const dateStr = reservation.date
        const timeStr = reservation.time_slot
        const type = reservation.type || 0
        
        try {
          const parsedTime = parseTime(timeStr) // HH:MM
          if (!dateStr || !parsedTime) {
            console.warn('Invalid date or time for reservation:', { customerName, dateStr, timeStr });
            continue;
          }
          
          let currentEventStartDateTime = new Date(`${dateStr}T${parsedTime}:00Z`) // Parse as UTC

          if (isNaN(currentEventStartDateTime.getTime())) {
            console.error(`Invalid date/time for reservation (parsed as NaN): ${dateStr} ${parsedTime}`)
            continue
          }
          
          if (previousEndTimeMs && currentEventStartDateTime.getTime() <= previousEndTimeMs) {
            currentEventStartDateTime = new Date(previousEndTimeMs + 60000) // Add 1 minute
          }
          
          const currentEventEndDateTime = new Date(currentEventStartDateTime.getTime() + eventDurationMs)
          previousEndTimeMs = currentEventEndDateTime.getTime()
          
          const isPastSlot = currentEventStartDateTime < new Date() // Compare UTC dates
          
          const event: CalendarEvent = {
            id: id,
            title: customerName,
            start: formatToLocalISO(currentEventStartDateTime),
            end: formatToLocalISO(currentEventEndDateTime),
            backgroundColor: type === 0 ? "#4caf50" : "#3688d8",
            borderColor: type === 0 ? "#4caf50" : "#3688d8",
            editable: !isPastSlot || freeRoam,
            extendedProps: {
              type,
              cancelled: false
            }
          }
          calendarEvents.push(event)
        } catch (error) {
          console.error('Error processing active reservation for calendar event:', { customerName, dateStr, timeStr }, error)
          continue
        }
      }
    }
    
    // Add cancelled reservations if in free roam mode (matching Python logic lines 385-411)
    if (freeRoam) {
      for (const [customerId, customerReservations] of Object.entries(cancelledReservations)) {
        for (const reservation of customerReservations) {
          if (reservation && reservation.customer_name) {
            const customerName = reservation.customer_name
            const dateStr = reservation.date
            const timeStr = reservation.time_slot
            const type = reservation.type || 0
            
            try {
              const parsedTime = parseTime(timeStr)
              if (!dateStr || !parsedTime) {
                console.warn('Invalid date or time for cancelled reservation:', { customerName, dateStr, timeStr });
                continue;
              }
              const startDateTime = new Date(`${dateStr}T${parsedTime}:00Z`) // Parse as UTC
              if (isNaN(startDateTime.getTime())) {
                console.error(`Invalid date/time for cancelled reservation (parsed as NaN): ${dateStr} ${parsedTime}`)
                continue
              }
              const endDateTime = new Date(startDateTime.getTime() + eventDurationMs)
              
              const event: CalendarEvent = {
                 id: customerId,
                 title: customerName,
                 start: formatToLocalISO(startDateTime),
                 end: formatToLocalISO(endDateTime),
                 editable: false,
                 backgroundColor: "#e5e1e0",
                 borderColor: "#e5e1e0",
                 textColor: "#908584",
                 extendedProps: {
                   type,
                   cancelled: true
                 }
              }
              calendarEvents.push(event)
            } catch (error) {
              console.error('Error processing cancelled reservation for calendar event:', { customerName, dateStr, timeStr }, error)
              continue
            }
          }
        }
      }
    }
    
    // Add conversation events if in free roam mode (matching Python logic lines 413-452)
    if (freeRoam && conversationsData) {
      for (const [customerId, conversations] of Object.entries(conversationsData)) {
        if (Array.isArray(conversations) && conversations.length > 0) {
          // Check if there's a reservation for this ID (active or cancelled) to get customer name
          let customerName = null
          
          // First check in active reservations
          if (activeReservations[customerId]) {
            for (const reservation of activeReservations[customerId]) {
              if (reservation.customer_name) {
                customerName = reservation.customer_name
                break
              }
            }
          }
          
          // If not found, check in all customer data (matching Python logic)
          if (!customerName && allCustomerData[customerId]) {
            for (const reservation of allCustomerData[customerId]) {
              if (reservation.customer_name) {
                customerName = reservation.customer_name
                break
              }
            }
          }
          
          // Get the last conversation for timing (matching Python logic)
          const lastConversation = conversations[conversations.length - 1]
          const dateStr = lastConversation?.date
          const timeStr = lastConversation?.time
          
          if (!dateStr || !timeStr) {
            continue
          }
          
          try {
            // Parse the conversation datetime
            const parsedTime = parseTime(timeStr)
            const startDateTime = new Date(`${dateStr}T${parsedTime}:00Z`) // Parse as UTC
            
            // Validate the parsed date
            if (isNaN(startDateTime.getTime())) {
              console.error(`Invalid conversation date/time (parsed as NaN): ${dateStr} ${parsedTime}`)
              continue
            }
            
            // Calculate end time (same duration as reservations)
            const endDateTime = new Date(startDateTime.getTime() + eventDurationMs)
            
            // Create title based on customer name if available (matching Python get_message logic)
            const conversationTitle = `💬 ${customerName || customerId}`
            
            // Create conversation event (matching Python event structure)
            const conversationEvent: CalendarEvent = {
              id: customerId,
              title: conversationTitle,
              start: formatToLocalISO(startDateTime),
              end: formatToLocalISO(endDateTime),
              backgroundColor: "#EDAE49", // Exact color from Python implementation - yellow/orange
              borderColor: "#EDAE49",
              className: ['conversation-event'], // Matching Python classNames
              editable: false, // Conversations are not editable
              extendedProps: {
                type: 2, // Use type 2 for conversations (0 and 1 are for reservations)
                cancelled: false,
                displayTime: false // Hide time display for conversations
              }
            }
            
            calendarEvents.push(conversationEvent)
            
          } catch (error) {
            console.error('Error processing conversation for calendar event:', { customerId, dateStr, timeStr }, error)
            continue
          }
        }
      }
    }
    
    return calendarEvents
  }

  // Fetch reservations and conversations, generate events
  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        setLoading(true)
        // Fetch reservations (both future and past, including cancelled in free_roam mode)
        const reservationsData = await getReservations(false, freeRoam)
        
        // Fetch conversations if in free roam mode (matching Python implementation)
        let conversationsData: Record<string, any> = {}
        if (freeRoam) {
          try {
            const convResponse = await getConversations()
            conversationsData = convResponse || {}
          } catch (convError) {
            console.warn('Failed to fetch conversations:', convError)
          }
        }
        
        // Generate calendar events from reservations and conversations
        const calendarEvents = generateCalendarEvents(reservationsData, conversationsData)
        
        // Final validation: filter out any events with invalid dates
        const validEvents = calendarEvents.filter(event => {
          if (!event.start || !event.end) {
            console.warn('Event missing start/end date:', event)
            return false
          }
          
          const startDate = new Date(event.start)
          const endDate = new Date(event.end)
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn('Event has invalid dates:', event)
            return false
          }
          
          return true
        })
        
        setEvents(validEvents)
        
      } catch (error) {
        console.error('Error fetching calendar data:', error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchCalendarData()
  }, [freeRoam])

  // Refetch calendar events without page refresh
  const refetchEvents = async () => {
    try {
      // Fetch reservations
      const reservationsData = await getReservations(false, freeRoam)
      
      // Fetch conversations if in free roam mode
      let conversationsData: Record<string, any> = {}
      if (freeRoam) {
        try {
          const convResponse = await getConversations()
          conversationsData = convResponse || {}
        } catch (convError) {
          console.warn('Failed to fetch conversations during refetch:', convError)
        }
      }
      
      // Generate and set new calendar events
      const calendarEvents = generateCalendarEvents(reservationsData, conversationsData)
      const validEvents = calendarEvents.filter(event => {
        if (!event.start || !event.end) return false
        const startDate = new Date(event.start)
        const endDate = new Date(event.end)
        return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())
      })
      
      setEvents(validEvents)
      
    } catch (error) {
      console.error('Error refetching calendar data:', error)
    }
  }

  // Handle event drag and drop changes (matching Python eventChange logic)
  const handleEventChange = async (info: any) => {
    const event = info.event
    const oldEvent = info.oldEvent
    
    // Check if the new date falls within a vacation period
    const newDate = event.start
    const newDateString = newDate.toISOString().split('T')[0]
    
    // Check if dropping on a vacation period - silently revert like past dates
    if (isVacationDate(newDateString)) {
      // Silently revert the change - no toast (like past dates behavior)
      info.revert()
      return
    }
    
    // Parse the event start time exactly like Python does
    // Python: new_start_date = pd.to_datetime(event['start']).date()
    // Python: new_time = pd.to_datetime(event['start']).time()
    const eventStartString = event.start.toISOString ? event.start.toISOString() : event.start;
    const eventStartDate = new Date(eventStartString);
    
    // Extract date part (like Python's .date())
    const extractedDate = eventStartDate.toISOString().split('T')[0];
    
    // Extract time part and format like Python's strftime("%I:%M %p")
    // The Date object from FullCalendar already represents the correct visual time
    const timeOnlyDate = new Date(eventStartDate);
    const newTime = timeOnlyDate.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', // This matches Python's %I (hour without leading zero)
      minute: '2-digit' // This matches Python's %M
      // Removed timeZone parameter to avoid double conversion
    });
    
    const eventType = event.extendedProps.type || 0
    const customerName = event.title

    // Generate detailed change description
    const generateChangeDescription = () => {
      if (!oldEvent || !oldEvent.start) {
        return getMessage('reservation_changed', isRTL);
      }

      const oldDate = oldEvent.start.toISOString().split('T')[0];
      const oldTime = oldEvent.start.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: 'numeric',
        minute: '2-digit'
      });

      const newDate = event.start.toISOString().split('T')[0];
      const newTime = event.start.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: 'numeric',
        minute: '2-digit'
      });

      // Format dates for display
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      };

      const oldDateFormatted = formatDate(oldDate);
      const newDateFormatted = formatDate(newDate);

      // Check what changed
      const dateChanged = oldDate !== newDate;
      const timeChanged = oldTime !== newTime;

      if (isRTL) {
        if (dateChanged && timeChanged) {
          return `تم نقل ${customerName} من ${oldDateFormatted} ${oldTime} إلى ${newDateFormatted} ${newTime}`;
        } else if (dateChanged) {
          return `تم نقل ${customerName} من ${oldDateFormatted} إلى ${newDateFormatted}`;
        } else if (timeChanged) {
          return `تم نقل ${customerName} من ${oldTime} إلى ${newTime}`;
        } else {
          return `تم تحديث حجز ${customerName}`;
        }
      } else {
        if (dateChanged && timeChanged) {
          return `Moved ${customerName} from ${oldDateFormatted} ${oldTime} to ${newDateFormatted} ${newTime}`;
        } else if (dateChanged) {
          return `Moved ${customerName} from ${oldDateFormatted} to ${newDateFormatted}`;
        } else if (timeChanged) {
          return `Moved ${customerName} from ${oldTime} to ${newTime}`;
        } else {
          return `Updated ${customerName}'s reservation`;
        }
      }
    };
    
    try {
      // Call modifyReservation with only essential parameters for drag operations
      // Backend will handle approximation; we only need to change date/time
      const result = await modifyReservation({
        id: event.id,
        date: extractedDate,
        time: newTime,
        type: eventType, // Preserve the original reservation type
        approximate: true // Backend will handle the approximation
      })
      
      if (result.success) {
        toast({
          title: isRTL ? "تم تحديث الحجز" : "Reservation Updated",
          description: generateChangeDescription(),
          variant: "success",
          duration: 4000, // Slightly longer to read the detailed message
        })
        
        // Refetch calendar events after successful change
        await refetchEvents()
      } else {
        // Revert the change if backend update failed
        info.revert()
        toast({
          title: isRTL ? "فشل في التحديث" : "Update Failed",
          description: result.message || getMessage('system_error_try_later', isRTL),
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      // Revert the change on error
      info.revert()
      toast({
        title: isRTL ? "خطأ في الشبكة" : "Network Error",
        description: getMessage('system_error_try_later', isRTL),
        variant: "destructive",
        duration: 5000,
      })
      console.error('Error modifying reservation:', error)
    }
  }

  // Calendar callback handlers
  const callbackHandlers: CalendarCallbackHandlers = {
    onOpenDataEditor: (info) => {
      // Don't open editor if we're just changing hours (already handled)
      if (isChangingHours) {
        setIsChangingHours(false);
        return;
      }

      // Get the clicked/selected date/time
      let clickedDateTime: Date;
      let isTimeSlotClick = false; // True if a specific time slot in a day was clicked

      if ('date' in info) { // DateClickArg
        clickedDateTime = new Date(info.dateStr || info.date);
        isTimeSlotClick = info.dateStr.includes('T');
      } else { // DateSelectArg (range selection)
        clickedDateTime = new Date(info.startStr || info.start);
        isTimeSlotClick = info.startStr.includes('T');
      }

      const now = new Date();

      // Check if the selected time is in the past (REGARDLESS of freeRoam status)
      if (clickedDateTime < now) {
        toast({
          title: getMessage('cannot_select_past', isRTL),
          description: isRTL ? "لا يمكنك تحديد تاريخ أو وقت سابق." : "You cannot select a past date or time.",
          variant: "destructive",
          duration: 3000,
        });
        return; // Don't open the editor
      }
      
      // Check if the selected date falls within a vacation period - silently block like past dates
      const selectedDateString = clickedDateTime.toISOString().split('T')[0]
      if (isVacationDate(selectedDateString)) {
        return; // Silently block - no toast, no editor opening (like past dates)
      }
      
      // Proceed to set selectedDateRange and open the editor
      if ('start' in info && 'end' in info) {
        // Date range selection
        setSelectedDateRange({
          start: info.start.toISOString(),
          end: info.end.toISOString()
        });
      } else {
        // Single date click (info is DateClickArg)
        const ds = info.dateStr || info.date.toISOString();
        setSelectedDateRange({ start: ds, end: ds });
      }
      setEditorOpen(true);
      
      // Delay loading the heavy editor until after drawer starts opening
      setTimeout(() => setShouldLoadEditor(true), 50);
    },
    onDateClick: (info) => {
      // Optimize for month views - minimal operations
      if (currentView === 'multiMonthYear' || currentView === 'dayGridMonth') {
        // For month views, just update current date without expensive operations
        const clickedDate = info.date; // Use info.date directly
        setCurrentDate(clickedDate);
        return; // Skip slot time calculations and calendar API calls for month views
      }
      
      // Get clicked date - use info.date directly to avoid invalid date issues
      const clickedDate = info.date;
      
      // In free roam mode, slot times never change (always 00:00-24:00)
      // So we can skip slot time calculations and re-renders to prevent event flickering
      if (freeRoam) {
        setCurrentDate(clickedDate);
        return; // Skip all slot time logic and calendar navigation in free roam
      }
      
      const oldSlotTimes = getSlotTimes(currentDate, freeRoam, currentView);
      const newSlotTimes = getSlotTimes(clickedDate, freeRoam, currentView);
      
      // Check if slot times are changing
      const isTimeChange = 
        oldSlotTimes.slotMinTime !== newSlotTimes.slotMinTime || 
        oldSlotTimes.slotMaxTime !== newSlotTimes.slotMaxTime;
      
      // Set flag if we're just changing hours
      setIsChangingHours(isTimeChange);
      
      // Update current date and slot times
      setCurrentDate(clickedDate);
      setSlotTimes(newSlotTimes);
      
      // Only force re-render if slot times actually changed
      if (isTimeChange) {
        setSlotTimesKey(prev => prev + 1);
      }
      
      // Only navigate calendar view to clicked date when NOT in freeRoam and NOT in month views
      if (!freeRoam && calendarRef.current && currentView !== 'multiMonthYear' && currentView !== 'dayGridMonth') {
        // Defer calendar API calls to next frame to avoid blocking UI
        requestAnimationFrame(() => {
          const api = calendarRef.current?.getApi();
          if (api) {
            api.gotoDate(clickedDate);
            // If in timeGrid (week/day) view, select only the clicked time slot
            const viewType = api.view.type;
            if (viewType.includes('timeGrid')) {
              const slotEnd = new Date(clickedDate.getTime() + SLOT_DURATION_HOURS * 3600000);
              api.select({ start: clickedDate, end: slotEnd });
            }
          }
        });
      }
    },
    onSelect: (info) => {
      // Date range selection handled
    },
    onEventClick: (info) => {
      // TODO: Open conversation view
    },
    onEventChange: handleEventChange,
    onEventAdd: (info) => {
      // Event add is already handled in the callback
    },
    onEventRemove: (eventId) => {
      // Refresh events after removal
    }
  }

  // Create calendar callbacks
  const callbacks = createCalendarCallbacks(callbackHandlers, freeRoam, getTimezone(), currentDate)

  // Handle sidebar state changes with debouncing
  useEffect(() => {
    if (!calendarRef.current || !isHydrated) return; // Ensure component is interactive
    debouncedUpdateSize();
  }, [sidebarState, debouncedUpdateSize, isHydrated]);
  
  // Resize calendar when container size, language changes with debouncing
  useLayoutEffect(() => {
    if (!calendarRef.current || !containerRef.current || !isHydrated) return; // Ensure component is interactive
    
    // Initial sizing - immediate, no debounce
    calendarRef.current.getApi().updateSize();
    
    const resizeObserver = new ResizeObserver(() => {
      debouncedUpdateSize(); // Use debounced version here
    });
    resizeObserver.observe(containerRef.current);
    
    const handleWindowResize = () => debouncedUpdateSize(); // And here
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [isRTL, debouncedUpdateSize, isHydrated]); // Add isHydrated and debouncedUpdateSize

  // Context menu handlers
  const handleCancelReservation = async (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    try {
      const result = await cancelReservation({
        id: eventId,
        date: event.start.split('T')[0] // Extract date part
      })

      if (result.success) {
        toast({
          title: isRTL ? "تم إلغاء الحجز" : "Reservation Cancelled",
          description: isRTL ? `تم إلغاء حجز ${event.title} بنجاح` : `Successfully cancelled reservation for ${event.title}`,
          variant: "success",
          duration: 4000,
        })
        
        // Refetch calendar events after successful cancellation
        await refetchEvents()
      } else {
        toast({
          title: isRTL ? "فشل في إلغاء الحجز" : "Cancellation Failed",
          description: result.message || getMessage('system_error_try_later', isRTL),
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      toast({
        title: isRTL ? "خطأ في الشبكة" : "Network Error",
        description: getMessage('system_error_try_later', isRTL),
        variant: "destructive",
        duration: 5000,
      })
      console.error('Error cancelling reservation:', error)
    }
  }

  const handleEditReservation = (eventId: string) => {
    // Open the data table editor with the specific event
    const event = events.find(e => e.id === eventId)
    if (event) {
      setSelectedDateRange({
        start: event.start,
        end: event.end
      })
      setEditorOpen(true)
      setShouldLoadEditor(true)
    }
  }

  const handleViewDetails = (eventId: string) => {
    // For now, same as edit - could be expanded to a read-only view
    handleEditReservation(eventId)
  }

  const handleOpenConversation = (eventId: string) => {
    // TODO: Implement conversation opening logic
    toast({
      title: isRTL ? "قريباً" : "Coming Soon",
      description: isRTL ? "سيتم إضافة فتح المحادثات قريباً" : "Conversation view will be added soon",
      duration: 3000,
    })
  }

  // Context menu handlers
  const handleCloseContextMenu = () => {
    setContextMenuEvent(null)
    setContextMenuPosition(null)
  }

  if (loading || !isHydrated) {
    return <CalendarSkeleton />
  }

  return (
    <ErrorBoundary fallback={CalendarErrorFallback}>
      <div 
        ref={containerRef} 
        className={`w-full h-full min-h-[600px] ${getCalendarClassNames(currentView)}`}
        data-free-roam={freeRoam}
      >
        <FullCalendar
          key={slotTimesKey} // Force re-render when slot times change
          ref={calendarRef}
          plugins={[multiMonthPlugin, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={isHydrated ? currentView : initialView}
          initialDate={currentDate}
          height={calendarHeight}
          contentHeight={calendarHeight}
          events={events}
          
          // Header configuration (matching Python implementation)
          headerToolbar={{
            left: 'today prev,next',
            center: 'title',
            right: 'multiMonthYear,dayGridMonth,timeGridWeek,listMonth'
          }}
          
          // Enhanced calendar options (matching Python implementation)
          editable={true}
          selectable={true}
          unselectAuto={false} // Prevent auto unselect
          selectMirror={false} // Don't show a mirror when selecting
          selectMinDistance={0} // Allow selecting with minimal mouse movement
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
          
          // Business hours and constraints (matching Python implementation)
          businessHours={getBusinessHours(freeRoam)}
          eventConstraint={undefined} // Allow dragging events anywhere, let backend handle time slot adjustment
          selectConstraint={freeRoam ? undefined : "businessHours"}
          hiddenDays={freeRoam ? [] : [5]} // Hide Friday unless in free roam
          
          // Valid range for navigation (matching Python validRange logic)
          // Only apply validRange when NOT in free roam AND NOT in multiMonthYear view
          {...(!freeRoam && viewRef.current !== 'multiMonthYear' && currentView !== 'multiMonthYear' && initialView !== 'multiMonthYear' ? { validRange: getValidRange(freeRoam, currentView) } : {})}
          
          // Dynamic slot times based on clicked date
          slotMinTime={slotTimes.slotMinTime}
          slotMaxTime={slotTimes.slotMaxTime}
          
          // Localization (matching Python implementation)
          locale={isRTL ? arLocale : "en"}
          direction={isRTL ? "rtl" : "ltr"}
          buttonText={getButtonText(isRTL)}
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
          
          // Styling
          eventClassNames="rounded px-1 text-xs"
          dayCellClassNames={(arg) => {
            const cellDate = arg.date;
            // Use local date string comparison to avoid timezone issues
            const currentDateStr = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            const cellDateStr = new Date(cellDate.getTime() - cellDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            
            // Check if this date is a vacation period using memoized function
            if (isVacationDate(cellDateStr)) {
              return 'vacation-day cursor-not-allowed'
            }
            
            if (cellDateStr === currentDateStr) {
              return 'selected-date-cell'; // Remove conflicting Tailwind classes, let CSS handle styling
            }
            return 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer';
          }}
          // Also apply vacation classes to slot labels and column headers for timeGrid
          slotLabelClassNames={(arg) => {
            // For timeGrid views, check if any day in this time slot is a vacation day
            return '';
          }}
          dayHeaderClassNames={(arg) => {
            const cellDate = arg.date;
            const cellDateStr = cellDate.toISOString().split('T')[0];
            
            // Check if this date is a vacation period using memoized function
            if (isVacationDate(cellDateStr)) {
              return 'vacation-day cursor-not-allowed'
            }
            
            return '';
          }}
          viewClassNames="bg-white dark:bg-gray-900 rounded-lg shadow-sm"
          
          // Event callbacks (matching Python implementation)
          dateClick={callbacks.dateClick}
          select={callbacks.select}
          eventClick={callbacks.eventClick}
          eventChange={callbacks.eventChange}
          viewDidMount={(info) => {
            // Save view changes to localStorage and update ref immediately
            if (isHydrated && info.view.type !== currentView) {
              viewRef.current = info.view.type;
              setCurrentView(info.view.type);
            }
            
            // Single updateSize call after a short delay for view stabilization
            // This is simpler and less aggressive than per-frame updates.
            setTimeout(() => calendarRef.current?.getApi().updateSize(), 250); 
          }}
          eventDidMount={(info) => {
            // Add data attributes for proper styling in all views
            const event = info.event
            const el = info.el
            
            // Add data-cancelled attribute for cancelled events
            if (event.extendedProps.cancelled) {
              el.setAttribute('data-cancelled', 'true')
            }
            
            // Add conversation event class
            if (event.extendedProps.type === 2) {
              el.classList.add('conversation-event')
            }
            
            // Add reservation type class for follow-up reservations (needed for list view dots)
            if (event.extendedProps.type === 1) {
              el.classList.add('reservation-type-1')
            }
            
            // Add context menu functionality
            const handleContextMenu = (e: MouseEvent) => {
              e.preventDefault()
              e.stopPropagation()
              
              // Convert FullCalendar event to our CalendarEvent type
              const calendarEvent: CalendarEvent = {
                id: event.id,
                title: event.title,
                start: event.startStr,
                end: event.endStr || event.startStr,
                backgroundColor: event.backgroundColor || '',
                borderColor: event.borderColor || '',
                editable: true, // We'll check editability in the context menu component
                extendedProps: {
                  type: event.extendedProps?.type || 0,
                  cancelled: event.extendedProps?.cancelled || false,
                  ...event.extendedProps
                }
              }
              
              setContextMenuEvent(calendarEvent)
              setContextMenuPosition({ x: e.clientX, y: e.clientY })
            }
            
            // Add right-click listener
            el.addEventListener('contextmenu', handleContextMenu)
            
            // Note: FullCalendar handles cleanup when the event is removed/updated
          }}
          datesSet={(info) => {
            // Update current view immediately when view changes (before rendering)
            if (isHydrated && info.view.type !== currentView) {
              viewRef.current = info.view.type;
              setCurrentView(info.view.type);
            }
            // Single updateSize call after a short delay
            setTimeout(() => calendarRef.current?.getApi().updateSize(), 250);
          }}
          // Add more specific time grid options for week view
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: true,
            meridiem: 'short'
          }}
          slotLabelInterval={{ hours: 1 }}
        />
      </div>
      
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
            // Reset loading state when closing for optimal performance on next open
            setShouldLoadEditor(false);
          }
        }}
        slotDurationHours={SLOT_DURATION_HOURS}
        freeRoam={freeRoam}
        events={shouldLoadEditor ? events.map(event => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          type: event.extendedProps?.type === 2 ? "conversation" : "reservation",
          extendedProps: {
            customerName: event.title,
            phone: "",
            description: "",
            status: event.extendedProps?.cancelled ? "cancelled" : "active",
            type: event.extendedProps?.type || 0,
            cancelled: event.extendedProps?.cancelled || false
          }
        })) : []}
        selectedDateRange={selectedDateRange}
        isRTL={isRTL}
        onSave={(updatedEvents) => {
          // Create a unique event identifier function for deduplication
          const createEventKey = (evt: any) => {
            const dateTime = evt.start.split('T')[0] + (evt.start.split('T')[1]?.substring(0, 5) || '');
            return `${evt.id}_${dateTime}_${typeof evt.extendedProps?.type === 'number' ? evt.extendedProps.type : 0}`;
          };
          
          // Convert updatedEvents to calendar event format
          const converted = updatedEvents.map(event => ({
            id: event.id,
            title: event.extendedProps.customerName || event.title,
            start: event.start,
            end: event.end || event.start,
            backgroundColor: event.extendedProps.type === 1 ? "#3688d8" : "#4caf50",
            borderColor: event.extendedProps.type === 1 ? "#3688d8" : "#4caf50",
            extendedProps: {
              type: event.extendedProps.type || 0,
              cancelled: event.extendedProps.status === "cancelled" || event.extendedProps.cancelled
            }
          }));
          
          // Filter out events that are in the selected date/time range
          // to avoid duplicates when merging with updated events
          const eventsOutsideRange = events.filter(evt => {
            if (!selectedDateRange) return true;
            
            const eventStart = new Date(evt.start);
            
            // Handle time-specific selection
            if (selectedDateRange.start.includes('T')) {
              const rangeStart = new Date(selectedDateRange.start);
              const rangeEnd = selectedDateRange.end ? 
                new Date(selectedDateRange.end) : 
                new Date(rangeStart.getTime() + SLOT_DURATION_HOURS * 3600000);
              
              return !(eventStart >= rangeStart && eventStart < rangeEnd);
            } 
            // Handle date-only selection
            else {
              const eventDate = evt.start.split('T')[0];
              const rangeStartDate = selectedDateRange.start;
              const rangeEndDate = selectedDateRange.end || selectedDateRange.start;
              
              return !(eventDate >= rangeStartDate && eventDate <= rangeEndDate);
            }
          });
          
          // Create a set of existing event keys for deduplication
          const existingEventKeys = new Set(eventsOutsideRange.map(createEventKey));
          
          // Filter out any converted events that would duplicate with existing events
          const uniqueConverted = converted.filter(evt => !existingEventKeys.has(createEventKey(evt)));
          
          // Set the merged events without duplicates
          setEvents([...eventsOutsideRange, ...uniqueConverted]);
        }}
        onEventClick={(event) => {
          // Event click in table handled
        }}
      />
    </ErrorBoundary>
  )
} 