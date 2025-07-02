"use client"

import { lazy, Suspense } from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useLanguage } from "@/lib/language-context"
import { useSettings } from "@/lib/settings-context"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { DockNav } from "@/components/dock-nav"

const DashboardView = lazy(() => 
  import("@/components/dashboard-view").then(module => ({
    default: module.DashboardView
  }))
)

export default function DashboardPage() {
  const { isRTL } = useLanguage()
  const { freeRoam } = useSettings()

  return (
    <SidebarInset>
      <header className="relative flex h-16 shrink-0 items-center justify-center border-b px-4">
        <SidebarTrigger className="absolute left-4" />
        <DockNav className="mt-0" />
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardView />
        </Suspense>
      </div>
    </SidebarInset>
  )
}
