"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { X, Save } from "lucide-react"
import { TableSkeleton } from "./table-skeleton"
import dynamic from "next/dynamic"
import { FullscreenProvider } from "./glide_custom_cells/components/contexts/FullscreenContext"
import { useTheme } from "next-themes"
import { createGlideTheme } from "./glide_custom_cells/components/utils/streamlitGlideTheme"
import React from "react"
import { InMemoryDataSource } from "./glide_custom_cells/components/core/data-sources/InMemoryDataSource"
import { IColumnDefinition, ColumnDataType } from "./glide_custom_cells/components/core/interfaces/IDataSource"
import { useSettings } from "@/lib/settings-context"
import { toast } from "sonner"
import { reserveTimeSlot, cancelReservation, modifyReservation, modifyCustomerId, undoCancelReservation, undoCreateReservation, undoModifyReservation, getMessage } from "@/lib/api"
import { DataProvider } from "./glide_custom_cells/components/core/services/DataProvider"
import { Button } from "@/components/ui/button"
import { ColumnTypeRegistry } from "./glide_custom_cells/components/core/services/ColumnTypeRegistry"
import { formatDateRangeWithHijri } from "@/lib/hijri-utils"

const Grid = dynamic(() => import("./glide_custom_cells/components/Grid"), { 
  ssr: false,
  loading: () => <TableSkeleton rows={6} columns={5} className="min-h-[300px]" />
})

interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  type: "reservation" | "conversation" | "cancellation"
  extendedProps?: {
    description?: string
    customerName?: string
    phone?: string
    status?: string
    type?: number
    cancelled?: boolean
    reservationId?: number
  }
}

