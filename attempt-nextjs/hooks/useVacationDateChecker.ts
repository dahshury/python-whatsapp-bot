import { useMemo } from 'react'
import type { VacationDateChecker } from '@/lib/calendar-callbacks'

interface VacationPeriod {
  start: Date
  end: Date
}

export function useVacationDateChecker(vacationPeriods: VacationPeriod[]): VacationDateChecker {
  return useMemo(() => {
    if (vacationPeriods.length === 0) return () => false
    
    return (dateStr: string) => {
      for (const period of vacationPeriods) {
        // Create date strings from vacation period dates using same format as dateStr
        const vacationStart = `${period.start.getFullYear()}-${String(period.start.getMonth() + 1).padStart(2, '0')}-${String(period.start.getDate()).padStart(2, '0')}`
        const vacationEnd = `${period.end.getFullYear()}-${String(period.end.getMonth() + 1).padStart(2, '0')}-${String(period.end.getDate()).padStart(2, '0')}`
        
        if (dateStr >= vacationStart && dateStr <= vacationEnd) {
          return true
        }
      }
      return false
    }
  }, [vacationPeriods])
} 