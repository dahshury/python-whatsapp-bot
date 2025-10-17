// Simple dedup guard for rapid successive eventChange triggers
// Ensures we don't process identical changes twice within a short window

const KEY_TTL_MS = 1500;

// Persist across hot reloads within the same runtime
const guard: Map<string, number> = ((): Map<string, number> => {
	try {
		const g = (
			globalThis as unknown as { __dualHandlersGuard?: Map<string, number> }
		).__dualHandlersGuard;
		if (g) {
			return g;
		}
		const m = new Map<string, number>();
		(
			globalThis as unknown as { __dualHandlersGuard?: Map<string, number> }
		).__dualHandlersGuard = m;
		return m;
	} catch {
		return new Map<string, number>();
	}
})();

export function shouldSkipEventChange(info: {
	event?: { id?: unknown; startStr?: string; start?: Date | null };
}): boolean {
	try {
		const ev = info?.event as
			| { id?: unknown; startStr?: string; start?: Date | null }
			| undefined;
		const idPart = ev?.id != null ? String(ev.id) : "";
		const startPart = ((): string => {
			if (!ev) {
				return "";
			}
			if (typeof ev.startStr === "string" && ev.startStr) {
				return ev.startStr;
			}
			const d = ev.start instanceof Date ? ev.start : null;
			return d && !Number.isNaN(d.getTime()) ? d.toISOString() : "";
		})();
		const key = `${idPart}:${startPart}`;
		if (!key || key === ":") {
			return false;
		}
		const now = Date.now();
		const last = guard.get(key);
		if (last && now - last < KEY_TTL_MS) {
			return true;
		}
		guard.set(key, now);
		return false;
	} catch {
		return false;
	}
}
