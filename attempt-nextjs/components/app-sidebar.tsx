"use client"

import type * as React from "react"
import { Calendar, BarChart3, Settings, Clock } from 'lucide-react'
import Link from "next/link"

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
import { useLanguage } from "@/lib/language-context"

const getNavigationItems = (isRTL: boolean) => [
  {
    title: isRTL ? "التقويم" : "Calendar",
    url: "/",
    icon: Calendar,
  },
  {
    title: isRTL ? "لوحة التحكم" : "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: isRTL ? "الإعدادات" : "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isRTL } = useLanguage()
  const navigationItems = getNavigationItems(isRTL)
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
          <SidebarGroupLabel>{isRTL ? "التنقل" : "Navigation"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild={item.title !== "Settings"} 
                    disabled={item.title === "Settings"}
                    className={item.title === "Settings" ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {item.title === "Settings" ? (
                      <div className="flex items-center gap-2">
                        <item.icon />
                        <span>{item.title}</span>
                      </div>
                    ) : (
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="px-3 py-2">
          <Separator />
        </div>

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
