import { callPythonBackendCached } from "@/shared/libs/backend";
import { preloadPathModules } from "@/shared/libs/prefetch/registry";
import type { PrefetchQueryPayload, PrefetchResolver } from "./types";

type DashboardStatsResponse = {
  success?: boolean;
  data?: {
    reservations?: number;
    cancellations?: number;
    [key: string]: unknown;
  };
};

export const dashboardResolver: PrefetchResolver = async () => {
  // Silently ignore errors from preloading path modules
  await preloadPathModules("/dashboard").catch(() => {
    // Ignore module preload errors
  });

  const queries: PrefetchQueryPayload[] = [];

  try {
    const stats = await callPythonBackendCached<DashboardStatsResponse>(
      "/stats",
      undefined,
      { revalidate: 120, keyParts: ["prefetch", "dashboard", "stats"] }
    );
    if (stats?.success && stats.data) {
      queries.push({ key: ["dashboard", "stats"], data: stats.data });
    }
  } catch (_error) {
    // Silently ignore prefetch errors - prefetch is optional
  }

  return {
    success: true,
    payload: queries.length ? { queries } : {},
  };
};