interface ReservationData {
  id?: number
  date: string
  time: string
  phone: string
  type: number
  name: string
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
  data: ReservationData[]
  onDataChange?: (data: ReservationData[]) => void
  language?: 'en' | 'ar'
  calendarRef?: React.RefObject<any>
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
  data = [],
  onDataChange,
  language = 'en',
  calendarRef
}: DataTableEditorProps) {
  const [isGridReady, setIsGridReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [canSave, setCanSave] = useState(false)
  const { theme: appTheme } = useTheme()
  const { theme: styleTheme } = useSettings()
  const isDarkMode = appTheme === 'dark'
  
  // Store a reference to the data source
  const [currentDataSource, setCurrentDataSource] = useState<InMemoryDataSource | null>(null)
  const [preservedDataSource, setPreservedDataSource] = useState<InMemoryDataSource | null>(null)
  
  // Store a reference to the data provider to get editing state
  const dataProviderRef = useRef<DataProvider | null>(null)
  
  // Store mapping between grid row indices and original events
  const gridRowToEventMapRef = useRef<Map<number, CalendarEvent>>(new Map())
  
  // Force grid to re-render when theme changes by using a key
  const [themeKey, setThemeKey] = useState(0)
  
  // Update theme key when theme changes
  React.useEffect(() => {
    // Small delay to ensure CSS variables are updated
    const timer = setTimeout(() => {
      setThemeKey(prev => prev + 1)
    }, 50)
    return () => clearTimeout(timer)
  }, [appTheme, styleTheme])
  
  // Re-create theme when either light/dark mode or style theme changes
  const gridTheme = React.useMemo(() => createGlideTheme(isDarkMode ? 'dark' : 'light'), [isDarkMode, styleTheme, themeKey])

  // Create data source from events
  const dataSource = React.useMemo(() => {
    // If dialog is closing and we have a preserved data source, use it
    if (!open && preservedDataSource) {
      return preservedDataSource
    }
    
    let filteredReservations: ReservationData[] = []
    
    // Debug: Log initial events

    
    if (selectedDateRange && events.length > 0) {
      const filteredEvents = events.filter((event) => {
        // Only include reservations (excluding conversations)
        if (event.type === "conversation") {
          return false;
        }
        
        // Only include active reservations and cancelled ones in free roam
        if (event.extendedProps?.cancelled && !freeRoam) {
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
      });

      // Convert filtered events to ReservationData format with event mapping
      const mappedData = filteredEvents.map(event => {
        const eventDate = new Date(event.start);
        // Format the WhatsApp ID as a phone number (add + prefix if not present)
        let phoneNumber = event.id;
        if (phoneNumber && !phoneNumber.startsWith('+')) {
          phoneNumber = '+' + phoneNumber;
        }
        
        return {
          reservation: {
            id: event.extendedProps?.reservationId || 0,
            date: eventDate.toISOString().split('T')[0],
            time: eventDate.toTimeString().slice(0, 5),
            phone: phoneNumber, // Use formatted phone number
            type: event.extendedProps?.type || 0,
            name: event.title || event.extendedProps?.customerName || ""
          },
          originalEvent: event
        };
      });
      
      // Sort the mapped data
      mappedData.sort((a, b) => {
        // Sort by date and time
        const dateA = new Date(a.reservation.date + 'T' + a.reservation.time);
        const dateB = new Date(b.reservation.date + 'T' + b.reservation.time);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Create the event mapping and extract reservations
      const newEventMap = new Map<number, CalendarEvent>();
      filteredReservations = mappedData.map((data, index) => {
        newEventMap.set(index, data.originalEvent);
        return data.reservation;
      });
      
      // Store the mapping in the ref
      gridRowToEventMapRef.current = newEventMap;
    }

    // Define columns for reservation data
    const columns: IColumnDefinition[] = [
      {
        id: "date",
        name: isRTL ? "التاريخ" : "Date",
        title: isRTL ? "التاريخ" : "Date",
        dataType: ColumnDataType.DATE,
        isEditable: true,
        isRequired: true,
        formatting: {
          pattern: "YYYY-MM-DD"
        },
        metadata: {
          freeRoam: freeRoam
        },
        defaultValue: selectedDateRange ? new Date(selectedDateRange.start.split('T')[0]) : new Date()
      },
      {
        id: "time",
        name: isRTL ? "الوقت" : "Time",
        title: isRTL ? "الوقت" : "Time",
        dataType: ColumnDataType.TIME,
        isEditable: true,
        isRequired: true,
        metadata: {
          freeRoam: freeRoam
        },
        defaultValue: (() => {
          if (selectedDateRange?.start.includes('T')) {
            // Extract time from selectedDateRange
            const dateTime = new Date(selectedDateRange.start)
            const hours = dateTime.getHours().toString().padStart(2, '0')
            const minutes = dateTime.getMinutes().toString().padStart(2, '0')
            return `${hours}:${minutes}`
          } else {
            // Check if the selected date is in Ramadan
            const selectedDate = selectedDateRange ? new Date(selectedDateRange.start.split('T')[0]) : new Date()
            const year = selectedDate.getFullYear()
            
            // Ramadan dates for years 2022-2031 (matching Python implementation)
            const ramadanDates: Record<number, { start: string; end: string }> = {
              2022: { start: '2022-04-02', end: '2022-05-01' },
              2023: { start: '2023-03-23', end: '2023-04-21' },
              2024: { start: '2024-03-11', end: '2024-04-09' },
              2025: { start: '2025-03-01', end: '2025-03-29' },
              2026: { start: '2026-02-18', end: '2026-03-19' },
              2027: { start: '2027-02-08', end: '2027-03-09' },
              2028: { start: '2028-01-28', end: '2028-02-26' },
              2029: { start: '2029-01-16', end: '2029-02-14' },
              2030: { start: '2030-01-06', end: '2030-02-04' },
              2031: { start: '2030-12-26', end: '2031-01-24' }
            }
            
            // Check if date is in Ramadan
            const ramadanPeriod = ramadanDates[year]
            if (ramadanPeriod) {
              const checkDate = selectedDate.toISOString().split('T')[0]
              const isRamadan = checkDate >= ramadanPeriod.start && checkDate <= ramadanPeriod.end
              return isRamadan ? "10:00 AM" : "11:00 AM"
            }
            
            // Default to 11:00 AM if year not in range
            return "11:00 AM"
          }
        })()
      },
      {
        id: "phone",
        name: isRTL ? "رقم الهاتف" : "Phone",
        title: isRTL ? "رقم الهاتف" : "Phone",
        dataType: ColumnDataType.PHONE,
        isEditable: true,
        isRequired: true,
        width: 150,
        defaultValue: "" // Empty phone number by default
      },
      {
        id: "type",
        name: isRTL ? "نوع الحجز" : "Type",
        title: isRTL ? "نوع الحجز" : "Reservation Type",
        dataType: ColumnDataType.DROPDOWN,
        isEditable: true,
        isRequired: true,
        metadata: {
          options: isRTL 
            ? ["كشف", "مراجعة"] 
            : ["Check-up", "Follow-up"]
        },
        defaultValue: isRTL ? "كشف" : "Check-up" // Default to check-up
      },
      {
        id: "name",
        name: isRTL ? "الاسم" : "Name",
        title: isRTL ? "الاسم" : "Customer Name",
        dataType: ColumnDataType.TEXT,
        isEditable: true,
        isRequired: true,
        defaultValue: "" // Empty name by default
      }
    ]
    
    // Convert data to the format expected by InMemoryDataSource
    const gridData: any[][] = filteredReservations.map(reservation => [
      reservation.date,
      reservation.time,
      reservation.phone,
      isRTL 
        ? (reservation.type === 0 ? "كشف" : "مراجعة")
        : (reservation.type === 0 ? "Check-up" : "Follow-up"),
      reservation.name
    ])

    // Create default row with column default values
    const defaultRow = columns.map(col => {
      const columnType = ColumnTypeRegistry.getInstance().get(col.dataType);
      return columnType ? columnType.getDefaultValue(col) : "";
    });

    const dataSource = new InMemoryDataSource(
      Math.max(filteredReservations.length, 1), // At least 1 row for better UX
      5, // 5 columns
      columns,
      filteredReservations.length > 0 ? gridData : [defaultRow] // Use default values instead of empty strings
    )
    
    // Store the data source reference
    setCurrentDataSource(dataSource)
    
    // Preserve the data source when dialog is open
    if (open) {
      setPreservedDataSource(dataSource)
    }
    
    return dataSource
  }, [events, selectedDateRange, slotDurationHours, freeRoam, isRTL, open])

  const formatDateRange = () => {
    if (!selectedDateRange) return ""
    
    const startDate = new Date(selectedDateRange.start)
    const endDate = selectedDateRange.end ? new Date(selectedDateRange.end) : null
    
    // Check if we have time information (when the dateClick includes 'T' in the ISO string)
    const hasTimeInfo = selectedDateRange.start.includes('T')
    
    // Use Hijri format for RTL
    if (isRTL) {
      let computedEnd: Date | undefined = undefined
      if (hasTimeInfo && (!endDate || endDate.getTime() === startDate.getTime())) {
        // Compute end time by adding slotDurationHours
        computedEnd = new Date(startDate.getTime() + slotDurationHours * 60 * 60 * 1000)
      } else {
        computedEnd = endDate || undefined
      }
      
      return formatDateRangeWithHijri(startDate, isRTL, computedEnd, { 
        includeTime: hasTimeInfo,
        includeGregorian: false 
      })
    }
    
    // Non-RTL formatting
    if (hasTimeInfo) {
      // Format with time
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }
      const dateOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
      
      const startDateStr = startDate.toLocaleDateString(undefined, dateOptions)
      const startTimeStr = startDate.toLocaleTimeString(undefined, timeOptions)
      
      let computedEnd: Date | null = null
      if (endDate && endDate.getTime() !== startDate.getTime()) {
        computedEnd = endDate
      } else {
        // Compute end time by adding slotDurationHours
        computedEnd = new Date(startDate.getTime() + slotDurationHours * 60 * 60 * 1000)
      }
      
      const endDateStr = computedEnd.toLocaleDateString(undefined, dateOptions)
      const endTimeStr = computedEnd.toLocaleTimeString(undefined, timeOptions)
      
      if (startDateStr !== endDateStr) {
        return `${startDateStr} ${startTimeStr} - ${endDateStr} ${endTimeStr}`
      } else {
        return `${startDateStr} ${startTimeStr} - ${endTimeStr}`
      }
    } else {
      // Format without time (date only)
    if (endDate && startDate.toDateString() !== endDate.toDateString()) {
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
    } else {
      return startDate.toLocaleDateString()
      }
    }
  }

  // Helper to get calendar API
  const getCalendarApi = useCallback(() => {
    return calendarRef?.current?.getApi?.()
  }, [calendarRef])
  
  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!dataProviderRef.current) return false
    
    const editingState = dataProviderRef.current.getEditingState()
    return editingState.hasChanges()
  }, [dataProviderRef])
  
  // Check editing state changes and update save button
  const checkEditingState = useCallback(() => {
    if (!dataProviderRef.current) {
      setCanSave(false)
      return
    }
    
    const editingState = dataProviderRef.current.getEditingState()
    const hasChanges = editingState.hasChanges()
    
    if (!hasChanges) {
      setCanSave(false)
      return
    }
    
    // Check validation using EditingState's validation method
    const validation = editingState.validateCells([
      { indexNumber: 0, name: "date", title: isRTL ? "التاريخ" : "Date", isRequired: true },
      { indexNumber: 1, name: "time", title: isRTL ? "الوقت" : "Time", isRequired: true },
      { indexNumber: 2, name: "phone", title: isRTL ? "رقم الهاتف" : "Phone", isRequired: true },
      { indexNumber: 3, name: "type", title: isRTL ? "نوع الحجز" : "Type", isRequired: true },
      { indexNumber: 4, name: "name", title: isRTL ? "الاسم" : "Name", isRequired: true }
    ] as any)
    
    setCanSave(hasChanges && validation.isValid)
  }, [dataProviderRef, isRTL])

  // Set loading state when dialog opens and cleanup
  useEffect(() => {
    if (open) {
      setIsGridReady(false)
      setCanSave(false)
      
      // Clear any existing editing state and cache when dialog opens
      if (dataProviderRef.current) {
        const editingState = dataProviderRef.current.getEditingState()
        editingState.clearMemory() // Reset the editing state
        // Refresh to clear cache and reload original values
        dataProviderRef.current.refresh()
      }
    } else {
      // Reset states when dialog closes
      setIsGridReady(false)
      setCanSave(false)
      
      // Unsubscribe from EditingState changes
      if ((dataProviderRef as any).unsubscribe) {
        (dataProviderRef as any).unsubscribe()
        delete (dataProviderRef as any).unsubscribe
      }
      
      // Clear preserved data source after animation completes
      const timer = setTimeout(() => {
        setPreservedDataSource(null)
      }, 300) // Wait for dialog close animation
      
      return () => clearTimeout(timer)
    }
  }, [open])
  
  // Validate all cells in the grid (for error display)
  const validateAllCells = useCallback(() => {
    if (!dataProviderRef.current) return { isValid: true, errors: [] }
    
    const editingState = dataProviderRef.current.getEditingState()
    
    // Use EditingState's validation method
    const validation = editingState.validateCells([
      { indexNumber: 0, name: "date", title: isRTL ? "التاريخ" : "Date", isRequired: true },
      { indexNumber: 1, name: "time", title: isRTL ? "الوقت" : "Time", isRequired: true },
      { indexNumber: 2, name: "phone", title: isRTL ? "رقم الهاتف" : "Phone", isRequired: true },
      { indexNumber: 3, name: "type", title: isRTL ? "نوع الحجز" : "Type", isRequired: true },
      { indexNumber: 4, name: "name", title: isRTL ? "الاسم" : "Name", isRequired: true }
    ] as any)
    
    // Translate error messages to match the expected format
    const translatedErrors = validation.errors.map(err => ({
      row: err.row,
      col: err.col,
      message: err.message
        .replace('Phone is required', isRTL ? 'رقم الهاتف مطلوب' : 'Phone number is required')
        .replace('Name is required', isRTL ? 'اسم العميل مطلوب' : 'Customer name is required')
        .replace('Date is required', isRTL ? 'التاريخ مطلوب' : 'Date is required')
        .replace('Time is required', isRTL ? 'الوقت مطلوب' : 'Time is required')
        .replace('Invalid phone number format', isRTL ? 'صيغة رقم الهاتف غير صالحة' : 'Invalid phone number format')
        .replace('Phone number must be between 8 and 15 digits', isRTL ? 'رقم الهاتف يجب أن يكون بين 8-15 رقمًا' : 'Phone number must be between 8-15 digits')
    }))
    
    return { isValid: validation.isValid, errors: translatedErrors }
  }, [dataProviderRef, isRTL])

  // Handler to save changes
  const handleSaveChanges = useCallback(async () => {
    if (!dataProviderRef.current) {
      toast.error(getMessage('system_error_try_later', isRTL), {
        duration: 5000,
      })
      return
    }

    if (isSaving) {
      return // Prevent multiple saves
    }
    
    // Validate all cells before saving
    const validation = validateAllCells()
    if (!validation.isValid) {
      // Show validation errors
      const errorMessages = validation.errors.map(err => 
        `${isRTL ? 'الصف' : 'Row'} ${err.row + 1}: ${err.message}`
      ).join('\n')
      
      toast.error(isRTL ? 'أخطاء في التحقق' : 'Validation Errors', {
        description: errorMessages,
        duration: 8000,
        style: {
          whiteSpace: 'pre-line'
        }
      })
      
      // Focus on the first error cell if possible
      if (validation.errors.length > 0 && dataProviderRef.current) {
        const firstError = validation.errors[0]
        // Note: You might need to add a method to focus a specific cell in the grid
        // For now, we just show the errors
      }
      
      return
    }
    
    setIsSaving(true)
    
    try {
    const editingState = dataProviderRef.current.getEditingState()
    
    // Parse the editing state to get changes
    const changesJson = editingState.toJson([
      { indexNumber: 0, name: "date" },
      { indexNumber: 1, name: "time" },
      { indexNumber: 2, name: "phone" },
      { indexNumber: 3, name: "type" },
      { indexNumber: 4, name: "name" }
    ] as any)
    
    const changes = JSON.parse(changesJson)
    
    let hasErrors = false
    const successfulOperations: { type: string; id: any; data?: any }[] = []

    // Process deleted rows
    if (changes.deleted_rows && changes.deleted_rows.length > 0) {
      for (const rowIndex of changes.deleted_rows) {
        // Get the original event from the mapping
        const originalEvent = gridRowToEventMapRef.current.get(rowIndex)
        if (!originalEvent) continue

        const waId = originalEvent.id?.replace('+', '') || '' // Remove + prefix
        const date = new Date(originalEvent.start).toISOString().split('T')[0]
        
        try {
          const result = await cancelReservation({ id: waId, date })
          

          
          if (result.success) {
            // Extract reservation ID from the response or event
            // The Python backend returns the cancelled_ids array in the data field
            const cancelledIds = (result as any).data?.cancelled_ids || (result as any).cancelled_ids || []
            const responseReservationId = cancelledIds[0] || originalEvent.extendedProps?.reservationId
            

            
            // Create closure variables for the undo handler
            const undoReservationId = responseReservationId
            const undoTitle = originalEvent.title
            
            successfulOperations.push({ 
              type: 'cancel', 
              id: undoReservationId || waId,
              data: { waId, date }
            })
            
            toast.success(getMessage('reservation_cancelled', isRTL), {
              description: isRTL ? `تم إلغاء حجز ${undoTitle}` : `Cancelled reservation for ${undoTitle}`,
              duration: 8000,
              action: {
                label: getMessage('undo', isRTL),
                onClick: async () => {
                  try {
                    const reservationId = undoReservationId
                    

                    
                    if (!reservationId) {
                      console.error('Cancellation undo failed - no reservation ID')
                      toast.error(getMessage('undo_failed', isRTL), {
                        description: isRTL ? "معرف الحجز غير موجود - قد يكون هذا حجز قديم بدون معرف" : "Reservation ID not found - this might be an old reservation without an ID",
                        duration: 5000,
                      })
                      return
                    }
                    
                    const undoResult = await undoCancelReservation(
                      reservationId,
                      isRTL
                    )
                    
                    if (undoResult.success) {
                      toast.success(getMessage('undone', isRTL), {
                        description: isRTL ? "تم استعادة الحجز" : "Reservation restored",
                        duration: 4000,
                      })
                      // Use calendar API to restore the event
                      const calendarApi = getCalendarApi()
                      if (calendarApi) {
                        // Re-add the event since it was removed
                        const restoredEventType = originalEvent.extendedProps?.type || 0
                        const restoredEventTypeClass = `reservation-type-${restoredEventType}`
                        
                        const restoredEvent = {
                          id: originalEvent.id,
                          title: originalEvent.title,
                          start: originalEvent.start,
                          end: originalEvent.end,
                          className: [restoredEventTypeClass],
                          editable: true,
                          durationEditable: false,
                          extendedProps: {
                            ...originalEvent.extendedProps,
                            cancelled: false,
                            status: 'active'
                          }
                        }
                        calendarApi.addEvent(restoredEvent)
                      }
                    } else {
                      toast.error(getMessage('undo_failed', isRTL), {
                        description: undoResult.message || getMessage('system_error_try_later', isRTL),
                        duration: 5000,
                      })
                    }
                  } catch (error) {
                    toast.error(getMessage('undo_error', isRTL), {
                      description: getMessage('system_error_try_later', isRTL),
                      duration: 5000,
                    })
                  }
                }
              }
            })
          } else {
            hasErrors = true
            toast.error(getMessage('cancellation_failed', isRTL), {
              description: result.message || getMessage('system_error_try_later', isRTL),
              duration: 5000,
            })
          }
        } catch (error) {
          hasErrors = true
          toast.error(getMessage('network_error', isRTL), {
            description: getMessage('system_error_try_later', isRTL),
            duration: 5000,
          })
        }
      }
    }

    // Process edited rows
    if (changes.edited_rows && Object.keys(changes.edited_rows).length > 0) {
      for (const [rowIndex, editedData] of Object.entries(changes.edited_rows)) {
        const originalEvent = gridRowToEventMapRef.current.get(parseInt(rowIndex))
        if (!originalEvent) continue

        // Type the editedData
        const typedEditedData = editedData as Record<string, any>

        const originalWaId = originalEvent.id?.replace('+', '') || '' // Store original ID
        const waId = originalWaId // Use for operations
        const newPhone = typedEditedData.phone ? String(typedEditedData.phone).replace('+', '') : waId
        
        // Track if phone was changed successfully
        let phoneChanged = false
        
        // Check if phone number changed
        if (newPhone !== waId) {
          try {
            const idResult = await modifyCustomerId(waId, newPhone, isRTL)
            
            if (idResult.success) {
              phoneChanged = true
              toast.success(getMessage('wa_id_modified', isRTL), {
                description: isRTL ? `تم تغيير رقم الهاتف من ${waId} إلى ${newPhone}` : `Phone number changed from ${waId} to ${newPhone}`,
                duration: 5000,
              })
                // Don't update the ID yet - wait until all operations are complete
                
                // If only phone number is being changed (no other modifications)
                if (!typedEditedData.date && !typedEditedData.time && 
                    !typedEditedData.name && typedEditedData.type === undefined) {
                // Update the event ID immediately and refresh calendar
              originalEvent.id = newPhone
                // Use calendar API to update the event ID
                const calendarApi = getCalendarApi()
                if (calendarApi) {
                  const event = calendarApi.getEventById(waId)
                  if (event) {
                    // Remove old event and add new one with updated ID
                    const eventData = {
                      id: newPhone,
                      title: event.title,
                      start: event.start,
                      end: event.end,
                      className: event.className,
                      editable: event.editable,
                      durationEditable: event.durationEditable,
                      extendedProps: event.extendedProps
                    }
                    event.remove()
                    calendarApi.addEvent(eventData)
                  }
                }
              }
            } else {
              hasErrors = true
              toast.error(isRTL ? "فشل في تغيير رقم الهاتف" : "Failed to change phone number", {
                description: idResult.message || getMessage('system_error_try_later', isRTL),
                duration: 5000,
              })
              continue
            }
          } catch (error) {
            hasErrors = true
            toast.error(getMessage('network_error', isRTL), {
              description: getMessage('system_error_try_later', isRTL),
              duration: 5000,
            })
            continue
          }
        }

        // Check if there are any changes other than phone number
        const hasOtherChanges = typedEditedData.date || typedEditedData.time || 
                               typedEditedData.name || typedEditedData.type !== undefined
        
        // Only modify reservation if there are changes beyond phone number
        if (hasOtherChanges) {
        // Format time for the API
        let formattedTime = typedEditedData.time || new Date(originalEvent.start).toTimeString().slice(0, 5)
          
          // The time picker might return a Date object or a string
          if (formattedTime) {
            // Check if it's a Date object (ISO string)
            if (typeof formattedTime === 'string' && formattedTime.includes('T')) {
              // It's an ISO date string, extract the time
              const date = new Date(formattedTime)
              // Get hours and minutes in local time
              const hours = date.getHours()
              const minutes = date.getMinutes()
              const ampm = hours >= 12 ? 'PM' : 'AM'
              const hour12 = hours % 12 || 12
              formattedTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
            } else if (typeof formattedTime === 'string') {
              // It's already a time string, normalize it
              formattedTime = formattedTime.trim().replace(/\s+/g, ' ')
              
              // If it already includes AM/PM, ensure consistent formatting
              if (formattedTime.includes('AM') || formattedTime.includes('PM')) {
                // Extract time parts and AM/PM
                const match = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
                if (match) {
                  const [, hourStr, minutes, ampm] = match
                  const hour = parseInt(hourStr)
                  formattedTime = `${hour}:${minutes} ${ampm.toUpperCase()}`
                }
              } else {
                // Convert 24h to 12h format only if AM/PM is missing
        const [hours, minutes] = formattedTime.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        formattedTime = `${hour12}:${minutes} ${ampm}`
              }
            }
          }

        try {
          const result = await modifyReservation({
            id: originalWaId, // Use original ID for reservation modification
            date: typedEditedData.date || new Date(originalEvent.start).toISOString().split('T')[0],
            time: formattedTime,
            title: typedEditedData.name || originalEvent.title,
            type: typedEditedData.type === "مراجعة" || typedEditedData.type === "Follow-up" ? 1 : 0
          })
          
          if (result.success) {
            // If phone was changed successfully, update the event ID
            if (phoneChanged) {
              originalEvent.id = newPhone // Update to new phone number (no prefix)
            }
            
            // Update the calendar event immediately
            const calendarApi = getCalendarApi()
            if (calendarApi) {
              const event = calendarApi.getEventById(originalEvent.id)
              if (event) {
                // Parse the new date and time to create proper start/end dates
                const newDate = typedEditedData.date || new Date(originalEvent.start).toISOString().split('T')[0]
                const [datePart] = newDate.split('T')
                
                // Parse the formatted time
                let hours = 0
                let minutes = 0
                if (formattedTime) {
                  const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
                  if (timeMatch) {
                    hours = parseInt(timeMatch[1])
                    minutes = parseInt(timeMatch[2])
                    const isPM = timeMatch[3].toUpperCase() === 'PM'
                    if (isPM && hours !== 12) hours += 12
                    if (!isPM && hours === 12) hours = 0
                  }
                }
                
                // Create start date
                const startDate = new Date(datePart)
                startDate.setHours(hours, minutes, 0, 0)
                
                // Calculate event duration based on free roam mode
                const numReservationsPerSlot = 6
                let eventDurationMs: number
                
                if (freeRoam) {
                  // In free roam mode, use longer events for better visibility (45 minutes)
                  eventDurationMs = 45 * 60 * 1000
                } else {
                  // Normal mode uses the original calculation
                  eventDurationMs = (slotDurationHours * 60 * 60 * 1000) / numReservationsPerSlot
                }
                
                // Create end date using the calculated duration
                const endDate = new Date(startDate.getTime() + eventDurationMs)
                
                // Update event properties
                event.setDates(startDate.toISOString(), endDate.toISOString())
                event.setProp('title', typedEditedData.name || originalEvent.title)
                event.setExtendedProp('type', typedEditedData.type === "مراجعة" || typedEditedData.type === "Follow-up" ? 1 : 0)
                event.setExtendedProp('customerName', typedEditedData.name || originalEvent.title)
              }
            }
            
            // Create a deep copy of the original event to preserve all data
            const originalEventCopy = JSON.parse(JSON.stringify(originalEvent))
            

            
            // Extract reservation ID from the response if available
            const responseReservationId = (result as any).data?.reservation_id || 
                                        (result as any).reservation_id
            
            // Use the reservation ID from the response if the event doesn't have one
            const reservationIdForUndo = originalEvent.extendedProps?.reservationId || responseReservationId
            
            // Create closure variables for the undo handler
            const undoReservationId = reservationIdForUndo
            const undoEventCopy = originalEventCopy
            
            successfulOperations.push({ 
              type: 'modify', 
              id: reservationIdForUndo,
              data: originalEventCopy // Store copy of original data for undo
            })
            
            toast.success(getMessage('reservation_modified', isRTL), {
              description: isRTL ? `تم تعديل حجز ${typedEditedData.name || originalEvent.title}` : `Modified reservation for ${typedEditedData.name || originalEvent.title}`,
              duration: 8000,
              action: {
                label: getMessage('undo', isRTL),
                onClick: async () => {
                  try {
                    // Use the stored reservation ID from closure
                    const reservationId = undoReservationId
                    

                    
                    if (!reservationId || (typeof reservationId !== 'number' && typeof reservationId !== 'string')) {
                      console.error('Invalid reservation ID:', reservationId, 'from event:', undoEventCopy)
                      toast.error(getMessage('undo_failed', isRTL), {
                        description: isRTL ? "معرف الحجز غير صالح - قد يكون هذا حجز قديم بدون معرف" : "Invalid reservation ID - this might be an old reservation without an ID",
                        duration: 5000,
                      })
                      return
                    }
                    
                    // Convert to number if it's a string
                    const numericReservationId = typeof reservationId === 'string' ? parseInt(reservationId, 10) : reservationId
                    
                    if (isNaN(numericReservationId)) {
                      console.error('Reservation ID is not a valid number:', reservationId)
                      toast.error(getMessage('undo_failed', isRTL), {
                        description: isRTL ? "معرف الحجز غير صالح" : "Invalid reservation ID format",
                        duration: 5000,
                      })
                      return
                    }
                    
                    const originalTime = new Date(undoEventCopy.start).toLocaleTimeString('en-US', { 
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })
                    
                    const undoResult = await undoModifyReservation(
                      numericReservationId,
                      {
                        wa_id: undoEventCopy.id?.replace('+', '') || '',
                        date: new Date(undoEventCopy.start).toISOString().split('T')[0],
                        time_slot: originalTime,
                        customer_name: undoEventCopy.title,
                        type: undoEventCopy.extendedProps?.type || 0
                      },
                      isRTL
                    )
                    
                    if (undoResult.success) {
                      toast.success(getMessage('undone', isRTL), {
                        description: isRTL ? "تم إرجاع الحجز إلى حالته الأصلية" : "Reservation reverted to original state",
                        duration: 4000,
                      })
                      // Use calendar API to revert the event
                      const calendarApi = getCalendarApi()
                      if (calendarApi) {
                        const event = calendarApi.getEventById(originalEvent.id)
                        if (event) {
                          // Update event to original state
                          event.setDates(undoEventCopy.start, undoEventCopy.end)
                          event.setProp('title', undoEventCopy.title)
                          event.setExtendedProp('type', undoEventCopy.extendedProps?.type || 0)
                        }
                      }
                    } else {
                      toast.error(getMessage('undo_failed', isRTL), {
                        description: undoResult.message || getMessage('system_error_try_later', isRTL),
                        duration: 5000,
                      })
                    }
                  } catch (error) {
                    console.error('Undo error:', error)
                    toast.error(getMessage('undo_error', isRTL), {
                      description: getMessage('system_error_try_later', isRTL),
                      duration: 5000,
                    })
                  }
                }
              }
            })
          } else {
            hasErrors = true
            toast.error(getMessage('update_failed', isRTL), {
              description: result.message || getMessage('system_error_try_later', isRTL),
              duration: 5000,
            })
          }
        } catch (error) {
          hasErrors = true
          toast.error(getMessage('network_error', isRTL), {
            description: getMessage('system_error_try_later', isRTL),
            duration: 5000,
          })
          }
        } else if (phoneChanged) {
          // If only phone number was changed (no reservation modification)
          // Update the event ID to reflect the new phone number
          originalEvent.id = newPhone
          // Don't refresh here - it will be done at the end with all operations
        }
      }
    }

    // Process added rows
    if (changes.added_rows && changes.added_rows.length > 0) {
      for (const addedRow of changes.added_rows) {
        const waId = String(addedRow.phone || '').replace('+', '')
        
        // Format time for the API
        let formattedTime = addedRow.time
        
        // The time picker might return a Date object or a string
        if (formattedTime) {
          // Check if it's a Date object (ISO string)
          if (typeof formattedTime === 'string' && formattedTime.includes('T')) {
            // It's an ISO date string, extract the time
            const date = new Date(formattedTime)
            // Get hours and minutes in local time
            const hours = date.getHours()
            const minutes = date.getMinutes()
            const ampm = hours >= 12 ? 'PM' : 'AM'
            const hour12 = hours % 12 || 12
            formattedTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
          } else if (typeof formattedTime === 'string') {
            // It's already a time string, normalize it
            formattedTime = formattedTime.trim().replace(/\s+/g, ' ')
            
            // If it already includes AM/PM, ensure consistent formatting
            if (formattedTime.includes('AM') || formattedTime.includes('PM')) {
              // Extract time parts and AM/PM
              const match = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
              if (match) {
                const [, hourStr, minutes, ampm] = match
                const hour = parseInt(hourStr)
                formattedTime = `${hour}:${minutes} ${ampm.toUpperCase()}`
              }
            } else {
              // Convert 24h to 12h format only if AM/PM is missing
        const [hours, minutes] = formattedTime.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        formattedTime = `${hour12}:${minutes} ${ampm}`
            }
          }
        }

        try {
          const result = await reserveTimeSlot({
            id: waId,
            title: addedRow.name,
            date: addedRow.date,
            time: formattedTime,
            type: addedRow.type === "مراجعة" || addedRow.type === "Follow-up" ? 1 : 0,
            max_reservations: 6
          })
          
          if (result.success) {
            // Check if the response has a data field with reservation_id
            const reservationId = (result as any).data?.reservation_id || 
                                (result as any).reservation_id || 
                                Math.random() // Fallback ID if not provided
            
            successfulOperations.push({ 
              type: 'create', 
              id: reservationId 
            })
            
            toast.success(getMessage('reservation_successful', isRTL), {
              description: isRTL ? `تم إنشاء حجز لـ ${addedRow.name}` : `Created reservation for ${addedRow.name}`,
              duration: 8000,
              action: {
                label: getMessage('undo', isRTL),
                onClick: async () => {
                  try {
                    const undoResult = await undoCreateReservation(
                      reservationId,
                      isRTL
                    )
                    
                    if (undoResult.success) {
                      toast.success(getMessage('undone', isRTL), {
                        description: isRTL ? "تم إلغاء الحجز الجديد" : "New reservation cancelled",
                        duration: 4000,
                      })
                      // Use calendar API to remove the newly created event
                      const calendarApi = getCalendarApi()
                      if (calendarApi) {
                        // Find event by reservation ID or matching properties
                        const events = calendarApi.getEvents()
                        const eventToRemove = events.find((e: any) => 
                          e.extendedProps?.reservationId === reservationId ||
                          (e.id === '+' + waId && e.title === addedRow.name && e.start.toISOString().split('T')[0] === addedRow.date)
                        )
                        if (eventToRemove) {
                          eventToRemove.remove()
                        }
                      }
                    } else {
                      toast.error(getMessage('undo_failed', isRTL), {
                        description: undoResult.message || getMessage('system_error_try_later', isRTL),
                        duration: 5000,
                      })
                    }
                  } catch (error) {
                    toast.error(getMessage('undo_error', isRTL), {
                      description: getMessage('system_error_try_later', isRTL),
                      duration: 5000,
                    })
                  }
                }
              }
            })
          } else {
            hasErrors = true
            toast.error(getMessage('reservation_failed', isRTL), {
              description: result.message || getMessage('system_error_try_later', isRTL),
              duration: 5000,
            })
          }
        } catch (error) {
          hasErrors = true
          toast.error(getMessage('network_error', isRTL), {
            description: getMessage('system_error_try_later', isRTL),
            duration: 5000,
          })
        }
      }
    }

    // If all operations were successful, close the dialog and refresh
    if (!hasErrors && successfulOperations.length > 0) {
        // Don't close the dialog - let the user decide when to close it
        // Update calendar events based on successful operations
        const calendarApi = getCalendarApi()
        if (calendarApi) {
          // Handle cancellations
          successfulOperations.filter(op => op.type === 'cancel').forEach(op => {
            // Try with the original waId first (no prefix)
            const eventId = op.data.waId
            console.log('Attempting to remove event with ID:', eventId)
            let event = calendarApi.getEventById(eventId)
            
            if (!event) {
              // Try with + prefix
              console.log('Event not found, trying with + prefix:', '+' + eventId)
              event = calendarApi.getEventById('+' + eventId)
            }
            
            if (event) {
              console.log('Found event, removing:', event)
              // Remove the event from calendar since it's cancelled
              event.remove()
            } else {
              console.log('Event not found with either ID format')
            }
          })
          
          // Handle modifications
          successfulOperations.filter(op => op.type === 'modify').forEach(op => {
            // Event updates are already handled inline
          })
          
          // Handle new reservations
          successfulOperations.filter(op => op.type === 'create').forEach((op, index) => {
            const addedRow = changes.added_rows[index]
            if (addedRow) {
              // Get the formatted time that was sent to the API
              let formattedTime = addedRow.time
              
              // Parse time the same way as we did for the API
              if (formattedTime) {
                // Check if it's a Date object (ISO string)
                if (typeof formattedTime === 'string' && formattedTime.includes('T')) {
                  // It's an ISO date string, extract the time
                  const date = new Date(formattedTime)
                  // Get hours and minutes in local time
                  const hours = date.getHours()
                  const minutes = date.getMinutes()
                  const ampm = hours >= 12 ? 'PM' : 'AM'
                  const hour12 = hours % 12 || 12
                  formattedTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
                } else if (typeof formattedTime === 'string') {
                  // It's already a time string, normalize it
                  formattedTime = formattedTime.trim().replace(/\s+/g, ' ')
                  
                  // If it already includes AM/PM, ensure consistent formatting
                  if (formattedTime.includes('AM') || formattedTime.includes('PM')) {
                    // Extract time parts and AM/PM
                    const match = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
                    if (match) {
                      const [, hourStr, minutes, ampm] = match
                      const hour = parseInt(hourStr)
                      formattedTime = `${hour}:${minutes} ${ampm.toUpperCase()}`
                    }
                  } else {
                    // Convert 24h to 12h format only if AM/PM is missing
                    const [hours, minutes] = formattedTime.split(':')
                    const hour = parseInt(hours)
                    const ampm = hour >= 12 ? 'PM' : 'AM'
                    const hour12 = hour % 12 || 12
                    formattedTime = `${hour12}:${minutes} ${ampm}`
                  }
                }
              }
              
              // Parse the date and time to create proper start/end dates
              const [datePart] = addedRow.date.split('T')
              
              // Parse the formatted time (e.g., "11:00 AM" or "2:00 PM")
              let hours = 0
              let minutes = 0
              if (formattedTime) {
                const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
                if (timeMatch) {
                  hours = parseInt(timeMatch[1])
                  minutes = parseInt(timeMatch[2])
                  const isPM = timeMatch[3].toUpperCase() === 'PM'
                  if (isPM && hours !== 12) hours += 12
                  if (!isPM && hours === 12) hours = 0
                }
              }
              
              // Create start date
              const startDate = new Date(datePart)
              startDate.setHours(hours, minutes, 0, 0)
              
              // Calculate event duration based on free roam mode
              // Match the logic from reservation-event-processor.ts
              const numReservationsPerSlot = 6 // Match Python's 6 reservations per slot
              let eventDurationMs: number
              
              if (freeRoam) {
                // In free roam mode, use longer events for better visibility (45 minutes)
                eventDurationMs = 45 * 60 * 1000
              } else {
                // Normal mode uses the original calculation
                eventDurationMs = (slotDurationHours * 60 * 60 * 1000) / numReservationsPerSlot
              }
              
              // Create end date using the calculated duration
              const endDate = new Date(startDate.getTime() + eventDurationMs)
              
              // Determine event type class
              const eventType = addedRow.type === "مراجعة" || addedRow.type === "Follow-up" ? 1 : 0
              const eventTypeClass = `reservation-type-${eventType}`
              
              // Create new event with correct ID format (no + prefix)
              const newEvent = {
                id: String(addedRow.phone || '').replace('+', ''),
                title: addedRow.name,
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                className: [eventTypeClass],
                editable: true,
                durationEditable: false,
                extendedProps: {
                  type: eventType,
                  cancelled: false,
                  status: 'active',
                  reservationId: op.id,
                  customerName: addedRow.name,
                  phone: addedRow.phone
                }
              }
              calendarApi.addEvent(newEvent)
            }
          })
        }
        
        // Clear the editing state after successful save
        if (dataProviderRef.current) {
          const editingState = dataProviderRef.current.getEditingState()
          editingState.clearMemory() // Reset the editing state
          dataProviderRef.current.refresh() // Refresh the grid to show saved state
        }
        
        // Update save button state
        setCanSave(false)
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      toast.error(isRTL ? 'خطأ في الحفظ' : 'Save Error', {
        description: getMessage('system_error_try_later', isRTL),
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }, [dataProviderRef, isRTL, onSave, onOpenChange, cancelReservation, modifyCustomerId, modifyReservation, reserveTimeSlot, undoCancelReservation, undoCreateReservation, undoModifyReservation, toast, getMessage, getCalendarApi, validateAllCells, isSaving, slotDurationHours, freeRoam])

  return (
    <>
      {/* Custom backdrop since modal={false} */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            // Check if the click target is the backdrop itself, not a child element
            if (e.target === e.currentTarget) {
              if (hasUnsavedChanges()) {
                if (confirm(isRTL ? 'هناك تغييرات غير محفوظة. هل تريد الإغلاق بدون حفظ؟' : 'There are unsaved changes. Close without saving?')) {
                  onOpenChange(false)
                }
              } else {
                onOpenChange(false)
              }
            }
          }}
        />
      )}
      
      <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
        <DialogContent 
          className="max-w-6xl w-full h-auto max-h-[90vh] p-0 flex flex-col overflow-visible z-40"
          aria-describedby="data-editor-description"
          onPointerDownOutside={(e) => {
            // Check if the click is on a Grid overlay or Tempus Dominus picker
            const target = e.target as HTMLElement;
            
            // Check for Grid overlays
            if (target.closest('.glide-data-grid-overlay-editor')) {
              e.preventDefault();
              return;
            }
            
            // Check for Tempus Dominus elements
            if (target.closest('.tempus-dominus-widget') || 
                target.closest('.td-picker') ||
                target.closest('.td-overlay') ||
                target.closest('[data-td-target]')) {
              e.preventDefault();
              return;
            }
            
            // Otherwise close the dialog
            onOpenChange(false);
          }}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            // Check if we're in fullscreen mode
            const fullscreenPortal = document.getElementById('grid-fullscreen-portal');
            if (fullscreenPortal) {
              // Don't close dialog if exiting fullscreen
              e.preventDefault();
              return;
            }
            // Allow escape key to close dialog
            onOpenChange(false)
          }}
        >
        <DialogHeader className="px-6 py-4 border-b flex-row items-start justify-between space-y-0">
          <div className="flex flex-col gap-2">
            <DialogTitle className={`text-lg font-semibold ${isRTL ? "text-right" : "text-left"}`}>
              {isRTL ? "محرر البيانات" : "Data Editor"} - {formatDateRange()}
            </DialogTitle>
            <p id="data-editor-description" className="sr-only">
              {isRTL ? "محرر لإدارة الحجوزات وبيانات العملاء" : "Editor for managing reservations and customer data"}
            </p>
          </div>
          <button
            onClick={() => {
              if (hasUnsavedChanges()) {
                if (confirm(isRTL ? 'هناك تغييرات غير محفوظة. هل تريد الإغلاق بدون حفظ؟' : 'There are unsaved changes. Close without saving?')) {
                  onOpenChange(false)
                }
              } else {
                onOpenChange(false)
              }
            }}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="overflow-visible p-0 w-full">
          <div className="border rounded-lg overflow-visible relative w-full">
            {!isGridReady && (
              <div className="absolute inset-0 z-10 bg-background p-4">
                <TableSkeleton rows={6} columns={5} className="min-h-[300px]" />
              </div>
            )}
            <div style={{ opacity: isGridReady ? 1 : 0, pointerEvents: isGridReady ? 'auto' : 'none' }}>
              <FullscreenProvider>
                <Grid 
                  key={`grid-${themeKey}`}
                  showThemeToggle={false} 
                  fullWidth={true} 
                  theme={gridTheme}
                  isDarkMode={isDarkMode}
                  dataSource={dataSource}
                  onReady={() => setIsGridReady(true)}
                  onDataProviderReady={(provider: any) => {
                    dataProviderRef.current = provider
                    
                    // Register onChange callback with EditingState
                    const editingState = provider.getEditingState()
                    const unsubscribe = editingState.onChange(() => {
                      checkEditingState()
                    })
                    
                    // Store unsubscribe function for cleanup
                    ;(dataProviderRef as any).unsubscribe = unsubscribe
                    
                    // Check initial state
                    checkEditingState()
                  }}
                />
              </FullscreenProvider>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button 
            onClick={handleSaveChanges} 
            className="gap-2"
            disabled={!canSave || isSaving}
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {isRTL ? "جاري الحفظ..." : "Saving..."}
              </>
            ) : (
              <>
            <Save className="h-4 w-4" />
            {isRTL ? "حفظ التغييرات" : "Save Changes"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

