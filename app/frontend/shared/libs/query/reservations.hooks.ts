"use client";

import {
	cancelReservation,
	fetchReservations,
	modifyReservation,
	reserveTimeSlot,
	undoModifyReservation,
} from "@shared/libs/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Reservation } from "@/entities/event";
import { queryKeys } from "./query-keys";

type ReservationsCache = { data?: Record<string, Reservation[]> };

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const STALE_TIME_SECONDS = 30;
const GC_TIME_MINUTES = 5;
const STALE_TIME_30S = STALE_TIME_SECONDS * MILLISECONDS_PER_SECOND;
const GC_TIME_5M =
	GC_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export function useReservations(options?: {
	future?: boolean;
	includeCancelled?: boolean;
	fromDate?: string;
	toDate?: string;
}) {
	return useQuery({
		queryKey: queryKeys.reservations.list(options),
		queryFn: ({ signal }) => fetchReservations(options, signal),
		staleTime: STALE_TIME_30S,
		gcTime: GC_TIME_5M,
	});
}

function applyReservationUpdateToCache(
	old: ReservationsCache | undefined,
	id: string,
	updates: {
		date: string;
		time: string;
		title?: string;
		type?: number;
		reservationId?: number;
	}
): ReservationsCache | undefined {
	if (!old?.data) {
		return old;
	}
	const waReservations = old.data[id];
	if (!waReservations) {
		return old;
	}
	if (!updates.reservationId) {
		return old;
	}
	const idx = waReservations.findIndex(
		(r) => r.reservation_id === updates.reservationId
	);
	if (idx < 0) {
		return old;
	}
	const updatedReservation = {
		...waReservations[idx],
		date: updates.date,
		time_slot: updates.time,
		...(updates.title ? { customer_name: updates.title } : {}),
		...(typeof updates.type === "number" ? { type: updates.type } : {}),
	} as unknown as Reservation;
	const updatedReservations = [...waReservations];
	updatedReservations[idx] = updatedReservation;
	return { ...old, data: { ...old.data, [id]: updatedReservations } };
}

export function useReserveTimeSlot() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ["reservation", "reserve"],
		mutationFn: (input: {
			id: string;
			title: string;
			date: string;
			time: string;
			type?: number;
			reservation_type?: number;
			max_reservations?: number;
			hijri?: boolean;
			ar?: boolean;
		}) => reserveTimeSlot(input),
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.reservations.all });
			const previousReservations = queryClient.getQueriesData({
				queryKey: queryKeys.reservations.all,
			});
			// Optimistically append a pseudo reservation into any cached maps for this waId
			const optimistic: Reservation = {
				customer_id: variables.id,
				date: variables.date,
				time_slot: variables.time,
				customer_name: variables.title,
				type: typeof variables.type === "number" ? variables.type : 0,
			} as unknown as Reservation;
			queryClient.setQueriesData<ReservationsCache>(
				{ queryKey: queryKeys.reservations.all },
				(old) => {
					if (!old?.data) {
						return old;
					}
					const list = old.data[variables.id] || [];
					const next = {
						...old,
						data: { ...old.data, [variables.id]: [...list, optimistic] },
					};
					return next as ReservationsCache;
				}
			);
			return { previousReservations };
		},
		onError: (_err, _variables, ctx) => {
			if (ctx?.previousReservations) {
				for (const [key, data] of ctx.previousReservations) {
					queryClient.setQueryData(key, data);
				}
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
		},
	});
}

export function useModifyReservation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ["reservation", "modify"],
		mutationFn: ({
			id,
			updates,
		}: {
			id: string;
			updates: {
				date: string;
				time: string;
				title?: string;
				type?: number;
				approximate?: boolean;
				reservationId?: number;
			};
		}) => modifyReservation(id, updates),
		onMutate: async ({ id, updates }) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.reservations.all });
			const previousReservations = queryClient.getQueriesData({
				queryKey: queryKeys.reservations.all,
			});
			queryClient.setQueriesData<ReservationsCache>(
				{ queryKey: queryKeys.reservations.all },
				(old) => applyReservationUpdateToCache(old, id, updates)
			);
			return { previousReservations };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousReservations) {
				for (const [queryKey, data] of context.previousReservations) {
					queryClient.setQueryData(queryKey, data);
				}
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
		},
	});
}

export function useUndoModifyReservation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ["reservation", "undo"],
		mutationFn: (input: {
			reservationId: number;
			originalData: {
				wa_id: string;
				date: string;
				time_slot: string;
				customer_name?: string;
				type?: number;
			};
			ar?: boolean;
		}) => undoModifyReservation(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
		},
	});
}

export function useCancelReservation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ["reservation", "cancel"],
		mutationFn: (input: { id: string; date: string; isLocalized?: boolean }) =>
			cancelReservation(input),
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.reservations.all });
			const previousReservations = queryClient.getQueriesData({
				queryKey: queryKeys.reservations.all,
			});
			queryClient.setQueriesData<ReservationsCache>(
				{ queryKey: queryKeys.reservations.all },
				(old) => {
					if (!old?.data) {
						return old;
					}
					const list = old.data[variables.id] || [];
					const filtered = list.filter((r) => r.date !== variables.date);
					return {
						...old,
						data: { ...old.data, [variables.id]: filtered },
					} as ReservationsCache;
				}
			);
			return { previousReservations };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.previousReservations) {
				for (const [key, data] of ctx.previousReservations) {
					queryClient.setQueryData(key, data);
				}
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
		},
	});
}
