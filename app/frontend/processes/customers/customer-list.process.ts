/*
 * Customer list build/sort orchestration
 * - Build customers from conversations and reservations
 * - Merge realtime overrides and deletions
 * - Stable sort by recent activity (last message timestamp)
 */

export type CustomerItem = {
	id: string;
	name: string;
	phone?: string;
};

export type ConversationsByWaId = Record<
	string,
	Array<{
		id?: string;
		text?: string;
		ts?: string;
		date?: string;
		time?: string;
		datetime?: string;
	}>
>;

export type ReservationsByWaId = Record<
	string,
	Array<{
		customer_name?: string;
		id?: string | number;
		title?: string;
		start?: string;
		end?: string;
	}>
>;

export function buildBaseCustomers(
	conversations: ConversationsByWaId | undefined,
	reservations: ReservationsByWaId | undefined
): CustomerItem[] {
	const customerMap = new Map<string, CustomerItem>();
	// seed from conversations
	for (const waId of Object.keys(conversations || {})) {
		if (!customerMap.has(waId)) {
			customerMap.set(waId, { id: waId, name: "", phone: waId });
		}
	}
	// enrich names from reservations
	for (const [waId, list] of Object.entries(reservations || {})) {
		const arr = Array.isArray(list) ? list : [];
		const name = arr.find((r) =>
			(r?.customer_name || "").trim()
		)?.customer_name;
		if (name) {
			const existing = customerMap.get(waId);
			if (existing) {
				customerMap.set(waId, { ...existing, name });
			} else {
				customerMap.set(waId, { id: waId, name, phone: waId });
			}
		}
	}
	return Array.from(customerMap.values());
}

export function sortCustomersByLastMessage(
	customers: CustomerItem[],
	conversations: ConversationsByWaId | undefined
): CustomerItem[] {
	const parseTs = (
		m: { ts?: string; date?: string; time?: string; datetime?: string } = {}
	): number => {
		const tryParse = (v?: string) => {
			if (!v) {
				return 0;
			}
			const d = new Date(v);
			return Number.isNaN(d.getTime()) ? 0 : d.getTime();
		};
		const t1 = tryParse(m.ts);
		const t2 = tryParse(m.datetime);
		if (t1 || t2) {
			return Math.max(t1, t2);
		}
		const date = m.date;
		const time = m.time;
		if (date && time) {
			return tryParse(`${date}T${time}`);
		}
		if (date) {
			return tryParse(`${date}T00:00:00`);
		}
		return 0;
	};
	const getLastTs = (wa: string) => {
		try {
			const msgs = conversations?.[wa] || [];
			let max = 0;
			for (const m of msgs) {
				const v = parseTs(m);
				if (v > max) {
					max = v;
				}
			}
			return max;
		} catch {
			return 0;
		}
	};
	return [...customers].sort((a, b) => {
		const tb = getLastTs(b.id);
		const ta = getLastTs(a.id);
		if (tb !== ta) {
			return tb - ta;
		}
		return a.id.localeCompare(b.id);
	});
}

export function mergeCustomerOverlays(
	baseCustomers: CustomerItem[],
	overrides: Map<string, { name?: string; phone?: string }>,
	deleted: Set<string>
): CustomerItem[] {
	const merged = new Map<string, CustomerItem>();
	for (const c of baseCustomers) {
		if (deleted.has(c.id)) {
			continue;
		}
		const ov = overrides.get(c.id);
		merged.set(c.id, {
			id: c.id,
			name: (ov?.name ?? c.name) || "",
			phone: ov?.phone || c.phone || c.id,
		});
	}
	for (const [wa, ov] of overrides.entries()) {
		if (deleted.has(wa)) {
			continue;
		}
		if (!merged.has(wa)) {
			merged.set(wa, { id: wa, name: ov?.name || "", phone: ov?.phone || wa });
		}
	}
	return Array.from(merged.values());
}

/**
 * Sort WA IDs by chat order (newest last message first, then named first, then phone asc).
 * Returns an array of waIds ordered for right/left navigation consistency.
 */
export function sortWaIdsByChatOrder(
	waIds: string[],
	conversations: ConversationsByWaId | undefined,
	nameLookup?: (waId: string) => string | undefined
): string[] {
	const convMap = (conversations || {}) as ConversationsByWaId;
	const digits = (s: string) => String(s || "").replace(/\D/g, "");

	type Meta = { wa: string; ts: number; hasName: boolean };

	const meta: Meta[] = waIds.map((wa) => {
		const ts = extractMessageTimestamp(wa, convMap, digits);
		const hasName = Boolean((nameLookup?.(wa) || "").trim());
		return { wa, ts, hasName };
	});

	return meta
		.sort((a, b) => {
			if (b.ts !== a.ts) {
				return b.ts - a.ts; // newer first
			}
			if (a.hasName !== b.hasName) {
				return a.hasName ? -1 : 1; // named first
			}
			return a.wa.localeCompare(b.wa, undefined, { numeric: true });
		})
		.map((m) => m.wa);
}

function extractMessageTimestamp(
	wa: string,
	convMap: ConversationsByWaId,
	digits: (s: string) => string
): number {
	let msgs = convMap[wa] || [];
	if (!msgs.length) {
		const match = Object.entries(convMap).find(
			([k]) => digits(k) === digits(wa)
		);
		if (match) {
			msgs = match[1] || [];
		}
	}
	const last = msgs.length > 0 ? msgs.at(-1) : undefined;
	if (
		last &&
		(last as { date?: string }).date &&
		(last as { time?: string }).time
	) {
		const t = new Date(
			`${(last as { date: string }).date} ${(last as { time: string }).time}`
		).getTime();
		if (!Number.isNaN(t)) {
			return t;
		}
	}
	return 0;
}
