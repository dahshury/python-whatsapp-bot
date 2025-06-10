/**
 * useCalendarState Hook
 * 
 * Custom hook for managing calendar view state, dates, slot times,
 * and UI synchronization. Handles localStorage persistence and 
 * optimized state updates.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { getSlotTimes } from '@/lib/calendar-config'

export interface CalendarStateOptions {
  freeRoam: boolean
  initialView: string
  initialDate?: string
}

export interface CalendarViewState {
  currentView: string
  currentDate: Date
  slotTimes: {
    slotMinTime: string
    slotMaxTime: string
  }
  slotTimesKey: number
  isHydrated: boolean
  isChangingHours: boolean
}

export interface CalendarStateActions {
  setCurrentView: (view: string) => void
  setCurrentDate: (date: Date) => void
  updateSlotTimes: (date: Date, force?: boolean) => void
  setIsChangingHours: (changing: boolean) => void
}

export type UseCalendarStateReturn = CalendarViewState & CalendarStateActions

/**
 * Custom hook for managing calendar state
 */
export function useCalendarState(options: CalendarStateOptions): UseCalendarStateReturn {
  const [isHydrated, setIsHydrated] = useState(false)
  const [isChangingHours, setIsChangingHours] = useState(false)
  const [slotTimesKey, setSlotTimesKey] = useState(0)

  // Initialize current date from localStorage or options
  const [currentDate, setCurrentDateState] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('calendar-date')
      if (savedDate) {
        const date = new Date(savedDate)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }
    return options.initialDate ? new Date(options.initialDate) : new Date()
  })

  // Initialize current view from localStorage or options
  const initialViewFromStorage = useMemo(() => {
    let viewToUse = options.initialView
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('calendar-view')
      if (savedView) {
        viewToUse = savedView
      }
    }
    return viewToUse
  }, [options.initialView])

  const [currentView, setCurrentViewState] = useState<string>(initialViewFromStorage)
  const viewRef = useRef<string>(initialViewFromStorage)

  // Calculate slot times based on current date and view
  const slotTimes = useMemo(() => 
    getSlotTimes(currentDate, options.freeRoam, currentView), 
    [currentDate, options.freeRoam, currentView]
  )

  /**
   * Hydration effect
   */
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  /**
   * Save view to localStorage when it changes after hydration
   */
  useEffect(() => {
    if (isHydrated && currentView) {
      localStorage.setItem('calendar-view', currentView)
      viewRef.current = currentView
    }
  }, [currentView, isHydrated])

  /**
   * Save date to localStorage when it changes after hydration
   */
  useEffect(() => {
    if (isHydrated && currentDate) {
      localStorage.setItem('calendar-date', currentDate.toISOString())
    }
  }, [currentDate, isHydrated])

  /**
   * Update slot times when dependencies change
   */
  useEffect(() => {
    setSlotTimesKey(prevKey => prevKey + 1)
  }, [options.freeRoam, currentDate, currentView])

  /**
   * Set current view with validation
   */
  const setCurrentView = useCallback((view: string) => {
    if (view !== currentView) {
      setCurrentViewState(view)
    }
  }, [currentView])

  /**
   * Set current date with validation
   */
  const setCurrentDate = useCallback((date: Date) => {
    if (date.getTime() !== currentDate.getTime()) {
      setCurrentDateState(date)
    }
  }, [currentDate])

  /**
   * Update slot times with optional force refresh
   */
  const updateSlotTimes = useCallback((date: Date, force = false) => {
    // In free roam mode, slot times never change (always 00:00-24:00)
    if (options.freeRoam && !force) {
      return
    }

    const oldSlotTimes = getSlotTimes(currentDate, options.freeRoam, currentView)
    const newSlotTimes = getSlotTimes(date, options.freeRoam, currentView)

    // Check if slot times are actually changing
    const isTimeChange = 
      oldSlotTimes.slotMinTime !== newSlotTimes.slotMinTime || 
      oldSlotTimes.slotMaxTime !== newSlotTimes.slotMaxTime

    if (isTimeChange || force) {
      setIsChangingHours(isTimeChange)
      setCurrentDate(date)
      setSlotTimesKey(prev => prev + 1)
    } else {
      setCurrentDate(date)
    }
  }, [currentDate, currentView, options.freeRoam, setCurrentDate])

  return {
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
  }
} 