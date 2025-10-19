/**
 * Error Logging Utility
 * Centralizes error tracking and monitoring across the application
 */

export type ErrorContext = {
	component?: string;
	action?: string;
	userId?: string;
	feature?: string;
	metadata?: Record<string, unknown>;
};

export type ErrorLog = {
	timestamp: string;
	message: string;
	stack?: string;
	context: ErrorContext;
	severity: "low" | "medium" | "high" | "critical";
};

const MAX_STORED_ERRORS = 50;
const ERROR_STORAGE_KEY = "app:error_logs";

/**
 * Get stored error logs from localStorage
 */
export function getStoredErrorLogs(): ErrorLog[] {
	if (typeof window === "undefined") {
		return [];
	}

	try {
		const stored = localStorage.getItem(ERROR_STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

/**
 * Save error log to localStorage
 */
function saveErrorLog(log: ErrorLog): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		const logs = getStoredErrorLogs();
		logs.unshift(log);

		// Keep only recent errors
		const trimmed = logs.slice(0, MAX_STORED_ERRORS);
		localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(trimmed));
	} catch {
		// Silently fail if localStorage is unavailable
	}
}

/**
 * Log error to external monitoring service (e.g., Sentry, LogRocket)
 */
function logToMonitoringService(error: Error, context: ErrorContext): void {
	// TODO: Integrate with Sentry, LogRocket, or your preferred service
	// Example:
	// if (typeof window !== "undefined" && window.__SENTRY__) {
	//   Sentry.captureException(error, { contexts: { app: context } });
	// }

	if (process.env.NODE_ENV === "development") {
		// biome-ignore lint/suspicious/noConsole: Debug logging in development
		console.error(`[${context.component}]`, error.message, context);
	}
}

/**
 * Main error logging function
 */
export function logError(
	error: Error | string,
	context: ErrorContext = {}
): void {
	const errorMessage = error instanceof Error ? error.message : String(error);
	const errorStack = error instanceof Error ? error.stack : undefined;

	// Determine severity
	const severity: ErrorLog["severity"] =
		context.feature === "calendar" ? "critical" : "high";

	const log: ErrorLog = {
		timestamp: new Date().toISOString(),
		message: errorMessage,
		...(errorStack ? { stack: errorStack } : {}),
		context,
		severity,
	};

	// Store locally
	saveErrorLog(log);

	// Send to monitoring service
	if (error instanceof Error) {
		logToMonitoringService(error, context);
	}
}

/**
 * Clear stored error logs
 */
export function clearErrorLogs(): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		localStorage.removeItem(ERROR_STORAGE_KEY);
	} catch {
		// Silently fail
	}
}

/**
 * Export error logs as JSON (for debugging)
 */
export function exportErrorLogs(): string {
	const logs = getStoredErrorLogs();
	return JSON.stringify(logs, null, 2);
}
