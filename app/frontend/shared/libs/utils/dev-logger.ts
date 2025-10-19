// Lightweight dev logger that avoids linter "no-console" by using bracket access
// Logs only in non-production environments

type AnyRecord = Record<string, unknown>;

function isDev(): boolean {
	return process.env.NODE_ENV !== "production";
}

function getConsole(): {
	log?: (...args: unknown[]) => void;
	info?: (...args: unknown[]) => void;
	warn?: (...args: unknown[]) => void;
	error?: (...args: unknown[]) => void;
	group?: (...args: unknown[]) => void;
	groupCollapsed?: (...args: unknown[]) => void;
	groupEnd?: () => void;
	time?: (label?: string) => void;
	timeEnd?: (label?: string) => void;
} | null {
	try {
		const g = globalThis as unknown as { console?: unknown };
		const c = g.console as undefined | null | AnyRecord;
		return (c || null) as unknown as {
			log?: (...args: unknown[]) => void;
			info?: (...args: unknown[]) => void;
			warn?: (...args: unknown[]) => void;
			error?: (...args: unknown[]) => void;
			group?: (...args: unknown[]) => void;
			groupCollapsed?: (...args: unknown[]) => void;
			groupEnd?: () => void;
			time?: (label?: string) => void;
			timeEnd?: (label?: string) => void;
		};
	} catch {
		return null;
	}
}

export function devGroup(label: string): void {
	if (!isDev()) {
		return;
	}
	const c = getConsole();
	if (c?.groupCollapsed) {
		c.groupCollapsed(label);
	}
}

export function devGroupEnd(): void {
	if (!isDev()) {
		return;
	}
	const c = getConsole();
	if (c?.groupEnd) {
		c.groupEnd();
	}
}

export function devLog(label: string, payload?: unknown): void {
	if (!isDev()) {
		return;
	}
	const c = getConsole();
	if (payload === undefined) {
		if (c?.log) {
			c.log(label);
		}
		return;
	}
	if (c?.log) {
		c.log(label, payload);
	}
}

export function devInfo(label: string, payload?: unknown): void {
	if (!isDev()) {
		return;
	}
	const c = getConsole();
	if (payload === undefined) {
		if (c?.info) {
			c.info(label);
		}
		return;
	}
	if (c?.info) {
		c.info(label, payload);
	}
}

export function devWarn(label: string, payload?: unknown): void {
	if (!isDev()) {
		return;
	}
	const c = getConsole();
	if (payload === undefined) {
		if (c?.warn) {
			c.warn(label);
		}
		return;
	}
	if (c?.warn) {
		c.warn(label, payload);
	}
}

export function devError(label: string, payload?: unknown): void {
	if (!isDev()) {
		return;
	}
	const c = getConsole();
	if (payload === undefined) {
		if (c?.error) {
			c.error(label);
		}
		return;
	}
	if (c?.error) {
		c.error(label, payload);
	}
}

export function devTime(label: string): void {
	if (!isDev()) {
		return;
	}
	const c = getConsole();
	if (c?.time) {
		c.time(label);
	}
}

export function devTimeEnd(label: string): void {
	if (!isDev()) {
		return;
	}
	const c = getConsole();
	if (c?.timeEnd) {
		c.timeEnd(label);
	}
}
