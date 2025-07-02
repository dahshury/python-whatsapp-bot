"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Settings,
  Moon,
  Sun,
  Languages,
  Eye,
  Copy,
  Plane,
  Settings2,
  View,
  Palette,
  Calendar
} from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Dock, DockIcon } from "@/components/ui/dock"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button, buttonVariants } from "@/components/ui/button"
import { StablePopoverButton } from "@/components/ui/stable-popover-button"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/lib/language-context"
import { useSettings } from "@/lib/settings-context"
import { useVacation } from "@/lib/vacation-context"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VacationPeriods } from "@/components/vacation-periods"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getCalendarViewOptions } from "@/components/calendar-toolbar"
import { SettingsTabs } from "@/components/settings"

interface DockNavSimpleProps {
  className?: string
  currentCalendarView?: string
  onCalendarViewChange?: (view: string) => void
  leftCalendarView?: string
  rightCalendarView?: string
  onLeftCalendarViewChange?: (view: string) => void
  onRightCalendarViewChange?: (view: string) => void
  leftCalendarRef?: React.RefObject<any> | null
  rightCalendarRef?: React.RefObject<any> | null
  isDualMode?: boolean
}

interface DualCalendarViewSelectorProps {
  isRTL?: boolean
  leftCalendarView?: string
  rightCalendarView?: string
  onLeftCalendarViewChange?: (view: string) => void
  onRightCalendarViewChange?: (view: string) => void
}

