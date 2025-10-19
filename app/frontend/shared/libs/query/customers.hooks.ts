"use client";

import { fetchCustomer, saveCustomerDocument } from "@shared/libs/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const STALE_TIME_MINUTES = 1;
const GC_TIME_MINUTES = 10;
const STALE_TIME_1M =
	STALE_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const GC_TIME_10M =
	GC_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export function useCustomer(waId: string) {
	return useQuery({
		queryKey: queryKeys.customers.detail(waId),
		queryFn: ({ signal }) => fetchCustomer(waId, signal),
		enabled: waId.length !== 0,
		staleTime: STALE_TIME_1M,
		gcTime: GC_TIME_10M,
		select: (data: unknown) => data, // keep raw; UI can select further if needed
		placeholderData: (prev) => prev, // keep previous while loading
	});
}

export function useSaveCustomerDocument() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ["save", "customer"],
		mutationFn: (input: {
			waId: string;
			document?: unknown;
			name?: string | null;
			age?: number | null;
			ar?: boolean;
		}) => saveCustomerDocument(input),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.customers.detail(variables.waId),
			});
		},
	});
}
