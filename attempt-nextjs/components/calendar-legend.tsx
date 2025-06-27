/**
 * Calendar Legend Component
 * 
 * Displays a compact one-line legend for different reservation types with their corresponding colors.
 * Shows conversations and cancellations only in free roam mode.
 */

"use client"

import { useLanguage } from '@/lib/language-context'
import { cn } from '@/lib/utils'

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
    <div className={cn(
      "flex items-center justify-center bg-background/50 border rounded-md px-3 py-1.5",
      className
    )}>
      <div className="flex items-center gap-3 text-xs">
        {filteredItems.map((item, index) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm border border-border/50"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium text-muted-foreground whitespace-nowrap">
              {item.label}
            </span>
            {index < filteredItems.length - 1 && (
              <span className="text-muted-foreground/50 ml-1">•</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 