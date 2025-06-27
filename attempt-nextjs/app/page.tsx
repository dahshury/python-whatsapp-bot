"use client"

import React from "react"
import dynamic from "next/dynamic"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useLanguage } from "@/lib/language-context"
import { useSettings } from "@/lib/settings-context"
import { CalendarSkeleton } from "@/components/calendar-skeleton"
import { CalendarLegend } from "@/components/calendar-legend"
import { DockNav } from "@/components/dock-nav"
import { DockNavSimple } from "@/components/dock-nav-simple"

// Lazy load the calendar components to improve initial load time
const FullCalendarComponent = dynamic(() => import("@/components/fullcalendar").then(mod => ({ default: mod.FullCalendarComponent })), {
  loading: () => <CalendarSkeleton />,
  ssr: false
})

const DualCalendarComponent = dynamic(() => import("@/components/dual-calendar").then(mod => ({ default: mod.DualCalendarComponent })), {
  loading: () => <CalendarSkeleton />,
  ssr: false
})

export default function HomePage() {
  const { isRTL } = useLanguage()
  const { freeRoam, showDualCalendar } = useSettings()
  
  // Create refs for calendar components
  const calendarRef = React.useRef<{ calendarRef: React.RefObject<any>, currentView: string }>(null)
  const [currentView, setCurrentView] = React.useState('multiMonthYear')
  
  // Track the actual calendar ref that gets exposed by FullCalendarComponent
  const [actualCalendarRef, setActualCalendarRef] = React.useState<React.RefObject<any> | null>(null)
  
  // Callback ref to capture the calendar instance when it becomes available
  const calendarCallbackRef = React.useCallback((calendarInstance: any) => {
    // Store the full calendar instance in the ref
    if (calendarRef.current !== calendarInstance) {
      (calendarRef as React.MutableRefObject<any>).current = calendarInstance
    }
    
    // Update the actual calendar ref state for DockNav
    if (calendarInstance?.calendarRef) {
      setActualCalendarRef(calendarInstance.calendarRef)
    } else {
      setActualCalendarRef(null)
    }
  }, [])
  
  // Dual calendar refs and view states
  const dualCalendarRef = React.useRef<{ 
    leftCalendarRef: React.RefObject<any>, 
    rightCalendarRef: React.RefObject<any>, 
    leftView: string, 
    rightView: string 
  }>(null)
  const [leftCalendarView, setLeftCalendarView] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dual-left-calendar-view') || 'multiMonthYear'
    }
    return 'multiMonthYear'
  })
  const [rightCalendarView, setRightCalendarView] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dual-right-calendar-view') || 'multiMonthYear'
    }
    return 'multiMonthYear'
  })

  // Save to localStorage when views change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dual-left-calendar-view', leftCalendarView)
    }
  }, [leftCalendarView])

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dual-right-calendar-view', rightCalendarView)
    }
  }, [rightCalendarView])
  
  // Track dual calendar refs directly
  const [leftCalendarRef, setLeftCalendarRef] = React.useState<React.RefObject<any> | null>(null)
  const [rightCalendarRef, setRightCalendarRef] = React.useState<React.RefObject<any> | null>(null)
  
  // Callback ref to capture the dual calendar refs when they become available
  const dualCalendarCallbackRef = React.useCallback((dualCalendarInstance: any) => {
    if (dualCalendarInstance) {
      setLeftCalendarRef(dualCalendarInstance.leftCalendarRef)
      setRightCalendarRef(dualCalendarInstance.rightCalendarRef)
    } else {
      setLeftCalendarRef(null)
      setRightCalendarRef(null)
    }
  }, [])

  return (
    <SidebarInset>
      <header className="relative flex h-16 shrink-0 items-center border-b px-4">
        <SidebarTrigger className="absolute left-4" />
        
        {showDualCalendar ? (
          // Dual Calendar Mode Header Layout
          <div className="flex-1 flex items-center justify-between gap-4">
            {/* Left Calendar DockNav */}
            <div className="flex-1 flex justify-center">
              <DockNav 
                className="mt-0" 
                calendarRef={leftCalendarRef}
                currentCalendarView={leftCalendarView}
                onCalendarViewChange={setLeftCalendarView}
                navigationOnly={true}
              />
            </div>
            
            {/* Middle Simple DockNav */}
            <DockNavSimple
              currentCalendarView={leftCalendarView}
              onCalendarViewChange={(view) => {
                // Apply view change to both calendars
                setLeftCalendarView(view);
                setRightCalendarView(view);
                setCurrentView(view);
              }}
              leftCalendarView={leftCalendarView}
              rightCalendarView={rightCalendarView}
              onLeftCalendarViewChange={setLeftCalendarView}
              onRightCalendarViewChange={setRightCalendarView}
              leftCalendarRef={leftCalendarRef}
              rightCalendarRef={rightCalendarRef}
              isDualMode={true}
              className="mt-0"
            />
            
            {/* Right Calendar DockNav */}
            <div className="flex-1 flex justify-center">
              <DockNav 
                className="mt-0" 
                calendarRef={rightCalendarRef}
                currentCalendarView={rightCalendarView}
                onCalendarViewChange={setRightCalendarView}
                navigationOnly={true}
              />
            </div>
          </div>
        ) : (
          // Single Calendar Mode Header Layout
          <DockNav 
            className="mt-0" 
            calendarRef={actualCalendarRef}
            currentCalendarView={currentView}
            onCalendarViewChange={setCurrentView}
          />
        )}
        
        <div className="absolute right-4">
          <CalendarLegend freeRoam={freeRoam} className="h-10" />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 h-[calc(100vh-4rem)]">
        {showDualCalendar ? (
          <DualCalendarComponent 
            ref={dualCalendarCallbackRef}
            freeRoam={freeRoam}
            initialLeftView={leftCalendarView}
            initialRightView={rightCalendarView}
            onLeftViewChange={setLeftCalendarView}
            onRightViewChange={setRightCalendarView}
            onViewChange={setCurrentView}
          />
        ) : (
          <FullCalendarComponent 
            ref={calendarCallbackRef}
            freeRoam={freeRoam} 
            initialView={currentView}
            onViewChange={setCurrentView}
          />
        )}
      </div>
    </SidebarInset>
  )
}
