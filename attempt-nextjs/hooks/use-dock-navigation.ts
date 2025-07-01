"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { useSettings } from "@/lib/settings-context"
import { useVacation } from "@/lib/vacation-context"
import { useCalendarToolbar } from "@/hooks/useCalendarToolbar"
import { NavigationContextValue } from "@/types/navigation"

interface UseDockNavigationProps {
  calendarRef?: React.RefObject<any> | null
  currentCalendarView?: string
  onCalendarViewChange?: (view: string) => void
}

export function useDockNavigation({
  calendarRef,
  currentCalendarView = 'multiMonthYear',
  onCalendarViewChange
}: UseDockNavigationProps): NavigationContextValue {
  const pathname = usePathname()
  const router = useRouter()
  const { isRTL } = useLanguage()
  const { freeRoam } = useSettings()
  const { recordingState } = useVacation()
  
  const [mounted, setMounted] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("view")
  const [isHoveringDate, setIsHoveringDate] = React.useState(false)
  
  const fallbackRef = React.useRef<any>(null)
  const effectiveCalendarRef = calendarRef || fallbackRef
  const isCalendarPage = pathname === "/"

  // Auto-switch to general tab when not on calendar page
  React.useEffect(() => {
    if (!isCalendarPage && (activeTab === "view" || activeTab === "vacation")) {
      setActiveTab("general")
    }
  }, [isCalendarPage, activeTab])

  const {
    title,
    activeView,
    isPrevDisabled,
    isNextDisabled,
    isTodayDisabled,
    handlePrev: originalHandlePrev,
    handleNext: originalHandleNext,
    handleToday: originalHandleToday
  } = useCalendarToolbar({
    calendarRef: isCalendarPage && calendarRef ? calendarRef : fallbackRef,
    currentView: currentCalendarView,
    freeRoam,
    onViewChange: onCalendarViewChange
  })

  const handlePrev = React.useCallback(() => {
    if (!isCalendarPage) {
      router.push("/")
    } else {
      originalHandlePrev()
    }
  }, [isCalendarPage, router, originalHandlePrev])

  const handleNext = React.useCallback(() => {
    if (!isCalendarPage) {
      router.push("/")
    } else {
      originalHandleNext()
    }
  }, [isCalendarPage, router, originalHandleNext])

  const handleToday = React.useCallback(() => {
    if (!isCalendarPage) {
      router.push("/")
    } else {
      originalHandleToday()
    }
  }, [isCalendarPage, router, originalHandleToday])

  const handleCalendarViewChange = React.useCallback((view: string) => {
    if (calendarRef?.current) {
      const api = calendarRef.current.getApi?.()
      if (api) {
        api.changeView(view)
      }
    }
    onCalendarViewChange?.(view)
  }, [calendarRef, onCalendarViewChange])

  const isActive = React.useCallback((href: string) => {
    if (href === "/" && pathname === "/") return true
    if (href !== "/" && pathname.startsWith(href)) return true
    return false
  }, [pathname])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const { freeRoam: isFreeRoam, showDualCalendar } = useSettings()
  const viewMode = isFreeRoam ? "freeRoam" : showDualCalendar ? "dual" : "default"

  React.useEffect(() => {
    if (activeTab === "vacation" && viewMode !== "default") {
      setActiveTab("view")
    }
  }, [viewMode, activeTab])

  return {
    state: {
      mounted,
      isHoveringDate,
      activeTab
    },
    handlers: {
      setIsHoveringDate,
      setActiveTab,
      handleLanguageToggle: () => {}, // These will be handled by individual components
      handleThemeToggle: () => {},    // These will be handled by individual components
      handleViewModeChange: () => {}, // These will be handled by individual components
      handleCalendarViewChange
    },
    computed: {
      viewMode,
      isRecording: recordingState.periodIndex !== null,
      isActive
    },
    // Additional properties for easier access
    navigation: {
      title,
      activeView,
      isPrevDisabled,
      isNextDisabled,
      isTodayDisabled,
      handlePrev,
      handleNext,
      handleToday,
      isCalendarPage,
      isRTL
    }
  } as NavigationContextValue & { navigation: any }
} 