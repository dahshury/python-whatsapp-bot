import { useMemo } from "react";
import type { VacationDateChecker } from "@/lib/calendar-callbacks";

interface VacationPeriod {
	start: Date;
	end: Date;
}

export function useVacationDateChecker(
	vacationPeriods: VacationPeriod[],
): VacationDateChecker {
	return useMemo(() => {
		console.log(
			"🏖️ VacationDateChecker: Creating checker with periods:",
			vacationPeriods.map((p) => ({
				start: p.start.toISOString(),
				end: p.end.toISOString(),
				startLocal: p.start.toString(),
				endLocal: p.end.toString(),
			})),
		);

		return (dateStr: string) => {
			if (vacationPeriods.length === 0) {
				return false;
			}

			for (const period of vacationPeriods) {
				// Create date strings from vacation period dates using same format as dateStr
				const vacationStart = `${period.start.getFullYear()}-${String(period.start.getMonth() + 1).padStart(2, "0")}-${String(period.start.getDate()).padStart(2, "0")}`;
				const vacationEnd = `${period.end.getFullYear()}-${String(period.end.getMonth() + 1).padStart(2, "0")}-${String(period.end.getDate()).padStart(2, "0")}`;

				const isInRange = dateStr >= vacationStart && dateStr <= vacationEnd;

				if (dateStr === "2025-01-15" || dateStr.includes("2025-01-1")) {
					console.log("🏖️ VacationDateChecker: Checking date", dateStr, {
						period: { start: vacationStart, end: vacationEnd },
						originalPeriod: {
							start: period.start.toString(),
							end: period.end.toString(),
						},
						comparison: {
							dateStr,
							vacationStart,
							vacationEnd,
							"dateStr >= vacationStart": dateStr >= vacationStart,
							"dateStr <= vacationEnd": dateStr <= vacationEnd,
						},
						isInRange,
					});
				}

				if (isInRange) {
					return true;
				}
			}
			return false;
		};
	}, [vacationPeriods]);
}
