import {
	buildConversationOptions,
	buildReservationOptions,
	MS_PER_DAY,
	PREFETCH_RANGE,
	PREFETCH_STALE_TIME_MS,
	rangeQueryKey,
	toIso,
} from "@shared/libs/ws/range-utils";

type NeighborRange = {
	fromDate: string;
	toDate: string;
	includeConversations?: boolean;
};

export function generateNeighborRanges(range: NeighborRange): NeighborRange[] {
	const out: NeighborRange[] = [];
	const d0 = new Date(range.fromDate);
	const d1 = new Date(range.toDate);
	if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) {
		return out;
	}
	const spanMs = Math.max(1, d1.getTime() - d0.getTime() + MS_PER_DAY);
	for (let i = -PREFETCH_RANGE; i <= PREFETCH_RANGE; i += 1) {
		if (i === 0) {
			continue;
		}
		const start = new Date(d0.getTime() + i * spanMs);
		const end = new Date(d1.getTime() + i * spanMs);
		out.push({
			fromDate: toIso(start),
			toDate: toIso(end),
			...(range.includeConversations ? { includeConversations: true } : {}),
		});
	}
	return out;
}

export async function prefetchNeighbor(
	neighborRange: NeighborRange,
	queryClient: import("@tanstack/react-query").QueryClient
) {
	const qKey = rangeQueryKey(neighborRange);
	if (queryClient.getQueryData(qKey)) {
		return;
	}
	await queryClient.prefetchQuery({
		queryKey: qKey,
		queryFn: async ({ signal }) => {
			const apiMod = await import("@shared/libs/api/index");
			const resOpts = buildReservationOptions(neighborRange);
			const convOpts = buildConversationOptions(neighborRange);
			const [resResp, convResp] = await Promise.all([
				apiMod.fetchReservations(resOpts, signal).catch(() => ({ data: {} })),
				convOpts
					? apiMod
							.fetchConversations(convOpts, signal)
							.catch(() => ({ data: {} }))
					: Promise.resolve({ data: {} }),
			]);
			const nextRes =
				(
					resResp as {
						data?: Record<string, import("@/entities/event").Reservation[]>;
					}
				).data || {};
			const nextConv =
				(
					convResp as {
						data?: Record<
							string,
							import("@/entities/conversation").ConversationMessage[]
						>;
					}
				).data || {};
			return { res: nextRes, conv: nextConv };
		},
		staleTime: PREFETCH_STALE_TIME_MS,
	});
}
