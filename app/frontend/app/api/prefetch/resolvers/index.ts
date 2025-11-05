import type { NextRequest } from "next/server";
import { dashboardResolver } from "./dashboard";
import { defaultResolver } from "./default";
import { documentsResolver } from "./documents";
import { homeResolver } from "./home";
import type { PrefetchResolver, PrefetchResponse } from "./types";

const resolverMap: Array<{
  test: (pathname: string) => boolean;
  resolver: PrefetchResolver;
}> = [
  {
    test: (pathname) => pathname === "/" || pathname === "",
    resolver: homeResolver,
  },
  {
    test: (pathname) => pathname === "/dashboard",
    resolver: dashboardResolver,
  },
  {
    test: (pathname) => pathname === "/documents",
    resolver: documentsResolver,
  },
];

export function resolvePrefetch(
  pathname: string,
  request: NextRequest
): Promise<PrefetchResponse> {
  const matched = resolverMap.find((entry) => entry.test(pathname));
  const resolver = matched?.resolver ?? defaultResolver;
  return resolver(pathname, request);
}
