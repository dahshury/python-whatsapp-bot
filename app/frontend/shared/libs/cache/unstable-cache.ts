import { unstable_cache as nextUnstableCache } from "next/cache";
import { cache } from "react";

type UnstableCacheOptions = {
  revalidate: number;
  tags?: string[];
};

export function unstableCache<Inputs extends unknown[], Output>(
  fn: (...args: Inputs) => Promise<Output>,
  keyParts: string[],
  options: UnstableCacheOptions
): (...args: Inputs) => Promise<Output> {
  return cache(
    nextUnstableCache(fn, keyParts, {
      revalidate: options.revalidate,
      ...(options.tags ? { tags: options.tags } : {}),
    })
  );
}
