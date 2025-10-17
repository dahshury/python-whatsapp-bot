// Centralized logger utility gated by NEXT_PUBLIC_LOG_LEVEL
// Levels: debug < info < warn < error < silent

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const ORDER: Record<Exclude<LogLevel, "silent">, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

const MIN_LEVEL: LogLevel =
	(process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase() as LogLevel) ||
	(process.env.NODE_ENV === "production" ? "warn" : "debug");

function shouldLog(level: Exclude<LogLevel, "silent">): boolean {
	if (MIN_LEVEL === "silent") {
		return false;
	}
	const min = ORDER[MIN_LEVEL as Exclude<LogLevel, "silent">] ?? ORDER.warn;
	return ORDER[level] >= min;
}

export const logger = {
	debug: (..._args: unknown[]) => {
		if (shouldLog("debug") && typeof console !== "undefined") {
			// Logger implementation would go here
		}
	},
	info: (..._args: unknown[]) => {
		if (shouldLog("info") && typeof console !== "undefined") {
			// Logger implementation would go here
		}
	},
	warn: (..._args: unknown[]) => {
		if (shouldLog("warn") && typeof console !== "undefined") {
			// Logger implementation would go here
		}
	},
	error: (..._args: unknown[]) => {
		if (shouldLog("error") && typeof console !== "undefined") {
			// Logger implementation would go here
		}
	},
};

export type { LogLevel };
