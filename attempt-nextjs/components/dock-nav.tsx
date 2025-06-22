"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  Settings2,
  View,
  Palette
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

export function DockNav({ className = "" }: { className?: string } = {}) {
  const pathname = usePathname()
  const { isRTL, setIsRTL } = useLanguage()
  const { freeRoam, setFreeRoam, showDualCalendar, setShowDualCalendar, theme: appTheme, setTheme: setAppTheme } =
    useSettings()
  const { recordingState } = useVacation()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("general")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Reset to general tab if vacation tab is selected but disabled
  const viewMode = freeRoam ? "freeRoam" : showDualCalendar ? "dual" : "default"
  React.useEffect(() => {
    if (activeTab === "vacation" && viewMode !== "default") {
      setActiveTab("general")
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
      <Dock direction="middle" className={cn("mt-4", className)}>
        {/* Navigation Items */}
        <DockIcon>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                aria-label={isRTL ? "التقويم" : "Calendar"}
                className={cn(
                  buttonVariants({ 
                    variant: isActive("/") ? "default" : "ghost", 
                    size: "icon" 
                  }),
                  "size-9 rounded-full transition-all duration-200",
                  isActive("/") && "shadow-lg"
                )}
              >
                <Calendar className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRTL ? "التقويم" : "Calendar"}</p>
            </TooltipContent>
          </Tooltip>
        </DockIcon>

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
              className="w-auto max-w-[500px]"
              onInteractOutside={(e) => {
                if (isRecording) {
                  e.preventDefault();
                }
              }}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">
                    <Settings2 className="h-4 w-4 mr-2" />
                    {isRTL ? "عام" : "General"}
                  </TabsTrigger>
                  <TabsTrigger value="view">
                    <View className="h-4 w-4 mr-2" />
                    {isRTL ? "العرض" : "View"}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="vacation" 
                    disabled={viewMode !== 'default'} 
                    className={cn(
                      "w-full relative",
                      viewMode !== 'default' && "cursor-not-allowed"
                    )}
                  >
                    <Plane className="h-4 w-4 mr-2" />
                    {isRTL ? "الإجازة" : "Vacation"}
                    {viewMode !== 'default' && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="absolute inset-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isRTL ? "متوفر فقط في العرض الافتراضي" : "Only available in Default view"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="pt-4">
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
                  </div>
                </TabsContent>

                <TabsContent value="view" className="pt-4 space-y-4">
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
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
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
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
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
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <Copy className="mb-1 h-4 w-4" />
                          {isRTL ? "مزدوج" : "Dual"}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Theme Selector */}
                  <div className="space-y-3 rounded-lg border p-3 relative">
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
                      onValueChange={(value) => {
                        setAppTheme(value)
                        const themeName = value === 'theme-default' ? 'Default' : 
                                        value === 'theme-amethyst-haze' ? 'Amethyst Haze' : 
                                        value === 'theme-mocha-mousse' ? 'Mocha Mousse' :
                                        value === 'theme-neo-brutalism' ? 'Neo Brutalism' :
                                        value === 'theme-perpetuity' ? 'Perpetuity' :
                                        value === 'theme-retro-arcade' ? 'Retro Arcade' :
                                        value === 'theme-starry-night' ? 'Starry Night' :
                                        value === 'theme-ghibli-studio' ? 'Ghibli Studio' :
                                        value === 'theme-valorant' ? 'Valorant' :
                                        'Art Deco'
                        toast(
                          isRTL
                            ? `تم تغيير المظهر إلى ${themeName}`
                            : `Theme changed to ${themeName}`
                        )
                      }}
                      className="grid grid-cols-3 gap-2"
                    >
                      <div>
                        <RadioGroupItem
                          value="theme-default"
                          id="default-theme"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="default-theme"
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <div className="flex gap-1 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#171717' }}></div>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a1a1aa' }}></div>
                          </div>
                          <span className="text-xs">Default</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="theme-amethyst-haze"
                          id="amethyst-theme"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="amethyst-theme"
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <div className="flex gap-1 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8a79ab' }}></div>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e6a5b8' }}></div>
                          </div>
                          <span className="text-xs">Amethyst Haze</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="theme-mocha-mousse"
                          id="mocha-theme"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="mocha-theme"
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <div className="flex gap-1 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#b28068' }}></div>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d9a066' }}></div>
                          </div>
                          <span className="text-xs">Mocha Mousse</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="theme-neo-brutalism"
                          id="brutalism-theme"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="brutalism-theme"
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <div className="flex gap-1 mb-1">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff3333', border: '2px solid #000' }}></div>
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ffff00', border: '2px solid #000' }}></div>
                          </div>
                          <span className="text-xs">Neo Brutalism</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="theme-perpetuity"
                          id="perpetuity-theme"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="perpetuity-theme"
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <div className="flex gap-1 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#17a2b8' }}></div>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#5ddcdc' }}></div>
                          </div>
                          <span className="text-xs">Perpetuity</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="theme-retro-arcade"
                          id="retro-arcade-theme"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="retro-arcade-theme"
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <div className="flex gap-1 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e649a7' }}></div>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#43baba' }}></div>
                          </div>
                          <span className="text-xs">Retro Arcade</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="theme-starry-night"
                          id="starry-night-theme"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="starry-night-theme"
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <div className="flex gap-1 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4775a3' }}></div>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e6c962' }}></div>
                          </div>
                          <span className="text-xs">Starry Night</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="theme-ghibli-studio"
                          id="ghibli-studio-theme"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="ghibli-studio-theme"
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <div className="flex gap-1 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#99b576' }}></div>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d4a576' }}></div>
                          </div>
                          <span className="text-xs">Ghibli Studio</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="theme-valorant"
                          id="valorant-theme"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="valorant-theme"
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <div className="flex gap-1 mb-1">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff4655', border: '0px' }}></div>
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ffd700', border: '0px' }}></div>
                          </div>
                          <span className="text-xs">Valorant</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="theme-art-deco"
                          id="art-deco-theme"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="art-deco-theme"
                          className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
                        >
                          <div className="flex gap-1 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d4af37' }}></div>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#cc7a00' }}></div>
                          </div>
                          <span className="text-xs">Art Deco</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </TabsContent>

                <TabsContent value="vacation">
                  {activeTab === "vacation" && <VacationPeriods />}
                </TabsContent>
              </Tabs>
            </PopoverContent>
          </Popover>
        </DockIcon>
      </Dock>
    </TooltipProvider>
  )
} 