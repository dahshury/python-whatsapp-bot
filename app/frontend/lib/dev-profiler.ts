// Dev-only lightweight profiler helpers
// Logs every Nth call to avoid flooding the console

export const devProfilerEnabled: boolean = false;

export function count(_label: string, _every = 50): void {}

export function mark(_label: string): void {}

export function reportTop(_limit = 10): void {}
export function startReporter(_intervalMs = 3000, _topN = 10): void {
	return;
}

export function stopReporter(): void {}

// Dev profiler disabled: no global debug bindings
