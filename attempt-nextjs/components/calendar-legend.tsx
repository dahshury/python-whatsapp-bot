/**
 * Calendar Legend Component
 * 
 * Displays a compact one-line legend for different reservation types with their corresponding colors.
 * Shows conversations and cancellations only in free roam mode.
 */

"use client"

import { useLanguage } from '@/lib/language-context'

interface CalendarLegendProps {
  freeRoam?: boolean
  className?: string
}

export function CalendarLegend({ freeRoam = false, className = "" }: CalendarLegendProps) {
  const { isRTL } = useLanguage()

  const legendItems = [
    {
      key: 'check-up',
      color: '#10b981', // Green - matches the default FullCalendar primary color
      label: isRTL ? 'كشف' : 'Check-up',
      showAlways: true
    },
    {
      key: 'follow-up',
      color: '#3b82f6', // Blue - matches reservation-type-1 styling
      label: isRTL ? 'مراجعة' : 'Follow-up',
      showAlways: true
    },
    {
      key: 'conversation',
      color: '#EDAE49', // Orange/Yellow - matches conversation-event styling
      label: isRTL ? 'محادثة' : 'Conversation',
      showAlways: false // Only show in free roam
    },
    {
      key: 'cancelled',
      color: '#e5e1e0', // Gray - matches cancelled styling
      label: isRTL ? 'ملغي' : 'Cancelled',
      showAlways: false // Only show in free roam
    }
  ]

  const filteredItems = legendItems.filter(item => item.showAlways || freeRoam)

  return (
    <div className={`bg-background border rounded-lg px-3 py-2 ${className}`}>
      <div className="flex items-center gap-4 flex-wrap">
        {filteredItems.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-sm flex-shrink-0 border"
              style={{ backgroundColor: item.color }}
            ></div>
            <span className="text-sm font-medium text-foreground">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
} 