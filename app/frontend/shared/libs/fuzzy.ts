import type { FuseOptionKey } from "fuse.js";
import Fuse from "fuse.js";

export type FuzzyKeySpec = Array<string | { name: string; weight?: number }>;

export interface FuzzyOptions {
	keys: FuzzyKeySpec;
	threshold?: number;
	ignoreLocation?: boolean;
	minMatchCharLength?: number;
	includeScore?: boolean;
	shouldSort?: boolean;
}

export function createFuseIndex<T>(list: ReadonlyArray<T>, options: FuzzyOptions): Fuse<T> {
	const {
		keys,
		threshold = 0.32,
		ignoreLocation = true,
		minMatchCharLength = 1,
		includeScore = true,
		shouldSort = true,
	} = options;

	return new Fuse(list as T[], {
		keys: keys as FuseOptionKey<T>[],
		threshold,
		ignoreLocation,
		minMatchCharLength,
		includeScore,
		shouldSort,
	});
}

export function fuzzySearchItems<T>(fuse: Fuse<T>, query: string, limit?: number): T[] {
	const q = (query || "").trim();
	if (!q) return fuse.getIndex() ? ((fuse as unknown as { _docs: T[] })._docs ?? []) : [];
	const results = (
		fuse.search as unknown as (pattern: string, opts?: { limit?: number | undefined }) => Array<{ item: T }>
	)(q, limit === undefined ? undefined : { limit });
	return results.map((r) => r.item);
}
