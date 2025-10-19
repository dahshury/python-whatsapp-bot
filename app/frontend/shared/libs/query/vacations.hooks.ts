"use client";

import { fetchVacations } from "@shared/libs/api";
import { useQuery } from "@tanstack/react-query";
import type { Vacation } from "@/entities/vacation";
import { queryKeys } from "./query-keys";

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const STALE_TIME_MINUTES = 5;
const GC_TIME_MINUTES = 10;
const STALE_TIME_5M =
	STALE_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const GC_TIME_10M =
	GC_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export function useVacations() {
	return useQuery({
		queryKey: queryKeys.vacations.all,
		queryFn: ({ signal }) => fetchVacations(signal),
		staleTime: STALE_TIME_5M,
		gcTime: GC_TIME_10M,
		select: (data: unknown) => {
			const raw = (data as { data?: Vacation[] })?.data ?? [];
			const list = Array.isArray(raw) ? raw : [];
			const filtered = list.filter((v) => Boolean(v?.start) && Boolean(v?.end));
			const normalized = filtered.map((v, idx) => ({
				id: v.id ?? `${String(v.start)}-${String(v.end)}-${idx}`,
				start: String(v.start),
				end: String(v.end),
			}));
			normalized.sort((a, b) => {
				if (a.start < b.start) {
					return -1;
				}
				if (a.start > b.start) {
					return 1;
				}
				return 0;
			});
			return normalized;
		},
		placeholderData: (prev) => prev,
	});
}
