"use client"

import dynamic from "next/dynamic"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { useLanguage } from "@/lib/language-context"
import { useSettings } from "@/lib/settings-context"
import { CalendarSkeleton } from "@/components/calendar-skeleton"

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
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>
                {isRTL ? (showDualCalendar ? "التقويم المزدوج" : "التقويم") : (showDualCalendar ? "Dual Calendar" : "Calendar")}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 min-h-[calc(100vh-4rem)]">
        {showDualCalendar ? (
          <DualCalendarComponent freeRoam={freeRoam} />
        ) : (
        <FullCalendarComponent freeRoam={freeRoam} />
        )}
      </div>
    </SidebarInset>
  )
}
