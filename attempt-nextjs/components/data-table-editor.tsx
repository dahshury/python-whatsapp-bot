"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { DataEditor, GridCellKind, GridColumn, Item, TextCell, EditableGridCell } from "@glideapps/glide-data-grid"
import "@glideapps/glide-data-grid/dist/index.css"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "./table-skeleton"

interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  type: "reservation" | "conversation" | "cancellation"
  extendedProps: {
    description?: string
    customerName?: string
    phone?: string
    status?: string
    type?: number // 0 for check-up, 1 for follow-up, 2 for conversation
    cancelled?: boolean
  }
}

interface DataTableEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: CalendarEvent[]
  selectedDateRange: { start: string; end: string } | null
  isRTL: boolean
  slotDurationHours: number
  onSave: (events: CalendarEvent[]) => void
  onEventClick: (event: CalendarEvent) => void
  freeRoam?: boolean
}

export function DataTableEditor({
  open,
  onOpenChange,
  events,
  selectedDateRange,
  isRTL,
  slotDurationHours,
  onSave,
  onEventClick,
  freeRoam = false,
}: DataTableEditorProps) {
  const [editingEvents, setEditingEvents] = useState<CalendarEvent[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { theme } = useTheme()
  const [gridKey, setGridKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Dynamic grid and dialog height based on row count
  const [gridHeight, setGridHeight] = useState(300)
  useEffect(() => {
    const rowHeight = 35 // px per row
    const headerHeight = 60 // px for DataEditor header row
    
    let calculatedHeight;
    if (editingEvents.length === 0) {
      // Height for header + single trailing row if no data
      calculatedHeight = headerHeight + rowHeight 
    } else {
      // Height for header + data rows
      calculatedHeight = editingEvents.length * rowHeight + headerHeight
    }
    
    // Cap at 80% of viewport height
    const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.8 : calculatedHeight
    setGridHeight(Math.min(calculatedHeight, maxHeight))
  }, [editingEvents])

  // Create a unique ID for each event that includes all relevant data to deduplicate
  const createUniqueEventId = (event: CalendarEvent) => {
    // Include id, date, time, and type in the unique key
    const dateTime = event.start.split('T')[0] + (event.start.split('T')[1] || '');
    return `${event.id}_${dateTime}_${event.extendedProps.type || 0}`;
  };

  // Use memoization to prevent unnecessary filtering and re-renders
  const filteredEvents = useMemo(() => {
    if (!selectedDateRange || !events.length) return [];
    
    return events.filter((event) => {
      // Only include reservations (excluding conversations)
      if (event.type === "conversation") {
        return false;
      }
      
      // Only include active reservations and cancelled ones in free roam
      if (event.extendedProps.cancelled && !freeRoam) {
        return false;
      }
      
      const eventStart = new Date(event.start);
      
      // Handle different selection types
      if (selectedDateRange.start.includes("T")) {
        // Time-specific selection
        const rangeStart = new Date(selectedDateRange.start);
        const rangeEnd = new Date(selectedDateRange.end || selectedDateRange.start);
        
        // Add slot duration if end time is the same as start time
        if (rangeStart.getTime() === rangeEnd.getTime()) {
          rangeEnd.setHours(rangeEnd.getHours() + slotDurationHours);
        }
        
        return eventStart >= rangeStart && eventStart < rangeEnd;
      } else {
        // Full day selection
        const rangeStartDay = new Date(selectedDateRange.start);
        rangeStartDay.setHours(0, 0, 0, 0);
        
        let rangeEndDay;
        if (selectedDateRange.end && selectedDateRange.end !== selectedDateRange.start) {
          // Date range
          rangeEndDay = new Date(selectedDateRange.end);
          rangeEndDay.setHours(23, 59, 59, 999);
        } else {
          // Single day
          rangeEndDay = new Date(rangeStartDay);
          rangeEndDay.setHours(23, 59, 59, 999);
        }
        
        return eventStart >= rangeStartDay && eventStart <= rangeEndDay;
      }
    }).sort((a, b) => {
      // Sort by date and time
      const dateA = new Date(a.start);
      const dateB = new Date(b.start);
      
      // First sort by date
      if (dateA.toDateString() !== dateB.toDateString()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Then by time
      return dateA.getTime() - dateB.getTime();
    });
  }, [events, selectedDateRange, slotDurationHours, freeRoam]);

  // Update editing events whenever filtered events change
  useEffect(() => {
    setIsLoading(true)
    setEditingEvents(filteredEvents)
    setGridKey(prevKey => prevKey + 1)
    setIsDirty(false)
    
    // Simulate a small delay to show the skeleton, then hide loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [filteredEvents])

  // Set loading state when drawer opens
  useEffect(() => {
    if (open) {
      setIsLoading(true)
    }
  }, [open])

  const handleAddEvent = () => {
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: "New Event",
      start: selectedDateRange?.start ? `${selectedDateRange.start}T09:00:00` : new Date().toISOString(),
      type: "reservation",
      extendedProps: {
        customerName: "",
        phone: "",
        description: "",
        status: "pending",
        type: 0, // Default to check-up (0)
        cancelled: false
      },
    }
    setEditingEvents((prev) => [...prev, newEvent])
    setIsDirty(true)
  }

  const handleEditEvent = (id: string, field: string, value: string) => {
    setEditingEvents((prev) =>
      prev.map((event) => {
        if (event.id === id) {
          if (field.startsWith("extendedProps.")) {
            const propName = field.replace("extendedProps.", "")
            return {
              ...event,
              extendedProps: {
                ...event.extendedProps,
                [propName]: value,
              },
            }
          }
          if (field === "eventDate") {
            const time = new Date(event.start).toTimeString().slice(0, 8)
            return { ...event, start: `${value}T${time}` }
          }
          if (field === "eventTime") {
            const date = new Date(event.start).toISOString().split("T")[0]
            return { ...event, start: `${date}T${value}:00` }
          }
          return { ...event, [field]: value }
        }
        return event
      }),
    )
    setIsDirty(true)
  }

  const formatDateRange = () => {
    if (!selectedDateRange) return ""

    const formatOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...(isRTL && { calendar: "islamic" }),
    };

    const startDate = new Date(selectedDateRange.start);

    if (selectedDateRange.start.includes("T")) {
      // Single slot selection
      const startTimeFormatted = startDate.toLocaleTimeString(isRTL ? "ar-SA" : "en-US", {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        ...(isRTL && { calendar: "islamic" }),
      });
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + slotDurationHours);
      const endTimeFormatted = endDate.toLocaleTimeString(isRTL ? "ar-SA" : "en-US", {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      ...(isRTL && { calendar: "islamic" }),
      });
      const dayFormatted = startDate.toLocaleDateString(isRTL ? "ar-SA" : "en-US", formatOptions);
      return `${dayFormatted}, ${startTimeFormatted} - ${endTimeFormatted}`;
    } else {
      // Date or date range selection
      const startDateFormatted = startDate.toLocaleDateString(isRTL ? "ar-SA" : "en-US", formatOptions);
      const endDate = new Date(selectedDateRange.end);
      const endDateFormatted = endDate.toLocaleDateString(isRTL ? "ar-SA" : "en-US", formatOptions);
      
      if (selectedDateRange.start.split('T')[0] === selectedDateRange.end.split('T')[0]) {
        return startDateFormatted; // Single day
      } else {
        return `${startDateFormatted} - ${endDateFormatted}`; // Date range
      }
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      if (isDirty) {
        // When closing, if data has changed, prepare and save it.
        
        // 1. Filter out events that are not within the currently edited date range.
        const otherEvents = events.filter((event) => {
          if (!selectedDateRange) return true;
          
          const eventStart = new Date(event.start);
          
          if (selectedDateRange.start.includes("T")) {
            // This is a time-based selection
            const rangeStart = new Date(selectedDateRange.start);
            const rangeEnd = new Date(selectedDateRange.end || selectedDateRange.start);
            
            if (rangeStart.getTime() === rangeEnd.getTime()) {
              const extendedEnd = new Date(rangeStart);
              extendedEnd.setHours(rangeStart.getHours() + slotDurationHours);
              return eventStart < rangeStart || eventStart >= extendedEnd;
            }
            return eventStart < rangeStart || eventStart >= rangeEnd;
          } else {
            // This is a full-day or day-range selection
            const rangeStartDay = new Date(selectedDateRange.start);
            rangeStartDay.setHours(0, 0, 0, 0);
            
            const rangeEndDay = new Date(selectedDateRange.end || selectedDateRange.start);
            rangeEndDay.setHours(23, 59, 59, 999);
            
            return eventStart < rangeStartDay || eventStart > rangeEndDay;
          }
        });
        
        // 2. Combine the other events with the events that were edited.
        // The edited events replace the original ones from that date range.
        const finalEvents = [...otherEvents, ...editingEvents];
        
        onSave(finalEvents);
      }
    }
    onOpenChange(open);
  }

  // Track container width for responsive columns
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    // Set initial width
    updateWidth();
    
    // Set up resize observer to update width when container resizes
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [open]);

  // Define grid columns for Glide Data Grid with proportional widths
  const getColumns = (): GridColumn[] => {
    // Fallback to a default width if container width not yet measured
    const totalWidth = (containerWidth && containerWidth > 0)
      ? containerWidth
      : (typeof window !== 'undefined' ? window.innerWidth * 0.8 : 600);
    // Calculate total available width (subtract some padding for safety)
    const availableWidth = Math.max(totalWidth - 60, 300);

    // Define column proportions (must add up to 1)
    const proportions = [0.2, 0.2, 0.25, 0.2, 0.15];

    return [
      { 
        title: isRTL ? "التاريخ الميلادي" : "Date", 
        width: availableWidth * proportions[0],
        grow: 1
      },
      { 
        title: isRTL ? "الوقت" : "Time", 
        width: availableWidth * proportions[1],
        grow: 1
      },
      { 
        title: isRTL ? "رقم الهاتف" : "Phone Number", 
        width: availableWidth * proportions[2],
        grow: 1
      },
      { 
        title: isRTL ? "نوع الحجز" : "Reservation type", 
        width: availableWidth * proportions[3],
        grow: 1
      },
      { 
        title: isRTL ? "الاسم" : "Name", 
        width: availableWidth * proportions[4],
        grow: 1
      }
    ];
  };

  // Provide cell content for each cell, matching Python implementation order
  const getCellContent = (cell: Item): TextCell => {
    const [col, row] = cell
    const event = editingEvents[row]
    const emptyCell: TextCell = { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: true }
    if (!event) return emptyCell
    
    switch (col) {
      case 0: // Date
        const dateStr = new Date(event.start).toISOString().split("T")[0]
        return { kind: GridCellKind.Text, data: dateStr, displayData: dateStr, allowOverlay: true }
      case 1: // Time
        const timeStr = new Date(event.start).toTimeString().slice(0, 5)
        return { kind: GridCellKind.Text, data: timeStr, displayData: timeStr, allowOverlay: true }
      case 2: // Phone
        return { kind: GridCellKind.Text, data: event.id || "", displayData: event.id || "", allowOverlay: true }
      case 3: // Type
        // Map event type number to text with proper localization
        const typeValue = event.extendedProps.type || 0
        const typeText = typeValue === 0 ? (isRTL ? "كشف" : "Check-up") : (isRTL ? "مراجعة" : "Follow-up")
        return { kind: GridCellKind.Text, data: typeText, displayData: typeText, allowOverlay: true }
      case 4: // Name
        return { kind: GridCellKind.Text, data: event.extendedProps.customerName || "", displayData: event.extendedProps.customerName || "", allowOverlay: true }
      default:
        return emptyCell
    }
  }

  // Handle cell edits and update events
  const onCellEdited = (cell: Item, newValue: EditableGridCell) => {
    const [col, row] = cell
    const event = editingEvents[row]
    const column = getColumns()[col]

    if (newValue.kind !== "text") return

    handleEditEvent(event.id, column.id ?? "", newValue.data)
  }

  // Row append handler matching Python's new event creation
  const onRowAppended = () => {
    handleAddEvent()
  }

  // Adaptive theme for dark/light mode
  const gridTheme = {
    accentColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
    accentFg: '#ffffff',
    accentLight: theme === 'dark' ? '#1e40af' : '#dbeafe',
    textDark: theme === 'dark' ? '#f8fafc' : '#1e293b',
    textMedium: theme === 'dark' ? '#cbd5e1' : '#64748b',
    textLight: theme === 'dark' ? '#94a3b8' : '#94a3b8',
    textBubble: theme === 'dark' ? '#f8fafc' : '#1e293b',
    bgIconHeader: theme === 'dark' ? '#374151' : '#f1f5f9',
    fgIconHeader: theme === 'dark' ? '#d1d5db' : '#64748b',
    textHeader: theme === 'dark' ? '#f9fafb' : '#374151',
    textGroupHeader: theme === 'dark' ? '#e5e7eb' : '#4b5563',
    textHeaderSelected: theme === 'dark' ? '#ffffff' : '#000000',
    bgCell: theme === 'dark' ? '#1f2937' : '#ffffff',
    bgCellMedium: theme === 'dark' ? '#374151' : '#f8fafc',
    bgHeader: theme === 'dark' ? '#111827' : '#f8fafc',
    bgHeaderHasFocus: theme === 'dark' ? '#1f2937' : '#f1f5f9',
    bgHeaderHovered: theme === 'dark' ? '#374151' : '#e2e8f0',
    bgBubble: theme === 'dark' ? '#374151' : '#f1f5f9',
    bgBubbleSelected: theme === 'dark' ? '#1e40af' : '#3b82f6',
    bgSearchResult: theme === 'dark' ? '#fbbf24' : '#fcd34d',
    borderColor: theme === 'dark' ? '#374151' : '#e2e8f0',
    drilldownBorder: theme === 'dark' ? '#6b7280' : '#9ca3af',
    linkColor: theme === 'dark' ? '#60a5fa' : '#3b82f6',
    headerFontStyle: '600 13px',
    baseFontStyle: '13px',
    fontFamily: 'Inter, Roboto, -apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Ubuntu, noto, arial, sans-serif',
  }

  // Trailing row options for the plus sign
  const trailingRowOptions = {
    tint: true,
    sticky: true,
    hint: "", // Remove the "click to add" text
    themeOverride: {
      bgCell: theme === 'dark' ? '#374151' : '#f8fafc',
      textMedium: theme === 'dark' ? '#9ca3af' : '#6b7280',
      borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[95vh] flex flex-col p-4" style={{ height: `${Math.min(gridHeight + 200, typeof window !== 'undefined' ? window.innerHeight * 0.95 : 800)}px` }}>
        <DrawerHeader className="px-0 pb-4">
          <DrawerTitle className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            {isRTL ? "محرر البيانات" : "Data Editor"} - {formatDateRange()}
            <span className="text-sm font-normal text-muted-foreground">
              ({editingEvents.length} {isRTL ? "أحداث" : "events"})
            </span>
          </DrawerTitle>
          <DrawerDescription>
            {isRTL ? "تحرير أحداث التقويم للفترة المحددة" : "Edit calendar events for the selected date range"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Events Grid */}
          <div ref={containerRef} className="border rounded-lg overflow-hidden flex-1">
            {isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={6} columns={5} className="min-h-[300px]" />
              </div>
            ) : (
              <DataEditor
                key={gridKey}
                getCellContent={getCellContent}
                columns={getColumns()}
                rows={editingEvents.length}
                onCellEdited={onCellEdited}
                onRowAppended={onRowAppended}
                trailingRowOptions={trailingRowOptions}
                width="100%"
                height={gridHeight}
                rowMarkers="checkbox"
                theme={gridTheme}
                smoothScrollX
                smoothScrollY
                scaleToRem={true}
                experimental={{
                  // Enable features to improve auto-sizing behavior
                  disableMinimumCellWidth: true,
                  paddingRight: 0
                }}
                fillHandle={false}
              />
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

