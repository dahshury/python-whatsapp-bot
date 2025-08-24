export function isNullOrUndefined(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}

export function notNullOrUndefined<T>(value: T | null | undefined): value is T {
	return !isNullOrUndefined(value);
}

export function requireNonNull<T>(obj: T | null | undefined): T {
	if (isNullOrUndefined(obj)) {
		throw new Error("Value cannot be null or undefined");
	}
	return obj;
}

export function debounce<T extends (...args: any[]) => any>(
	func: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
}

export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number,
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function formatBytes(bytes: number, decimals: number = 2): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

export function deepClone<T>(obj: T): T {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}

	if (obj instanceof Date) {
		return new Date(obj.getTime()) as T;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => deepClone(item)) as T;
	}

	if (typeof obj === "object") {
		const clonedObj: any = {};
		for (const key in obj) {
			if (Object.hasOwn(obj, key)) {
				clonedObj[key] = deepClone(obj[key]);
			}
		}
		return clonedObj;
	}

	return obj;
}

export function arrayEquals<T>(a: T[], b: T[]): boolean {
	if (a.length !== b.length) return false;
	return a.every((val, index) => val === b[index]);
}

export function removeFromArray<T>(array: T[], item: T): T[] {
	const index = array.indexOf(item);
	if (index > -1) {
		return [...array.slice(0, index), ...array.slice(index + 1)];
	}
	return array;
}

export function moveArrayItem<T>(
	array: T[],
	fromIndex: number,
	toIndex: number,
): T[] {
	const result = [...array];
	const [removed] = result.splice(fromIndex, 1);
	result.splice(toIndex, 0, removed);
	return result;
}

export function groupBy<T, K extends keyof any>(
	array: T[],
	key: (item: T) => K,
): Record<K, T[]> {
	return array.reduce(
		(groups, item) => {
			const group = key(item);
			if (!groups[group]) {
				groups[group] = [];
			}
			groups[group].push(item);
			return groups;
		},
		{} as Record<K, T[]>,
	);
}

export function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function toSafeString(value: unknown): string {
	if (isNullOrUndefined(value)) {
		return "";
	}

	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

export function parseWidth(
	width?: "small" | "medium" | "large" | number,
): number | undefined {
	if (isNullOrUndefined(width)) {
		return undefined;
	}

	if (typeof width === "number") {
		return width;
	}

	const widthMapping = {
		small: 75,
		medium: 200,
		large: 400,
	};

	return widthMapping[width];
}

export class ErrorHandler {
	private static errorCallbacks: ((error: Error) => void)[] = [];

	static addErrorCallback(callback: (error: Error) => void): void {
		ErrorHandler.errorCallbacks.push(callback);
	}

	static removeErrorCallback(callback: (error: Error) => void): void {
		const index = ErrorHandler.errorCallbacks.indexOf(callback);
		if (index > -1) {
			ErrorHandler.errorCallbacks.splice(index, 1);
		}
	}

	static handleError(error: Error, context?: string): void {
		console.error(`Error${context ? ` in ${context}` : ""}:`, error);

		ErrorHandler.errorCallbacks.forEach((callback) => {
			try {
				callback(error);
			} catch (callbackError) {
				console.error("Error in error callback:", callbackError);
			}
		});
	}

	static wrapAsync<T extends (...args: any[]) => Promise<any>>(
		fn: T,
		context?: string,
	): T {
		return (async (...args: Parameters<T>) => {
			try {
				return await fn(...args);
			} catch (error) {
				ErrorHandler.handleError(error as Error, context);
				throw error;
			}
		}) as T;
	}

	static wrapSync<T extends (...args: any[]) => any>(
		fn: T,
		context?: string,
	): T {
		return ((...args: Parameters<T>) => {
			try {
				return fn(...args);
			} catch (error) {
				ErrorHandler.handleError(error as Error, context);
				throw error;
			}
		}) as T;
	}
}
