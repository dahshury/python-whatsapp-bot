"use client";

import { fetchVacations } from "@shared/libs/api";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const STALE_TIME_MINUTES = 5;
const GC_TIME_MINUTES = 10;
const STALE_TIME_5M =
	STALE_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const GC_TIME_10M =
	GC_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

// === Vacation Hooks ===
export function useVacations() {
	return useQuery({
		queryKey: queryKeys.vacations.all,
		queryFn: ({ signal }) => fetchVacations(signal),
		staleTime: STALE_TIME_5M,
		gcTime: GC_TIME_10M,
	});
}
