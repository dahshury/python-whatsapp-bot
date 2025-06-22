"use client"

import dynamic from "next/dynamic"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useLanguage } from "@/lib/language-context"
import { useSettings } from "@/lib/settings-context"
import { CalendarSkeleton } from "@/components/calendar-skeleton"
import { CalendarLegend } from "@/components/calendar-legend"
import { DockNav } from "@/components/dock-nav"

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

  return (
    <SidebarInset>
      <header className="relative flex h-16 shrink-0 items-center justify-center border-b px-4">
        <SidebarTrigger className="absolute left-4" />
        <DockNav className="mt-0" />
        <div className="absolute right-4">
          <CalendarLegend freeRoam={freeRoam} className="h-10" />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 h-[calc(100vh-4rem)]">
        {showDualCalendar ? (
          <DualCalendarComponent freeRoam={freeRoam} />
        ) : (
          <div className="flex-1 flex flex-col">
            <FullCalendarComponent freeRoam={freeRoam} />
          </div>
        )}
      </div>
    </SidebarInset>
  )
}
