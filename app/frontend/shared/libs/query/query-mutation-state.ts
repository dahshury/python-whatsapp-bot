import type { Mutation } from "@tanstack/react-query";
import { useMutationState } from "@tanstack/react-query";

export function usePendingSaves(): boolean {
	const pending = useMutationState({
		filters: { mutationKey: ["save"] },
		select: (m: Mutation) =>
			(m.state as unknown as { status: string })?.status === "pending",
	});
	return pending.some(Boolean);
}

export function usePendingReservations(): boolean {
	const pending = useMutationState({
		filters: { mutationKey: ["reservation"] },
		select: (m: Mutation) =>
			(m.state as unknown as { status: string })?.status === "pending",
	});
	return pending.some(Boolean);
}

export function useAnyPending(): boolean {
	const pending = useMutationState({
		filters: {},
		select: (m: Mutation) =>
			(m.state as unknown as { status: string })?.status === "pending",
	});
	return pending.some(Boolean);
}
