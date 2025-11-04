import { unstable_cache as nextUnstableCache } from 'next/cache'
import { cache } from 'react'

type UnstableCacheOptions = {
	revalidate: number
}

export function unstableCache<Inputs extends unknown[], Output>(
	fn: (...args: Inputs) => Promise<Output>,
	keyParts: string[],
	options: UnstableCacheOptions
): (...args: Inputs) => Promise<Output> {
	return cache(nextUnstableCache(fn, keyParts, options))
}
