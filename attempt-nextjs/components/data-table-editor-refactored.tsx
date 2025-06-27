"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { X, Save } from "lucide-react"
import { TableSkeleton } from "./glide_custom_cells/components/ui/TableSkeleton"
import dynamic from "next/dynamic"
import { FullscreenProvider } from "./glide_custom_cells/components/contexts/FullscreenContext"

import { useTheme } from "next-themes"
import { createGlideTheme } from "./glide_custom_cells/components/utils/streamlitGlideTheme"
import React from "react"
import { useSettings } from "@/lib/settings-context"
import { Button } from "@/components/ui/button"
import { formatDateRangeWithHijri } from "@/lib/hijri-utils"
// formatDateTimeOptions removed - using inline options instead
import { DataTableEditorProps } from "@/types/data-table-editor"
import { useDataTableDataSource } from "@/hooks/useDataTableDataSource"
import { useDataTableValidation } from "@/hooks/useDataTableValidation"
import { useDataTableSaveHandler } from "@/hooks/useDataTableSaveHandler"
import { UnsavedChangesDialog } from "./data-table-editor/UnsavedChangesDialog"
import { DataProvider } from "./glide_custom_cells/components/core/services/DataProvider"
import { useDialogOverlayPortal } from "./glide_custom_cells/components/ui/DialogPortal"

const Grid = dynamic(() => import("./glide_custom_cells/components/Grid"), { 
  ssr: false,
  loading: () => <TableSkeleton rows={6} columns={5} className="min-h-[300px]" />
})

