import { useMemo } from "react";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import type { WsStoreState } from "@/shared/libs/store/ws-store";
import { useWsStore } from "@/shared/libs/store/ws-store";

export function useConversationsDataSel() {
	const conversations = useWsStore((s: WsStoreState) => s.conversations);
	const isLoading = useWsStore((s: WsStoreState) => s.isLoading);
	const error = useWsStore((s: WsStoreState) => s.error);
	return useMemo(
		() => ({
			conversations: conversations as Record<string, ConversationMessage[]>,
			isLoading,
			error,
		}),
		[conversations, isLoading, error]
	);
}

export function useReservationsDataSel() {
	const reservations = useWsStore((s: WsStoreState) => s.reservations);
	const isLoading = useWsStore((s: WsStoreState) => s.isLoading);
	const error = useWsStore((s: WsStoreState) => s.error);
	return useMemo(
		() => ({
			reservations: reservations as Record<string, Reservation[]>,
			isLoading,
			error,
		}),
		[reservations, isLoading, error]
	);
}

export function useVacationsDataSel() {
	const vacations = useWsStore((s: WsStoreState) => s.vacations);
	const isLoading = useWsStore((s: WsStoreState) => s.isLoading);
	const error = useWsStore((s: WsStoreState) => s.error);
	return useMemo(
		() => ({ vacations, isLoading, error }),
		[vacations, isLoading, error]
	);
}
