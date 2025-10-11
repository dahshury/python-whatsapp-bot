import type { VacationDateChecker } from "@shared/libs/calendar/calendar-callbacks";
import { useMemo } from "react";

interface VacationPeriod {
	start: Date;
	end: Date;
}

export function useVacationDateChecker(vacationPeriods: VacationPeriod[]): VacationDateChecker {
	return useMemo(() => {
		return (dateStr: string) => {
			if (vacationPeriods.length === 0) {
				return false;
			}

			for (const period of vacationPeriods) {
				// Create date strings from vacation period dates using same format as dateStr
				const vacationStart = `${period.start.getFullYear()}-${String(period.start.getMonth() + 1).padStart(2, "0")}-${String(period.start.getDate()).padStart(2, "0")}`;
				const vacationEnd = `${period.end.getFullYear()}-${String(period.end.getMonth() + 1).padStart(2, "0")}-${String(period.end.getDate()).padStart(2, "0")}`;

				const isInRange = dateStr >= vacationStart && dateStr <= vacationEnd;

				if (isInRange) {
					return true;
				}
			}
			return false;
		};
	}, [vacationPeriods]);
}
