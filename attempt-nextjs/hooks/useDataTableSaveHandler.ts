import { useState, useCallback, useRef } from "react"
import { DataTableOperationsService } from "@/lib/services/data-table-operations.service"
import { DataProvider } from "@/components/glide_custom_cells/components/core/services/DataProvider"
import { CalendarEvent, EditingChanges } from "@/types/data-table-editor"
import { getMessage } from "@/lib/api"
import { toast } from "sonner"
import { getColumnNamesForParsing } from "@/lib/constants/data-table-editor.constants"

interface UseDataTableSaveHandlerProps {
  calendarRef?: React.RefObject<any>
  isRTL: boolean
  slotDurationHours: number
  freeRoam: boolean
  gridRowToEventMapRef: React.RefObject<Map<number, CalendarEvent>>
  dataProviderRef: React.RefObject<DataProvider | null>
  validateAllCells: () => { isValid: boolean; errors: any[] }
  onEventAdded?: (event: CalendarEvent) => void
  onEventModified?: (eventId: string, event: CalendarEvent) => void
  onEventCancelled?: (eventId: string) => void
  refreshCustomerData?: () => Promise<void>
}

export function useDataTableSaveHandler({
  calendarRef,
  isRTL,
  slotDurationHours,
  freeRoam,
  gridRowToEventMapRef,
  dataProviderRef,
  validateAllCells,
  onEventAdded,
  onEventModified,
  onEventCancelled,
  refreshCustomerData
}: UseDataTableSaveHandlerProps) {
  const [isSaving, setIsSaving] = useState(false)
  const operationsServiceRef = useRef<DataTableOperationsService | null>(null)

  const getCalendarApi = useCallback(() => {
    return calendarRef?.current?.getApi?.()
  }, [calendarRef])

  const handleSaveChanges = useCallback(async () => {
    console.log('🚀 useDataTableSaveHandler: handleSaveChanges called')
    
    if (!dataProviderRef.current) {
      console.error('❌ No data provider available')
      toast.error(getMessage('system_error_try_later', isRTL), {
        duration: 5000,
      })
      return
    }

    if (isSaving) {
      console.log('⏳ Already saving, skipping...')
      return
    }
    
    const validation = validateAllCells()
    if (!validation.isValid) {
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
      
      return
    }
    
    setIsSaving(true)
    
    try {
      const editingState = dataProviderRef.current.getEditingState()
      const columnsForParsing = getColumnNamesForParsing()
      const changesJson = editingState.toJson(columnsForParsing as any)
      const changes: EditingChanges = JSON.parse(changesJson)
      
      console.log('📝 Changes detected:', {
        changesJson,
        changes,
        hasDeletedRows: (changes.deleted_rows?.length ?? 0) > 0,
        hasEditedRows: changes.edited_rows && Object.keys(changes.edited_rows).length > 0,
        hasAddedRows: (changes.added_rows?.length ?? 0) > 0
      })
      
      let hasErrors = false
      let successfulOperations: any[] = []

      const calendarApi = getCalendarApi()
      
      if (!operationsServiceRef.current || 
          operationsServiceRef.current['calendarApi'] !== calendarApi) {
        operationsServiceRef.current = new DataTableOperationsService(
          calendarApi,
          isRTL,
          slotDurationHours,
          freeRoam,
          refreshCustomerData
        )
      }

      const operations = operationsServiceRef.current

      if (changes.deleted_rows && changes.deleted_rows.length > 0) {
        const result = await operations.processCancellations(
          changes.deleted_rows,
          gridRowToEventMapRef.current!,
          onEventCancelled,
          onEventAdded
        )
        hasErrors = hasErrors || result.hasErrors
        successfulOperations = [...successfulOperations, ...result.successfulOperations]
      }

      if (changes.edited_rows && Object.keys(changes.edited_rows).length > 0) {
        const result = await operations.processModifications(
          changes.edited_rows,
          gridRowToEventMapRef.current!,
          onEventModified
        )
        hasErrors = hasErrors || result.hasErrors
        successfulOperations = [...successfulOperations, ...result.successfulOperations]
      }

      if (changes.added_rows && changes.added_rows.length > 0) {
        const result = await operations.processAdditions(
          changes.added_rows,
          onEventAdded,
          onEventCancelled
        )
        hasErrors = hasErrors || result.hasErrors
        successfulOperations = [...successfulOperations, ...result.successfulOperations]
      }

      if (!hasErrors && successfulOperations.length > 0) {
        operations.updateCalendarWithOperations(successfulOperations, onEventAdded)
        
        if (dataProviderRef.current) {
          const editingState = dataProviderRef.current.getEditingState()
          editingState.clearMemory()
          dataProviderRef.current.refresh()
        }
      }
      
      return !hasErrors
    } catch (error) {
      console.error('Error saving changes:', error)
      toast.error(isRTL ? 'خطأ في الحفظ' : 'Save Error', {
        description: getMessage('system_error_try_later', isRTL),
        duration: 5000,
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }, [
    dataProviderRef,
    isRTL,
    isSaving,
    validateAllCells,
    getCalendarApi,
    slotDurationHours,
    freeRoam,
    gridRowToEventMapRef,
    onEventCancelled,
    onEventAdded,
    onEventModified,
    refreshCustomerData
  ])

  return {
    isSaving,
    handleSaveChanges
  }
} 