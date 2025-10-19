import { useWsStore } from "@shared/libs/store/ws-store";
import { mergeConversationMaps } from "@shared/libs/ws/conversation-merge";
import {
	buildConversationOptions,
	buildReservationOptions,
	computeRangeKey,
	rangeQueryKey,
} from "@shared/libs/ws/range-utils";
import type { QueryClient } from "@tanstack/react-query";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";

function boundsSignature(list: Array<{ date?: string }> | undefined): {
	len: number;
	first: string;
	last: string;
} {
	const l = Array.isArray(list) ? list : [];
	const len = l.length;
	const first = (l as Array<{ date?: string }>).at?.(0)?.date ?? "";
	const last = (l as Array<{ date?: string }>).at?.(-1)?.date ?? "";
	return { len, first, last };
}

export async function refreshRangeInternal(
	range:
		| { fromDate?: string; toDate?: string; includeConversations?: boolean }
		| undefined,
	queryClient: QueryClient
) {
	// Guard: apply only if this response matches the latest active range key
	const responseKey = computeRangeKey(range);
	try {
		const mod = await import("@shared/libs/utils/dev-logger");
		mod.devGroup("WS refreshRangeInternal");
		mod.devLog("range", range);
		mod.devLog("rangeKey", computeRangeKey(range));
		mod.devGroupEnd();
	} catch {
		// ignore logging failures
	}
	const apiMod = await import("@shared/libs/api/index");
	const resOpts = buildReservationOptions(range);
	const convOpts = buildConversationOptions(range);
	const [resResp, convResp] = await Promise.all([
		apiMod.fetchReservations(resOpts).catch(() => ({ data: {} })),
		convOpts
			? apiMod.fetchConversations(convOpts).catch(() => ({ data: {} }))
			: Promise.resolve({ data: {} }),
	]);
	const nextRes =
		(resResp as { data?: Record<string, Reservation[]> }).data || {};
	const nextConv =
		(convResp as { data?: Record<string, ConversationMessage[]> }).data || {};

	try {
		const mod = await import("@shared/libs/utils/dev-logger");
		mod.devGroup("WS refreshRangeInternal:response");
		mod.devLog("reservations.keys", Object.keys(nextRes || {}));
		mod.devLog("conversations.keys", Object.keys(nextConv || {}));
		mod.devGroupEnd();
	} catch {
		// ignore
	}

	// Always cache the fetched data regardless of whether user navigated away
	queryClient.setQueryData(rangeQueryKey(range), {
		res: nextRes,
		conv: nextConv,
	});

	// Only apply to store if this range is still active (prevents race condition overwrites)
	const key = responseKey;
	const currentKey = computeRangeKey(useWsStore.getState().activeRange);
	const shouldApply = key === currentKey;
	if (shouldApply) {
		useWsStore.getState().setReservations(nextRes);
		if (range?.includeConversations) {
			const prev = useWsStore.getState().conversations;
			useWsStore
				.getState()
				.setConversations(mergeConversationMaps(prev, nextConv));
		}
	}
}

// Prefetch helpers (moved from provider)
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTE_MS = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const HOUR_MS = MINUTES_PER_HOUR * MINUTE_MS;
const DAY_MS = HOURS_PER_DAY * HOUR_MS;
const NEIGHBOR_PREFETCH_WINDOW = 5 as const;
const PREFETCH_STALE_MINUTES = 5 as const;
const PREFETCH_STALE_TIME_MS = PREFETCH_STALE_MINUTES * MINUTE_MS; // 5 minutes

