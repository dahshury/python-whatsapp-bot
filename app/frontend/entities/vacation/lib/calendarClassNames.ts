import { cn } from '@shared/libs/utils'

export function createDayCellClassNames(
  currentDate: Date,
  freeRoam: boolean,
  isVacationDate?: (dateStr: string) => boolean
) {
  return (arg: { date: Date }) => {
    const cellDate = arg.date
    const toYMD = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }
    const currentDateStr = toYMD(currentDate)
    const cellDateStr = toYMD(cellDate)

    const isPastDate = cellDate < new Date()
    const vacationClass = isVacationDate && cellDateStr
      ? (isVacationDate(cellDateStr) ? 'vacation-day' : '')
      : ''

    if (!freeRoam && isPastDate) {
      return vacationClass
    }

    if (cellDateStr === currentDateStr) {
      return cn('selected-date-cell', vacationClass)
    }

    return cn(vacationClass, 'cursor-pointer hover:bg-muted')
  }
}

export function createDayHeaderClassNames(
  isVacationDate?: (dateStr: string) => boolean
) {
  return (arg: { date?: Date }) => {
    try {
      const d = arg?.date
      if (!(d && isVacationDate)) return ''
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const ymd = `${y}-${m}-${dd}`
      return isVacationDate(ymd) ? 'vacation-day-header' : ''
    } catch {
      return ''
    }
  }
}


