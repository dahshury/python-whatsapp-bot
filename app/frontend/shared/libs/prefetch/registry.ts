type PreloadFn = () => Promise<unknown> | unknown

const pathRegistry = new Map<string, Set<PreloadFn>>()

export function registerPrefetchModules(pathname: string, fn: PreloadFn): void {
	if (!pathRegistry.has(pathname)) {
		pathRegistry.set(pathname, new Set())
	}
	pathRegistry.get(pathname)?.add(fn)
}

export async function preloadPathModules(pathname: string): Promise<void> {
	const fns = pathRegistry.get(pathname)
	if (!fns || fns.size === 0) {
		return
	}
	await Promise.allSettled(Array.from(fns, (fn) => Promise.resolve(fn())))
}

export function getRegisteredPaths(): string[] {
	return Array.from(pathRegistry.keys())
}