function toIso(d: Date): string {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function generateNeighborRanges(range: {
	fromDate: string;
	toDate: string;
	includeConversations?: boolean;
}): Array<{
	fromDate: string;
	toDate: string;
	includeConversations?: boolean;
}> {
	const out: Array<{
		fromDate: string;
		toDate: string;
		includeConversations?: boolean;
	}> = [];
	const d0 = new Date(range.fromDate);
	const d1 = new Date(range.toDate);
	if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) {
		return out;
	}
	const spanMs = Math.max(1, d1.getTime() - d0.getTime() + DAY_MS);
	for (
		let i = -NEIGHBOR_PREFETCH_WINDOW;
		i <= NEIGHBOR_PREFETCH_WINDOW;
		i += 1
	) {
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
	neighborRange: {
		fromDate: string;
		toDate: string;
		includeConversations?: boolean;
	},
	queryClient: QueryClient
): Promise<void> {
	const qKey = rangeQueryKey(neighborRange);
	if (queryClient.getQueryData(qKey)) {
		return;
	}
	await queryClient.prefetchQuery({
		queryKey: qKey,
		queryFn: async () => {
			const apiMod = await import("@shared/libs/api/index");
			const resOpts = buildReservationOptions(neighborRange);
			const convOpts = buildConversationOptions(neighborRange);
			const [resResp, convResp] = await Promise.all([
				apiMod.fetchReservations(resOpts).catch(() => ({ data: {} })),
				convOpts
					? apiMod.fetchConversations(convOpts).catch(() => ({ data: {} }))
					: Promise.resolve({ data: {} }),
			]);
			const nextRes =
				(resResp as { data?: Record<string, Reservation[]> }).data || {};
			const nextConv =
				(convResp as { data?: Record<string, ConversationMessage[]> }).data ||
				{};
			return { res: nextRes, conv: nextConv };
		},
		staleTime: PREFETCH_STALE_TIME_MS,
	});
}

export async function prefetchNeighborRanges(
	range: { fromDate: string; toDate: string; includeConversations?: boolean },
	queryClient: QueryClient
): Promise<void> {
	const neighbors = generateNeighborRanges(range);
	// Prefetch all neighbors in parallel for maximum speed
	await Promise.all(neighbors.map((n) => prefetchNeighbor(n, queryClient)));
}

export async function refreshRange(
	range:
		| { fromDate?: string; toDate?: string; includeConversations?: boolean }
		| undefined,
	queryClient: QueryClient
) {
	if (range) {
		useWsStore.getState().setActiveRange(range);
	}
	try {
		const cached = queryClient.getQueryData(rangeQueryKey(range)) as
			| {
					res?: Record<string, Reservation[]>;
					conv?: Record<string, ConversationMessage[]>;
			  }
			| undefined;
		if (cached) {
			useWsStore.getState().setReservations(cached.res || {});
			if (range?.includeConversations && cached.conv) {
				const prev = useWsStore.getState().conversations;
				useWsStore
					.getState()
					.setConversations(mergeConversationMaps(prev, cached.conv));
			}
		}
	} catch {
		// ignore cache read errors
	}

	// Proactively prefetch neighbor ranges for smoother navigation (parallel, non-blocking)
	try {
		if (range?.fromDate && range?.toDate) {
			// Fire-and-forget prefetch; do not block navigation
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			prefetchNeighborRanges(
				{
					fromDate: range.fromDate,
					toDate: range.toDate,
					...(range.includeConversations ? { includeConversations: true } : {}),
				},
				queryClient
			);
		}
	} catch {
		// ignore prefetch errors
	}

	// Fetch current range last (will only apply if still active, but always caches)
	await refreshRangeInternal(range, queryClient);
}

export async function loadConversationMessages(
	waId: string,
	range: { fromDate?: string; toDate?: string; limit?: number } | undefined,
	queryClient: QueryClient
) {
	const { conversationQueryKey } = await import(
		"@shared/libs/query/conversation-keys"
	);
	const qKey = conversationQueryKey(waId, range);
	const cached = queryClient.getQueryData(qKey) as
		| import("@/entities/conversation").ConversationMessage[]
		| undefined;
	if (cached) {
		const prevMap = useWsStore.getState().conversations;
		const prevSig = boundsSignature(
			prevMap?.[waId] as Array<{ date?: string }>
		);
		const cacheSig = boundsSignature(cached as Array<{ date?: string }>);
		if (
			!(
				prevSig.len === cacheSig.len &&
				prevSig.first === cacheSig.first &&
				prevSig.last === cacheSig.last
			)
		) {
			useWsStore.getState().setConversations({ ...prevMap, [waId]: cached });
		}
		return;
	}

	const { fetchConversationMessages } = await import("@shared/libs/api/index");
	const resp = (await fetchConversationMessages(waId, {
		...(range?.fromDate ? { fromDate: range.fromDate } : {}),
		...(range?.toDate ? { toDate: range.toDate } : {}),
		...(typeof range?.limit === "number" ? { limit: range.limit } : {}),
	})) as unknown as {
		data?: Record<
			string,
			import("@/entities/conversation").ConversationMessage[]
		>;
	};
	const byUser = (resp?.data || {}) as Record<
		string,
		import("@/entities/conversation").ConversationMessage[]
	>;
	const next = byUser?.[waId];
	if (Array.isArray(next)) {
		const prevMap = useWsStore.getState().conversations;
		const prevSig = boundsSignature(
			prevMap?.[waId] as Array<{ date?: string }>
		);
		const nextSig = boundsSignature(next as Array<{ date?: string }>);
		const unchanged =
			prevSig.len === nextSig.len &&
			prevSig.first === nextSig.first &&
			prevSig.last === nextSig.last;
		if (!unchanged) {
			queryClient.setQueryData(qKey, next);
			useWsStore.getState().setConversations({ ...prevMap, [waId]: next });
		}
	}
}
