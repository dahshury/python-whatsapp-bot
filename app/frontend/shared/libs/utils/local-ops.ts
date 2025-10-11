export function markLocalOperation(key: string, ttlMs = 5000): void {
	try {
		const g = globalThis as unknown as { __localOps?: Set<string> };
		g.__localOps = g.__localOps || new Set<string>();
		g.__localOps.add(key);
		setTimeout(
			() => {
				try {
					g.__localOps?.delete(key);
				} catch {}
			},
			Math.max(0, ttlMs)
		);
	} catch {}
}

export function isLocalOperation(key: string): boolean {
	try {
		const g = globalThis as unknown as { __localOps?: Set<string> };
		return !!g.__localOps?.has(key);
	} catch {
		return false;
	}
}
