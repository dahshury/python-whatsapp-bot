"use client"

import type * as React from "react"
import { Calendar, Clock } from 'lucide-react'
// import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { PrayerTimesWidget } from "@/components/prayer-times-widget"
// import { VacationPeriods } from "@/components/vacation-periods"
import { useLanguage } from "@/lib/language-context"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isRTL } = useLanguage()
  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          <span className="font-semibold">{isRTL ? "مدير الحجوزات" : "Reservation Manager"}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {isRTL ? "مواقيت الصلاة" : "Prayer Times"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <PrayerTimesWidget />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
