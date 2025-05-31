"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Moon, Sun, Languages, Globe, Eye, EyeOff, Copy, Calendar, Settings } from "lucide-react"
import { useTheme } from "next-themes"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/language-context"
import { useSettings } from "@/lib/settings-context"

export function GlobalSettings() {
  const { isRTL, setIsRTL } = useLanguage()
  const { freeRoam, setFreeRoam, showDualCalendar, setShowDualCalendar } = useSettings()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleLanguageToggle = (checked: boolean) => {
    setIsRTL(checked)
    toast({
      title: checked ? "تم التبديل إلى العربية" : "Switched to English",
      duration: 2000,
    })
  }

  const handleThemeToggle = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light"
    setTheme(newTheme)
    toast({
      title: `Switched to ${newTheme} mode`,
      duration: 2000,
    })
  }

  const handleFreeRoamToggle = (checked: boolean) => {
    setFreeRoam(checked)
    toast({
      title: checked ? "Free roam enabled" : "Free roam disabled",
      description: checked ? "Past events are now visible" : "Past events are now hidden",
      duration: 2000,
    })
  }

  const handleDualCalendarToggle = (checked: boolean) => {
    setShowDualCalendar(checked)
    toast({
      title: checked ? "Dual calendar enabled" : "Dual calendar disabled",
      description: checked ? "Second calendar is now visible" : "Single calendar view",
      duration: 2000,
    })
  }

  return (
    <TooltipProvider>
      <div className="absolute top-4 right-4 z-50">
        {/* Settings Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-accent/50 border"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">{isRTL ? "الإعدادات" : "Settings"}</h4>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "تخصيص إعدادات التطبيق" : "Configure your app preferences"}
                </p>
              </div>
              
              <div className="space-y-4">
                {/* Language Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Languages className="h-4 w-4" />
                      {isRTL ? "اللغة" : "Language"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "التبديل بين العربية والإنجليزية" : "Switch between Arabic and English"}
                    </p>
                  </div>
                  <Switch
                    checked={isRTL}
                    onCheckedChange={handleLanguageToggle}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      {isRTL ? "الوضع الليلي" : "Dark Mode"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "التبديل بين الوضع الليلي والنهاري" : "Toggle between light and dark themes"}
                    </p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={handleThemeToggle}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {/* Free Roam Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      {freeRoam ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {isRTL ? "التنقل الحر" : "Free Roam"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "عرض وتعديل الأحداث السابقة" : "View and edit past events"}
                    </p>
                  </div>
                  <Switch
                    checked={freeRoam}
                    onCheckedChange={handleFreeRoamToggle}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {/* Dual Calendar Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      {showDualCalendar ? <Copy className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                      {isRTL ? "التقويم المزدوج" : "Dual Calendar"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "عرض تقويمين جنباً إلى جنب" : "Show two calendars side by side"}
                    </p>
                  </div>
                  <Switch
                    checked={showDualCalendar}
                    onCheckedChange={handleDualCalendarToggle}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  )
} 