function DualCalendarViewSelector({
  isRTL = false,
  leftCalendarView,
  rightCalendarView,
  onLeftCalendarViewChange,
  onRightCalendarViewChange
}: DualCalendarViewSelectorProps) {
  const viewOptions = getCalendarViewOptions(isRTL)

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground text-center block">
          {isRTL ? "التقويم الأيسر" : "Left Calendar"}
        </Label>
        <RadioGroup
          value={leftCalendarView}
          onValueChange={onLeftCalendarViewChange}
          className="grid grid-cols-2 gap-1"
        >
          {viewOptions.map((option) => (
            <div key={`left-${option.value}`}>
              <RadioGroupItem
                value={option.value}
                id={`left-calendar-view-${option.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`left-calendar-view-${option.value}`}
                className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-1.5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
              >
                <option.icon className="mb-0.5 h-3 w-3" />
                <span className="text-[10px]">{option.label}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground text-center block">
          {isRTL ? "التقويم الأيمن" : "Right Calendar"}
        </Label>
        <RadioGroup
          value={rightCalendarView}
          onValueChange={onRightCalendarViewChange}
          className="grid grid-cols-2 gap-1"
        >
          {viewOptions.map((option) => (
            <div key={`right-${option.value}`}>
              <RadioGroupItem
                value={option.value}
                id={`right-calendar-view-${option.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`right-calendar-view-${option.value}`}
                className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-1.5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
              >
                <option.icon className="mb-0.5 h-3 w-3" />
                <span className="text-[10px]">{option.label}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}

export function DockNavSimple({ 
  className = "", 
  currentCalendarView = 'multiMonthYear', 
  onCalendarViewChange,
  leftCalendarView = 'multiMonthYear',
  rightCalendarView = 'multiMonthYear',
  onLeftCalendarViewChange,
  onRightCalendarViewChange,
  leftCalendarRef,
  rightCalendarRef,
  isDualMode = false
}: DockNavSimpleProps) {
  const pathname = usePathname()
  const { isRTL, setIsRTL } = useLanguage()
  const { freeRoam, setFreeRoam, showDualCalendar, setShowDualCalendar, theme: appTheme, setTheme: setAppTheme } =
    useSettings()
  const { recordingState } = useVacation()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("view")

  const isCalendarPage = pathname === "/"

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Reset to view tab if vacation tab is selected but disabled
  const viewMode = freeRoam ? "freeRoam" : showDualCalendar ? "dual" : "default"
  React.useEffect(() => {
    if (activeTab === "vacation" && viewMode !== "default") {
      setActiveTab("view")
    }
  }, [viewMode, activeTab])

  const handleLanguageToggle = (checked: boolean) => {
    setIsRTL(checked)
    toast(checked ? "تم التبديل إلى العربية" : "Switched to English")
  }

  const handleThemeToggle = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light"
    setTheme(newTheme)
    toast(
      isRTL
        ? `تم التبديل إلى الوضع ${
            newTheme === "dark" ? "الليلي" : "النهاري"
          }`
        : `Switched to ${newTheme} mode`
    )
  }

  const handleViewModeChange = (value: "default" | "freeRoam" | "dual") => {
    const isFreeRoam = value === "freeRoam"
    const isDual = value === "dual"

    setFreeRoam(isFreeRoam)
    setShowDualCalendar(isDual)

    toast(
      isRTL
        ? `تم تغيير وضع العرض إلى ${value}`
        : `View mode changed to ${value}`
    )
  }

  const handleCalendarViewChange = (view: string) => {
    onCalendarViewChange?.(view)
  }

  const handleLeftCalendarViewChange = (view: string) => {
    if (leftCalendarRef?.current) {
      const api = leftCalendarRef.current.getApi?.()
      if (api) {
        api.changeView(view)
      }
    }
    onLeftCalendarViewChange?.(view)
  }

  const handleRightCalendarViewChange = (view: string) => {
    if (rightCalendarRef?.current) {
      const api = rightCalendarRef.current.getApi?.()
      if (api) {
        api.changeView(view)
      }
    }
    onRightCalendarViewChange?.(view)
  }

  const viewOptions = getCalendarViewOptions(isRTL)

  const isRecording = recordingState.periodIndex !== null

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true
    if (href !== "/" && pathname.startsWith(href)) return true
    return false
  }

  if (!mounted) {
    return null
  }

  return (
    <TooltipProvider>
      <Dock direction="middle" className={cn("h-auto min-h-[44px]", className)}>
        <DockIcon>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard"
                aria-label={isRTL ? "لوحة التحكم" : "Dashboard"}
                className={cn(
                  buttonVariants({ 
                    variant: isActive("/dashboard") ? "default" : "ghost", 
                    size: "icon" 
                  }),
                  "size-9 rounded-full transition-all duration-200",
                  isActive("/dashboard") && "shadow-lg"
                )}
              >
                <BarChart3 className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRTL ? "لوحة التحكم" : "Dashboard"}</p>
            </TooltipContent>
          </Tooltip>
        </DockIcon>

        {/* Separator */}
        <Separator orientation="vertical" className="h-full py-2" />

        {/* Settings Popover */}
        <DockIcon>
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <StablePopoverButton
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full"
                    aria-label={isRTL ? "الإعدادات" : "Settings"}
                  >
                    <Settings className="size-4" />
                  </StablePopoverButton>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRTL ? "الإعدادات" : "Settings"}</p>
              </TooltipContent>
            </Tooltip>

            <PopoverContent 
              align="center"
              className="w-auto max-w-[500px] bg-background/70 backdrop-blur-md border-border/40"
              onInteractOutside={(e) => {
                if (isRecording) {
                  e.preventDefault();
                }
              }}
            >
              <SettingsTabs
                isRTL={isRTL}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                currentCalendarView={currentCalendarView}
                onCalendarViewChange={handleCalendarViewChange}
                isCalendarPage={isCalendarPage}
                customViewSelector={
                  isDualMode && viewMode === "dual" ? (
                    <DualCalendarViewSelector
                      isRTL={isRTL}
                      leftCalendarView={leftCalendarView}
                      rightCalendarView={rightCalendarView}
                      onLeftCalendarViewChange={handleLeftCalendarViewChange}
                      onRightCalendarViewChange={handleRightCalendarViewChange}
                    />
                  ) : undefined
                }
              />
            </PopoverContent>
          </Popover>
        </DockIcon>
      </Dock>
    </TooltipProvider>
  )
} 