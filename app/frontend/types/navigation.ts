import * as React from "react"

export interface DockNavProps {
  className?: string
  currentCalendarView?: string
  calendarRef?: React.RefObject<any> | null
  onCalendarViewChange?: (view: string) => void
  navigationOnly?: boolean
  variant?: 'default' | 'left' | 'right'
}

export interface NavigationControlsProps {
  isRTL?: boolean
  isCalendarPage?: boolean
  isPrevDisabled?: boolean
  isNextDisabled?: boolean
  onPrev?: () => void
  onNext?: () => void
  className?: string
}

export interface NavigationDateButtonProps {
  title?: string
  isRTL?: boolean
  isCalendarPage?: boolean
  isTodayDisabled?: boolean
  onToday?: () => void
  navigationOnly?: boolean
  className?: string
}

export interface NavigationLinksProps {
  isRTL?: boolean
  isActive?: (href: string) => boolean
  className?: string
}

export interface ViewMode {
  value: "default" | "freeRoam" | "dual"
  label: string
  labelRTL: string
}

export interface NavigationState {
  mounted: boolean
  isHoveringDate: boolean
  activeTab: string
}

export interface NavigationContextValue {
  state: NavigationState
  handlers: {
    setIsHoveringDate: (value: boolean) => void
    setActiveTab: (value: string) => void
    handleLanguageToggle: (checked: boolean) => void
    handleThemeToggle: (checked: boolean) => void
    handleViewModeChange: (value: ViewMode["value"]) => void
    handleCalendarViewChange: (view: string) => void
  }
  computed: {
    viewMode: ViewMode["value"]
    isRecording: boolean
    isActive: (href: string) => boolean
  }
}

export interface ThemeOption {
  value: string
  name: string
  nameRTL: string
  colors: {
    primary: string
    secondary: string
  }
  borderStyle?: string
} 