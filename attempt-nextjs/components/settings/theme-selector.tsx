"use client"

import * as React from "react"
import { Moon, Sun, Palette } from "lucide-react"
import { useTheme } from "next-themes"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { THEME_OPTIONS, getThemeName } from "./theme-data"
import { useSettings } from "@/lib/settings-context"

interface ThemeSelectorProps {
  isRTL?: boolean
}

export function ThemeSelector({ isRTL = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  const { theme: appTheme, setTheme: setAppTheme } = useSettings()

  const handleThemeToggle = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light"
    setTheme(newTheme)
    toast(
      isRTL
        ? `تم التبديل إلى الوضع ${newTheme === "dark" ? "الليلي" : "النهاري"}`
        : `Switched to ${newTheme} mode`
    )
  }

  const handleAppThemeChange = (value: string) => {
    setAppTheme(value)
    const themeName = getThemeName(value)
    toast(
      isRTL
        ? `تم تغيير المظهر إلى ${themeName}`
        : `Theme changed to ${themeName}`
    )
  }

  return (
    <div className="space-y-3 rounded-lg border p-3 relative bg-background/40 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <span className="text-sm font-medium">{isRTL ? "المظهر" : "Theme"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="dark-mode-switch" className="cursor-pointer">
            {theme === "dark" ? (
              <Moon className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Label>
          <Switch
            id="dark-mode-switch"
            checked={theme === "dark"}
            onCheckedChange={handleThemeToggle}
            className="data-[state=checked]:bg-primary scale-75"
          />
        </div>
      </div>
      
      <RadioGroup
        value={appTheme}
        onValueChange={handleAppThemeChange}
        className="grid grid-cols-3 gap-2"
      >
        {THEME_OPTIONS.map((themeOption) => {
          const isRounded = !themeOption.borderStyle || themeOption.borderStyle === "0px"
          
          return (
            <div key={themeOption.value}>
              <RadioGroupItem
                value={themeOption.value}
                id={themeOption.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={themeOption.value}
                className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-1.5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
              >
                <div className="flex gap-1 mb-0.5">
                  <div 
                    className={`w-3 h-3 ${isRounded ? 'rounded-full' : 'rounded'}`}
                    style={{ 
                      backgroundColor: themeOption.colors.primary,
                      ...(themeOption.borderStyle && themeOption.borderStyle !== "0px" && {
                        border: themeOption.borderStyle
                      })
                    }}
                  />
                  <div 
                    className={`w-3 h-3 ${isRounded ? 'rounded-full' : 'rounded'}`}
                    style={{ 
                      backgroundColor: themeOption.colors.secondary,
                      ...(themeOption.borderStyle && themeOption.borderStyle !== "0px" && {
                        border: themeOption.borderStyle
                      })
                    }}
                  />
                </div>
                <span className="text-xs">
                  {isRTL ? themeOption.nameRTL : themeOption.name}
                </span>
              </Label>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
} 