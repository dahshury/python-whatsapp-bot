import type { EventChangeArg } from "@fullcalendar/core";

type EventChangeDeps = {
	onEventChange?: (info: EventChangeArg) => void;
};

export function createEventChangeHandler({ onEventChange }: EventChangeDeps) {
	return function eventChange(info: EventChangeArg) {
		const eventId: string | undefined = info?.event?.id;
		if (!eventId) {
			return;
		}
		try {
			const depth = Number(
				(globalThis as { __suppressEventChangeDepth?: number })
					.__suppressEventChangeDepth ?? 0
			);
			if (depth > 0) {
				return;
			}
		} catch {
			// Event change callback may fail in some contexts
		}
		onEventChange?.(info);
	};
}
