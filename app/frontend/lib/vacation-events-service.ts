export class VacationEventsService {
	static updateVacationEvents(
		api: any,
		vacationPeriods: Array<{ start: Date; end: Date }>,
	) {
		if (!api) return;
		try {
			// Remove existing background events tagged as vacation
			const existing = api
				.getEvents()
				.filter((e: any) => e.extendedProps?.__vacation);
			existing.forEach((e: any) => e.remove());

			// Add background events to indicate vacation periods (exclusive end)
			vacationPeriods.forEach((vp) => {
				const start = new Date(vp.start);
				const endExclusive = new Date(
					new Date(vp.end).getTime() + 24 * 60 * 60 * 1000,
				);
				api.addEvent({
					start,
					end: endExclusive,
					display: "background",
					overlap: false,
					editable: false,
					backgroundColor: "#ffcccb",
					extendedProps: { __vacation: true },
				});
			});
		} catch {
			// ignore rendering errors
		}
	}
}
