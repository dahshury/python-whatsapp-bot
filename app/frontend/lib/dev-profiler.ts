// Dev-only lightweight profiler helpers
// Logs every Nth call to avoid flooding the console

export const devProfilerEnabled: boolean =
	process.env.NODE_ENV !== "production";

export function count(label: string, every: number = 50): void {
	if (!devProfilerEnabled || typeof window === "undefined") return;
	try {
		const g = window as any;
		g.__dbgCounts = g.__dbgCounts || Object.create(null);
		const next = ((g.__dbgCounts[label] as number) || 0) + 1;
		g.__dbgCounts[label] = next;
		if (next <= 5 || next % every === 0) {
			// eslint-disable-next-line no-console
			console.log(`[DBG] ${label} x${next}`);
		}
	} catch {}
}

export function mark(label: string): void {
	if (!devProfilerEnabled) return;
	try {
		// eslint-disable-next-line no-console
		console.log(`[DBG] ${label}`);
	} catch {}
}

export function reportTop(limit: number = 10): void {
	if (!devProfilerEnabled || typeof window === "undefined") return;
	try {
		const g = window as any;
		const counts: Record<string, number> = g.__dbgCounts || {};
		const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
		// eslint-disable-next-line no-console
		console.log(
			"[DBG] Top counters:",
			entries.slice(0, limit).map(([k, v]) => `${k}: ${v}`),
		);
	} catch {}
}

let __dbgInterval: any = null as any;
export function startReporter(
	intervalMs: number = 3000,
	topN: number = 10,
): void {
	if (!devProfilerEnabled || typeof window === "undefined") return;
	try {
		stopReporter();
		__dbgInterval = setInterval(() => reportTop(topN), intervalMs);
		// eslint-disable-next-line no-console
		console.log(`[DBG] reporter started (${intervalMs}ms, top ${topN})`);
	} catch {}
}

export function stopReporter(): void {
	if (!devProfilerEnabled) return;
	try {
		if (__dbgInterval) clearInterval(__dbgInterval);
		__dbgInterval = null;
		// eslint-disable-next-line no-console
		console.log(`[DBG] reporter stopped`);
	} catch {}
}

// Expose helpers globally for quick console use
try {
	if (typeof window !== "undefined") {
		const g = window as any;
		g.__dbgReportTop = (n?: number) => reportTop(n);
		g.__dbgStartReporter = (ms?: number, n?: number) => startReporter(ms, n);
		g.__dbgStopReporter = () => stopReporter();
	}
} catch {}
