import { useEffect } from "react";

export function useDataProviderReady(
	provider: unknown,
	cb?: (p: unknown) => void
): void {
	useEffect(() => {
		if (provider && cb) {
			cb(provider);
		}
	}, [provider, cb]);
}
