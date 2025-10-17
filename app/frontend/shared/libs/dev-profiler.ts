// Dev-only lightweight profiler helpers
// Logs every Nth call to avoid flooding the console

export const devProfilerEnabled: boolean = false;

export function count(_label: string, _every = 50): void {
	// No-op: profiler disabled
}

export function mark(_label: string): void {
	// No-op: profiler disabled
}

export function reportTop(_limit = 10): void {
	// No-op: profiler disabled
}

export function startReporter(_intervalMs = 3000, _topN = 10): void {
	// No-op: profiler disabled
	return;
}

export function stopReporter(): void {
	// No-op: profiler disabled
}

// Dev profiler disabled: no global debug bindings
