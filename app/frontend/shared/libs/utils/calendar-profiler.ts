/*
 * Calendar Profiler - lightweight logging helpers with session scoping.
 * Use to collect counts/timings you can paste for debugging.
 */

const RANDOM_STRING_RADIX = 36;
const RANDOM_STRING_START = 2;
const RANDOM_STRING_LENGTH = 8;

let sessionId: string | null = null;

export function getCalendarSessionId(): string {
	if (!sessionId) {
		const rnd = Math.random()
			.toString(RANDOM_STRING_RADIX)
			.slice(RANDOM_STRING_START, RANDOM_STRING_LENGTH);
		sessionId = `${new Date().toISOString()}_${rnd}`;
	}
	return sessionId;
}

export function profileMark(
	_label: string,
	_fields?: Record<string, unknown>
): void {
	// No-op profiling stub for compile-time compatibility
}

export function profileTimeStart(
	_key: string,
	_fields?: Record<string, unknown>
): number {
	return performance.now();
}

export function profileTimeEnd(
	_key: string,
	_start: number,
	_fields?: Record<string, unknown>
): void {
	// No-op profiling stub for compile-time compatibility
}

export function profileCount(
	_label: string,
	_count: number,
	_fields?: Record<string, unknown>
): void {
	// No-op profiling stub for compile-time compatibility
}
