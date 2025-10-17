export function markLocalOperation(key: string, ttlMs = 5000): void {
	try {
		const g = globalThis as unknown as { __localOps?: Set<string> };
		g.__localOps = g.__localOps || new Set<string>();
		g.__localOps.add(key);
		setTimeout(
			() => {
				try {
					g.__localOps?.delete(key);
				} catch {
					// Silently ignore cleanup errors in timer callback
				}
			},
			Math.max(0, ttlMs)
		);
	} catch {
		// Silently ignore initialization errors
	}
}

export function isLocalOperation(key: string): boolean {
	try {
		const g = globalThis as unknown as { __localOps?: Set<string> };
		return !!g.__localOps?.has(key);
	} catch {
		// Return false on any lookup error
		return false;
	}
}
