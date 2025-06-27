import { useState, useCallback, useEffect, useRef } from 'react'
import type { CalendarCoreRef } from '@/components/calendar-core'

interface UseCalendarInitializationProps {
  calculateHeight: () => number | 'auto'
  sidebarOpen?: boolean
  refreshData: () => Promise<void>
  setOnVacationUpdated: (callback: () => Promise<void>) => void
  fetchConversations: () => void
}

export function useCalendarInitialization({
  calculateHeight,
  sidebarOpen,
  refreshData,
  setOnVacationUpdated,
  fetchConversations
}: UseCalendarInitializationProps) {
  const [calendarHeight, setCalendarHeight] = useState<number | 'auto'>(800)
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  // Fetch conversations when component mounts
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Set initial height and update on resize
  useEffect(() => {
    setCalendarHeight(calculateHeight())
  }, [calculateHeight])

  // Smooth updateSize handler called on container resize frames
  const handleUpdateSize = useCallback((calendarRef: React.RefObject<CalendarCoreRef>) => {
    calendarRef.current?.updateSize()
  }, [])

  // Update calendar size when sidebar state changes
  useEffect(() => {
    // Small delay to allow CSS transition to start
    const timer = setTimeout(() => {
      setCalendarHeight(calculateHeight())
    }, 50)
    
    return () => clearTimeout(timer)
  }, [sidebarOpen, calculateHeight])

  return {
    calendarHeight,
    isRefreshing,
    handleRefreshWithBlur,
    handleUpdateSize,
    setCalendarHeight
  }
} 