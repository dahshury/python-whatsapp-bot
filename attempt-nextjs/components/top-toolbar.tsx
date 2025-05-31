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

interface TopToolbarProps {
  isRTL: boolean
  onLanguageChange: (isRTL: boolean) => void
  freeRoam: boolean
  onFreeRoamChange: (freeRoam: boolean) => void
  showDualCalendar: boolean
  onDualCalendarChange: (show: boolean) => void
}

export function TopToolbar({
  isRTL,
  onLanguageChange,
  freeRoam,
  onFreeRoamChange,
  showDualCalendar,
  onDualCalendarChange,
}: TopToolbarProps) {
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
    onLanguageChange(checked)
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
    onFreeRoamChange(checked)
    toast({
      title: checked ? "Free roam enabled" : "Free roam disabled",
      description: checked ? "Past events are now visible" : "Past events are now hidden",
      duration: 2000,
    })
  }

  const handleDualCalendarToggle = (checked: boolean) => {
    onDualCalendarChange(checked)
    toast({
      title: checked ? "Dual calendar enabled" : "Dual calendar disabled",
      description: checked ? "Second calendar is now visible" : "Single calendar view",
      duration: 2000,
    })
  }

  return (
    <TooltipProvider>
      <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-end max-w-7xl ml-auto">
            {/* Settings Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 p-0 bg-background/60 backdrop-blur-sm shadow-sm hover:bg-accent/50"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure your calendar preferences
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Language Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Languages className="h-4 w-4" />
                          {isRTL ? "Language" : "اللغة"}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? "Switch between Arabic and English" : "التبديل بين العربية والإنجليزية"}
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
                          Dark Mode
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Toggle between light and dark themes
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
                          Free Roam
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          View and edit past events
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
                          Dual Calendar
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Show two calendars side by side
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
        </div>
      </div>
    </TooltipProvider>
  )
}
