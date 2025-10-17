type IsVacationDate = ((ymd: string) => boolean) | undefined;

export function createDayHeaderClassNames(args: {
	isVacationDate: IsVacationDate;
}) {
	const { isVacationDate } = args;

	return (arg: { date?: Date }) => {
		try {
			const d = arg?.date;
			if (!(d && isVacationDate)) {
				return "";
			}
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, "0");
			const dd = String(d.getDate()).padStart(2, "0");
			const ymd = `${y}-${m}-${dd}`;
			return isVacationDate(ymd) ? "vacation-day-header" : "";
		} catch {
			return "";
		}
	};
}
