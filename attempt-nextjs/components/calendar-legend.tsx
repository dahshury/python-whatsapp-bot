/**
 * Calendar Legend Component
 * 
 * Displays a minimized help icon that expands to show legend on hover.
 * Shows conversations and cancellations only in free roam mode.
 */

"use client"

import React from 'react'
import { Info } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { cn } from '@/lib/utils'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

interface CalendarLegendProps {
  freeRoam?: boolean
  className?: string
}

export function CalendarLegend({ freeRoam = false, className = "" }: CalendarLegendProps) {
  const { isRTL } = useLanguage()

  const legendItems = [
    {
      key: 'check-up',
      color: 'var(--fc-reservation-type-0-bg)', // Green - Check-up
      label: isRTL ? 'كشف' : 'Check-up',
      showAlways: true
    },
    {
      key: 'follow-up',
      color: 'var(--fc-reservation-type-1-bg)', // Blue - Follow-up
      label: isRTL ? 'مراجعة' : 'Follow-up',
      showAlways: true
    },
    {
      key: 'conversation',
      color: 'var(--fc-conversation-bg)', // Orange/Yellow - Conversation
      label: isRTL ? 'محادثة' : 'Conversation',
      showAlways: false // Only show in free roam
    }
  ]

  const filteredItems = legendItems.filter(item => item.showAlways || freeRoam)

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-background/95 to-background/90 border border-border/60 rounded-lg shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200 backdrop-blur-sm",
      className
          )}
          aria-label={isRTL ? "إظهار دليل الألوان" : "Show color legend"}
        >
          <Info className="h-3 w-3 text-muted-foreground/80" />
          <div className="flex items-center gap-0.5">
            {filteredItems.slice(0, 3).map((item, index) => (
              <div
                key={item.key}
                className="w-1.5 h-1.5 rounded-full border border-white/30 shadow-sm"
                style={{ backgroundColor: item.color }}
              />
            ))}
          </div>
        </button>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-auto p-3 shadow-lg border-border/80 bg-popover/95 backdrop-blur-sm" 
        side="bottom" 
        align="start"
        sideOffset={8}
      >
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            {isRTL ? "دليل الألوان" : "Legend"}
          </div>
          <div className="flex flex-col gap-1.5">
            {filteredItems.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm border border-border/50 flex-shrink-0 shadow-sm"
              style={{ backgroundColor: item.color }}
            />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
      </HoverCardContent>
    </HoverCard>
  )
} 