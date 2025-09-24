import * as React from "react";

export function useDebouncedValue<T>(value: T, delayMs = 120): T {
	const [debounced, setDebounced] = React.useState<T>(value);

	React.useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(id);
	}, [value, delayMs]);

	return debounced;
}
