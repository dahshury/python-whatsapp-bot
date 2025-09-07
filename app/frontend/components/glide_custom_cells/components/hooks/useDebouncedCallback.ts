import { useCallback, useEffect, useRef } from "react";

interface UseDebouncedCallbackReturn<A extends unknown[]> {
	debouncedCallback: (...args: A) => void;
	cancel: () => void;
}

export function useDebouncedCallback<A extends unknown[]>(
	callback: (...args: A) => void,
	delay: number,
): UseDebouncedCallbackReturn<A> {
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const argsRef = useRef<A | undefined>(undefined);

	const cancel = useCallback((): void => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	useEffect(() => cancel, [cancel]);

	const debouncedCallback = useCallback(
		(...args: A) => {
			argsRef.current = args;

			cancel();

			timeoutRef.current = setTimeout(() => {
				if (argsRef.current) {
					callback(...argsRef.current);
					argsRef.current = undefined;
				}
			}, delay);
		},
		[callback, delay, cancel],
	);

	return {
		debouncedCallback,
		cancel,
	};
}