export function DataTableEditor(props: DataTableEditorProps) {
  const {
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
    calendarRef,
    onEventAdded,
    onEventModified,
    onEventCancelled
  } = props

  const [isGridReady, setIsGridReady] = useState(false)
  const [canSave, setCanSave] = useState(false)
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [pendingCloseAction, setPendingCloseAction] = useState<(() => void) | null>(null)
  const { theme: appTheme } = useTheme()
  const { theme: styleTheme } = useSettings()
  const isDarkMode = appTheme === 'dark'
  
  const dataProviderRef = useRef<DataProvider | null>(null)
  const [themeKey, setThemeKey] = useState(0)
  
  // Use the dialog overlay portal to move overlay editors outside dialog
  useDialogOverlayPortal()
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setThemeKey(prev => prev + 1)
    }, 50)
    return () => clearTimeout(timer)
  }, [appTheme, styleTheme])
  
  const gridTheme = React.useMemo(() => createGlideTheme(isDarkMode ? 'dark' : 'light'), [isDarkMode, styleTheme, themeKey])

  const { dataSource, gridRowToEventMapRef } = useDataTableDataSource(
    events,
    selectedDateRange,
    slotDurationHours,
    freeRoam,
    isRTL,
    open
  )

  const { validateAllCells, checkEditingState, hasUnsavedChanges } = useDataTableValidation(
    dataProviderRef,
    isRTL
  )

  const { isSaving, handleSaveChanges: performSave } = useDataTableSaveHandler({
    calendarRef,
    isRTL,
    slotDurationHours,
    freeRoam,
    gridRowToEventMapRef,
    dataProviderRef,
    validateAllCells,
    onEventAdded,
    onEventModified,
    onEventCancelled
  })

  const formatDateRange = () => {
    if (!selectedDateRange) return ""
    
    const startDate = new Date(selectedDateRange.start)
    const endDate = selectedDateRange.end ? new Date(selectedDateRange.end) : null
    const hasTimeInfo = selectedDateRange.start.includes('T')
    
    if (isRTL) {
      let computedEnd: Date | undefined = undefined
      if (hasTimeInfo && (!endDate || endDate.getTime() === startDate.getTime())) {
        computedEnd = new Date(startDate.getTime() + slotDurationHours * 60 * 60 * 1000)
      } else {
        computedEnd = endDate || undefined
      }
      
      return formatDateRangeWithHijri(startDate, isRTL, computedEnd, { 
        includeTime: hasTimeInfo,
        includeGregorian: false 
      })
    }
    
    if (hasTimeInfo) {
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }
      const dateOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }
      
      const startDateStr = startDate.toLocaleDateString(undefined, dateOptions)
      const startTimeStr = startDate.toLocaleTimeString(undefined, timeOptions)
      
      let computedEnd: Date | null = null
      if (endDate && endDate.getTime() !== startDate.getTime()) {
        computedEnd = endDate
      } else {
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
      if (endDate && startDate.toDateString() !== endDate.toDateString()) {
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
      } else {
        return startDate.toLocaleDateString()
      }
    }
  }

  const handleCheckEditingState = useCallback(() => {
    const state = checkEditingState()
    setCanSave(state.hasChanges && state.isValid)
  }, [checkEditingState])

  useEffect(() => {
    if (open) {
      setIsGridReady(false)
      setCanSave(false)
      
      if (dataProviderRef.current) {
        const editingState = dataProviderRef.current.getEditingState()
        editingState.clearMemory()
        dataProviderRef.current.refresh()
      }
    } else {
      setIsGridReady(false)
      setCanSave(false)
      
      if ((dataProviderRef as any).unsubscribe) {
        (dataProviderRef as any).unsubscribe()
        delete (dataProviderRef as any).unsubscribe
      }
    }
  }, [open])

  const handleSaveChanges = useCallback(async () => {
    const success = await performSave()
    if (success) {
      setCanSave(false)
    }
  }, [performSave])

  const handleCloseAttempt = useCallback((closeAction: () => void) => {
    if (hasUnsavedChanges()) {
      setPendingCloseAction(() => closeAction)
      setShowUnsavedChangesDialog(true)
    } else {
      closeAction()
    }
  }, [hasUnsavedChanges])
  
  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedChangesDialog(false)
    if (pendingCloseAction) {
      pendingCloseAction()
      setPendingCloseAction(null)
    }
  }, [pendingCloseAction])
  
  const handleSaveAndClose = useCallback(async () => {
    setShowUnsavedChangesDialog(false)
    await handleSaveChanges()
    if (pendingCloseAction) {
      pendingCloseAction()
      setPendingCloseAction(null)
    }
  }, [pendingCloseAction, handleSaveChanges])

  return (
    <>
      {open && (
        <div 
          className="fixed inset-0 dialog-backdrop bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseAttempt(() => onOpenChange(false))
            }
          }}
        />
      )}
      
      {open && (
        <div 
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-6xl w-full h-auto max-h-[95vh] p-0 flex flex-col overflow-visible dialog-content gap-0 grid border bg-background shadow-lg sm:rounded-lg"
          style={{ zIndex: 2000 }}
          aria-describedby="data-editor-description"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              const fullscreenPortal = document.getElementById('grid-fullscreen-portal')
              if (fullscreenPortal) {
                e.preventDefault()
                return
              }
              handleCloseAttempt(() => onOpenChange(false))
            }
          }}
        >
          <button 
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={() => handleCloseAttempt(() => onOpenChange(false))}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          <div className="px-4 py-1.5 border-b flex flex-col space-y-1.5 text-center sm:text-left">
            <h2 className={`text-base font-semibold leading-none tracking-tight ${isRTL ? "text-right" : "text-left"}`}>
              {isRTL ? "محرر البيانات" : "Data Editor"} - {formatDateRange()}
            </h2>
            <p id="data-editor-description" className="sr-only">
              {isRTL ? "محرر لإدارة الحجوزات وبيانات العملاء" : "Editor for managing reservations and customer data"}
            </p>
          </div>

          <div className="overflow-visible w-full flex-1 min-h-0">
            <div className="overflow-visible relative w-full h-full">
              {!isGridReady && (
                <div className="absolute inset-0 z-10 bg-background p-2">
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
                      
                      const editingState = provider.getEditingState()
                      const unsubscribe = editingState.onChange(() => {
                        handleCheckEditingState()
                      })
                      
                      ;(dataProviderRef as any).unsubscribe = unsubscribe
                      
                      handleCheckEditingState()
                    }}
                  />
                </FullscreenProvider>
              </div>
            </div>
          </div>

          <div className="px-4 py-1.5 border-t flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
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
          </div>
        </div>
      )}
      
      <UnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onOpenChange={setShowUnsavedChangesDialog}
        isRTL={isRTL}
        onDiscard={handleDiscardChanges}
        onSaveAndClose={handleSaveAndClose}
        isSaving={isSaving}
      />
    </>
  )
} 