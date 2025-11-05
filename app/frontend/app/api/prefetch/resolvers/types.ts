import type { NextRequest } from "next/server";

export type PrefetchQueryPayload = {
  key: unknown[];
  data: unknown;
};

export type PrefetchPayload = {
  queries?: PrefetchQueryPayload[];
};

export type PrefetchResponse =
  | { success: true; payload?: PrefetchPayload }
  | { success: false; error: string };

export type PrefetchResolver = (
  pathname: string,
  request: NextRequest
) => Promise<PrefetchResponse>;
