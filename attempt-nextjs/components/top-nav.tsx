"use client"

import * as React from "react"
import Link from "next/link"
import {
  Calendar,
  BarChart3,
  Settings,
  Moon,
  Sun,
  Languages,
  Eye,
  Copy,
  Plane,
  LayoutDashboard,
  View,
  ChevronDown
} from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
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

export function TopNav() {
  const { isRTL, setIsRTL } = useLanguage()
  const { freeRoam, setFreeRoam, showDualCalendar, setShowDualCalendar } =
    useSettings()
  const { recordingState } = useVacation()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleLanguageToggle = (checked: boolean) => {
    setIsRTL(checked)
    toast.success(checked ? "تم التبديل إلى العربية" : "Switched to English")
  }

  const handleThemeToggle = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light"
    setTheme(newTheme)
    toast.success(
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

    toast.success(
      isRTL
        ? `تم تغيير وضع العرض إلى ${value}`
        : `View mode changed to ${value}`
    )
  }

  const viewMode = freeRoam ? "freeRoam" : showDualCalendar ? "dual" : "default"
  const isRecording = recordingState.periodIndex !== null
  
  return (
    <div className="flex items-center gap-x-1">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Link href="/" className={navigationMenuTriggerStyle()}>
                <Calendar className="h-4 w-4" />
                <span className="ml-2">{isRTL ? "التقويم" : "Calendar"}</span>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href="/dashboard" className={navigationMenuTriggerStyle()}>
                <BarChart3 className="h-4 w-4" />
                <span className="ml-2">{isRTL ? "لوحة التحكم" : "Dashboard"}</span>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className={cn(navigationMenuTriggerStyle(), "group bg-transparent hover:bg-accent focus:bg-accent text-accent-foreground focus:ring-0")}>
            <Settings className="h-4 w-4" />
            <span className="ml-2">{isRTL ? "الإعدادات" : "Settings"}</span>
            <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
            className="w-[500px]" 
            align="end"
            onInteractOutside={(e) => {
              if (isRecording) {
                e.preventDefault();
              }
            }}
          >
            <Tabs defaultValue="layout">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="layout">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  {isRTL ? "التخطيط" : "Layout"}
                  </TabsTrigger>
                <TabsTrigger value="view">
                  <View className="h-4 w-4 mr-2" />
                  {isRTL ? "العرض" : "View"}
                </TabsTrigger>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="vacation" disabled={viewMode !== 'default'} className="w-full">
                        <Plane className="h-4 w-4 mr-2" />
                        {isRTL ? "الإجازة" : "Vacation"}
                      </TabsTrigger>
                    </TooltipTrigger>
                    {viewMode !== 'default' && (
                      <TooltipContent>
                        <p>{isRTL ? "متوفر فقط في العرض الافتراضي" : "Only available in Default view"}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </TabsList>
              <TabsContent value="layout" className="pt-4">
                <div className="space-y-4">
                    {/* Language Toggle */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Languages className="h-4 w-4" />
                          {isRTL ? "اللغة" : "Language"}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {isRTL
                            ? "التبديل بين العربية والإنجليزية"
                            : "Switch between Arabic and English"}
                        </p>
                      </div>
                      <Switch
                        checked={isRTL}
                        onCheckedChange={handleLanguageToggle}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
  
                    {/* Dark Mode Toggle */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          {theme === "dark" ? (
                            <Moon className="h-4 w-4" />
                          ) : (
                            <Sun className="h-4 w-4" />
                          )}
                          {isRTL ? "الوضع الليلي" : "Dark Mode"}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {isRTL
                            ? "التبديل بين الوضع الليلي والنهاري"
                            : "Toggle between light and dark themes"}
                        </p>
                      </div>
                      <Switch
                        checked={theme === "dark"}
                        onCheckedChange={handleThemeToggle}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                </div>
              </TabsContent>
              <TabsContent value="view" className="pt-4">
                 {/* View Mode Radio Group */}
                 <div className="space-y-3 rounded-lg border p-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      {isRTL ? "وضع العرض" : "View Mode"}
                    </Label>
                    <RadioGroup
                      value={viewMode}
                      onValueChange={handleViewModeChange}
                      className="grid grid-cols-3 gap-2"
                    >
                      <div>
                        <RadioGroupItem
                          value="default"
                          id="default-view-tab"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="default-view-tab"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <Calendar className="mb-1 h-4 w-4" />
                          {isRTL ? "الافتراضي" : "Default"}
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="freeRoam"
                          id="free-roam-view-tab"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="free-roam-view-tab"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <Eye className="mb-1 h-4 w-4" />
                          {isRTL ? "التنقل الحر" : "Free Roam"}
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="dual"
                          id="dual-view-tab"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="dual-view-tab"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <Copy className="mb-1 h-4 w-4" />
                          {isRTL ? "مزدوج" : "Dual"}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
              </TabsContent>
              <TabsContent value="vacation">
                <VacationPeriods />
              </TabsContent>
            </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  )
} 