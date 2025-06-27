import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/lib/language-context'

interface UseCalendarToolbarProps {
  calendarRef: React.RefObject<any>
  currentView: string
  freeRoam?: boolean
  onViewChange?: (view: string) => void
}

interface UseCalendarToolbarReturn {
  // State
  title: string
  activeView: string
  isPrevDisabled: boolean
  isNextDisabled: boolean
  isTodayDisabled: boolean
  
  // Actions
  handlePrev: () => void
  handleNext: () => void
  handleToday: () => void
}

// Helper function that mirrors FullCalendar's rangeContainsMarker
const rangeContainsMarker = (range: any, date: any) => {
  return (range.start === null || date >= range.start) &&
         (range.end === null || date < range.end)
}

export function useCalendarToolbar({
  calendarRef,
  currentView,
  freeRoam = false,
  onViewChange
}: UseCalendarToolbarProps): UseCalendarToolbarReturn {
  const { isRTL } = useLanguage()
  const [title, setTitle] = useState("")
  const [activeView, setActiveView] = useState(currentView)
  const [isPrevDisabled, setIsPrevDisabled] = useState(false)
  const [isNextDisabled, setIsNextDisabled] = useState(false)
  const [isTodayDisabled, setIsTodayDisabled] = useState(false)

  // Update active view when currentView prop changes
  useEffect(() => {
    setActiveView(currentView)
  }, [currentView])

  // Function to update button states based on FullCalendar's internal logic
  const updateButtonStates = useCallback(() => {
    if (!calendarRef?.current?.getApi) return

    try {
      const calendarApi = calendarRef.current.getApi()
      if (!calendarApi) return

      // Get calendar's internal state
      const state = calendarApi.currentData
      if (!state) return

      // Update title - this will use the calendar's locale-aware formatting
      const viewTitle = state.viewTitle || ""
      setTitle(viewTitle)

      // Update active view from calendar state
      const viewType = state.viewSpec?.type
      if (viewType) {
        setActiveView(viewType)
      }

      // Check if we can navigate prev/next using FullCalendar's internal logic
      const dateProfile = state.dateProfile
      const dateProfileGenerator = state.dateProfileGenerator
      const currentDate = state.currentDate
      const nowDate = state.dateEnv?.createMarker ? state.dateEnv.createMarker(new Date()) : new Date()

      if (dateProfile && dateProfileGenerator && currentDate && dateProfileGenerator.build) {
        try {
          // Build date profiles exactly like FullCalendar does
          // The false parameter means don't force to valid date profiles
          const todayInfo = dateProfileGenerator.build(nowDate, undefined, false)
          const prevInfo = dateProfileGenerator.buildPrev(dateProfile, currentDate, false)
          const nextInfo = dateProfileGenerator.buildNext(dateProfile, currentDate, false)
          
          // Today button is enabled if today is valid AND not in current range
          // This matches the exact logic from buildToolbarProps
          const isTodayEnabled = todayInfo.isValid && !rangeContainsMarker(dateProfile.currentRange, nowDate)
          setIsTodayDisabled(!isTodayEnabled)
          
          // Prev/Next buttons match the isValid property directly
          setIsPrevDisabled(!prevInfo.isValid)
          setIsNextDisabled(!nextInfo.isValid)
        } catch (err) {
          console.warn("Error checking navigation state:", err)
          // Set safe defaults
          setIsPrevDisabled(false)
          setIsNextDisabled(false)
          setIsTodayDisabled(false)
        }
      } else {
        // If calendar data is not ready, set safe defaults
        setIsPrevDisabled(false)
        setIsNextDisabled(false)
        setIsTodayDisabled(false)
      }
    } catch (error) {
      console.error("Error updating button states:", error)
      // Set safe defaults on error
      setIsPrevDisabled(false)
      setIsNextDisabled(false)
      setIsTodayDisabled(false)
    }
  }, [calendarRef])

  // Set up event listeners for calendar state changes
  useEffect(() => {
    if (!calendarRef?.current?.getApi) return

    const calendarApi = calendarRef.current.getApi()
    if (!calendarApi) return

    // Initial update
    updateButtonStates()

    // Define all event handlers
    const handleDatesSet = () => {
      updateButtonStates()
    }

    const handleViewDidMount = () => {
      updateButtonStates()
    }

    const handleEventSet = () => {
      // Update on any event changes as they might affect navigation
      updateButtonStates()
    }

    // Add event listeners for all relevant calendar events
    calendarApi.on('datesSet', handleDatesSet)
    calendarApi.on('viewDidMount', handleViewDidMount)
    calendarApi.on('eventsSet', handleEventSet)

    // Also listen for any rerenders/updates using a polling mechanism for edge cases
    // This ensures we catch any state changes that might not emit events
    const pollInterval = setInterval(() => {
      updateButtonStates()
    }, 500) // Check every 500ms

    // Cleanup
    return () => {
      clearInterval(pollInterval)
      calendarApi.off('datesSet', handleDatesSet)
      calendarApi.off('viewDidMount', handleViewDidMount)
      calendarApi.off('eventsSet', handleEventSet)
    }
  }, [calendarRef, updateButtonStates])

  // Update button states when isRTL changes to ensure title is re-rendered with new locale
  useEffect(() => {
    // Small delay to ensure calendar has updated its locale
    const timer = setTimeout(() => {
      updateButtonStates()
    }, 100)
    return () => clearTimeout(timer)
  }, [isRTL, updateButtonStates])

  // Force update when view changes
  useEffect(() => {
    updateButtonStates()
  }, [currentView, updateButtonStates])

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (!calendarRef?.current?.getApi) return
    const calendarApi = calendarRef.current.getApi()
    calendarApi.prev()
    // Force immediate update after navigation
    setTimeout(updateButtonStates, 0)
  }, [calendarRef, updateButtonStates])

  const handleNext = useCallback(() => {
    if (!calendarRef?.current?.getApi) return
    const calendarApi = calendarRef.current.getApi()
    calendarApi.next()
    // Force immediate update after navigation
    setTimeout(updateButtonStates, 0)
  }, [calendarRef, updateButtonStates])

  const handleToday = useCallback(() => {
    if (!calendarRef?.current?.getApi) return
    const calendarApi = calendarRef.current.getApi()
    calendarApi.today()
    // Force immediate update after navigation
    setTimeout(updateButtonStates, 0)
  }, [calendarRef, updateButtonStates])

  return {
    // State
    title,
    activeView,
    isPrevDisabled,
    isNextDisabled,
    isTodayDisabled,
    
    // Actions
    handlePrev,
    handleNext,
    handleToday
  }
} 