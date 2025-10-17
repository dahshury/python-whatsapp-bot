export function getWindowProperty<T>(property: string, defaultValue: T): T {
	if (typeof window === "undefined") {
		return defaultValue;
	}
	return (
		((window as unknown as Record<string, unknown>)[property] as T) ??
		defaultValue
	);
}

export function setWindowProperty<T>(property: string, value: T): void {
	if (typeof window !== "undefined") {
		(window as unknown as Record<string, unknown>)[property] = value;
	}
}
