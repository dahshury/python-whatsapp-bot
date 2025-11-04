export type VacationPeriod = { start: Date; end: Date }

export function createVacationDateChecker(periods: VacationPeriod[]) {
    return (dateStr: string): boolean => {
        if (!Array.isArray(periods) || periods.length === 0) return false
        for (const period of periods) {
            const start = period.start
            const end = period.end
            if (!(start instanceof Date) || !(end instanceof Date)) continue
            const vacationStart = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
            const vacationEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
            if (dateStr >= vacationStart && dateStr <= vacationEnd) return true
        }
        return false
    }
}














