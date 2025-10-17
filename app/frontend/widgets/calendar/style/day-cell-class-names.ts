type DayCellArgs = {
	currentDate: Date;
	freeRoam: boolean;
	isVacationDate?: (d: Date) => boolean;
};

export function createDayCellClassNames({
	currentDate,
	freeRoam,
	isVacationDate,
}: DayCellArgs) {
	return function dayCellClassNames(arg: { date: Date }): string[] {
		const classes: string[] = [];
		// Mark today for styling parity; FullCalendar already adds fc-day-today
		if (
			arg.date.getFullYear() === currentDate.getFullYear() &&
			arg.date.getMonth() === currentDate.getMonth() &&
			arg.date.getDate() === currentDate.getDate()
		) {
			classes.push("is-current-day");
		}
		if (!freeRoam && isVacationDate && isVacationDate(arg.date)) {
			classes.push("vacation-day");
		}
		return classes;
	};
}
