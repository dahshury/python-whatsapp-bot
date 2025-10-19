// Lightweight API client - all routes call Python backend directly, bypassing Next.js proxy
import { i18n } from "@shared/libs/i18n";
import {
	zApiResponse,
	zConversationsMap,
	zReservationsMap,
	zVacationsArray,
} from "@shared/validation/api/response.schema";
import { z } from "zod";

type Json = Record<string, unknown>;

export function getMessage(key: string, isLocalized?: boolean): string {
	return i18n.getMessage(key, isLocalized);
}

// === Conversations ===
export async function fetchConversations(
	options?: {
		waId?: string;
		fromDate?: string;
		toDate?: string;
		limit?: number;
		recent?: string; // "year"|"month"|"week"|"day"
	},
	signal?: AbortSignal
): Promise<Json> {
	// Debug logging
	try {
		const mod = await import("@shared/libs/utils/dev-logger");
		mod.devGroup("RQ fetchConversations");
		mod.devLog("options", options);
		mod.devLog("signal_aborted", Boolean(signal?.aborted));
		mod.devGroupEnd();
	} catch {
		// ignore logging failures
	}
	const params = new URLSearchParams();
	if (options?.waId) {
		params.set("wa_id", options.waId);
	}
	if (options?.fromDate) {
		params.set("from_date", options.fromDate);
	}
	if (options?.toDate) {
		params.set("to_date", options.toDate);
	}
	if (options?.limit !== undefined) {
		params.set("limit", String(options.limit));
	}
	if (options?.recent) {
		params.set("recent", String(options.recent));
	}
	const qs = params.toString();
	const { callPythonBackend } = await import("@shared/libs/backend");
	const resp = (await callPythonBackend(
		`/conversations${qs ? `?${qs}` : ""}`,
		signal ? { signal } : undefined,
		zApiResponse(zConversationsMap)
	)) as Json;
	try {
		const mod = await import("@shared/libs/utils/dev-logger");
		mod.devGroup("RQ fetchConversations:response");
		mod.devLog("success", (resp as { success?: unknown })?.success);
		mod.devLog(
			"keys",
			Object.keys((resp as { data?: Record<string, unknown[]> })?.data || {})
		);
		mod.devGroupEnd();
	} catch {
		// ignore logging failures
	}
	return resp;
}

export async function fetchConversationMessages(
	waId: string,
	options?: {
		fromDate?: string;
		toDate?: string;
		limit?: number;
	},
	signal?: AbortSignal
): Promise<Json> {
	try {
		const mod = await import("@shared/libs/utils/dev-logger");
		mod.devGroup("RQ fetchConversationMessages");
		mod.devLog("waId", waId);
		mod.devLog("options", options);
		mod.devGroupEnd();
	} catch {
		// ignore logging failures
	}
	const params = new URLSearchParams();
	params.set("wa_id", waId);
	if (options?.fromDate) {
		params.set("from_date", options.fromDate);
	}
	if (options?.toDate) {
		params.set("to_date", options.toDate);
	}
	if (options?.limit !== undefined) {
		params.set("limit", String(options.limit));
	}
	const qs = params.toString();
	const { callPythonBackend } = await import("@shared/libs/backend");
	const resp = (await callPythonBackend(
		`/conversations?${qs}`,
		signal ? { signal } : undefined,
		zApiResponse(zConversationsMap)
	)) as Json;
	try {
		const mod = await import("@shared/libs/utils/dev-logger");
		mod.devGroup("RQ fetchConversationMessages:response");
		mod.devLog("success", (resp as { success?: unknown })?.success);
		const data = (resp as { data?: Record<string, unknown[]> })?.data || {};
		const list = (data?.[waId] || []) as unknown[];
		mod.devLog("count", list.length);
		mod.devGroupEnd();
	} catch {
		// ignore logging failures
	}
	return resp;
}

// === Reservations ===
export async function fetchReservations(
	options?: {
		future?: boolean;
		includeCancelled?: boolean;
		fromDate?: string;
		toDate?: string;
	},
	signal?: AbortSignal
): Promise<Json> {
	try {
		const mod = await import("@shared/libs/utils/dev-logger");
		mod.devGroup("RQ fetchReservations");
		mod.devLog("options", options);
		mod.devLog("signal_aborted", Boolean(signal?.aborted));
		mod.devGroupEnd();
	} catch {
		// ignore logging failures
	}
	const params = new URLSearchParams();
	if (options?.future !== undefined) {
		params.set("future", String(options.future));
	}
	if (options?.includeCancelled !== undefined) {
		params.set("include_cancelled", String(options.includeCancelled));
	}
	if (options?.fromDate) {
		params.set("from_date", options.fromDate);
	}
	if (options?.toDate) {
		params.set("to_date", options.toDate);
	}
	const qs = params.toString();
	const { callPythonBackend } = await import("@shared/libs/backend");
	const resp = (await callPythonBackend(
		`/reservations${qs ? `?${qs}` : ""}`,
		signal ? { signal } : undefined,
		zApiResponse(zReservationsMap)
	)) as Json;
	try {
		const mod = await import("@shared/libs/utils/dev-logger");
		mod.devGroup("RQ fetchReservations:response");
		mod.devLog("success", (resp as { success?: unknown })?.success);
		mod.devLog(
			"keys",
			Object.keys((resp as { data?: Record<string, unknown[]> })?.data || {})
		);
		mod.devGroupEnd();
	} catch {
		// ignore logging failures
	}
	return resp;
}

export async function reserveTimeSlot(
	input: {
		id: string; // wa_id
		title: string; // customer_name
		date: string; // YYYY-MM-DD
		time: string; // 12h or 24h, backend accepts both
		type?: number; // 0/1
		reservation_type?: number; // duplicate for backend compatibility
		max_reservations?: number; // default 6
		hijri?: boolean;
		ar?: boolean;
	},
	signal?: AbortSignal
): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	// Send both type and reservation_type to satisfy backend expectations and avoid falsy 0 pitfalls
	const body = JSON.stringify({
		...input,
		...(typeof input.type === "number"
			? { type: input.type, reservation_type: input.type }
			: {}),
	});
	return (await callPythonBackend(
		"/reserve",
		signal
			? {
					method: "POST",
					body,
					signal,
				}
			: {
					method: "POST",
					body,
				},
		zApiResponse(zReservationsMap)
	)) as Json;
}

export async function modifyReservation(
	id: string, // wa_id
	updates: {
		date: string;
		time: string;
		title?: string;
		type?: number;
		approximate?: boolean;
		reservationId?: number;
	},
	signal?: AbortSignal
): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend(
		"/modify-reservation",
		signal
			? {
					method: "POST",
					body: JSON.stringify({ id, ...updates }),
					signal,
				}
			: {
					method: "POST",
					body: JSON.stringify({ id, ...updates }),
				},
		zApiResponse(zReservationsMap)
	)) as Json;
}

export async function undoModifyReservation(
	input: {
		reservationId: number;
		originalData: {
			wa_id: string;
			date: string;
			time_slot: string;
			customer_name?: string;
			type?: number;
		};
		ar?: boolean;
	},
	signal?: AbortSignal
): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend(
		"/reservations/undo-modify",
		signal
			? {
					method: "POST",
					body: JSON.stringify(input),
					signal,
				}
			: {
					method: "POST",
					body: JSON.stringify(input),
				},
		zApiResponse(zReservationsMap)
	)) as Json;
}

export async function cancelReservation(
	input: {
		id: string; // wa_id
		date: string; // YYYY-MM-DD
		isLocalized?: boolean;
	},
	signal?: AbortSignal
): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend(
		"/cancel-reservation",
		signal
			? {
					method: "POST",
					body: JSON.stringify(input),
					signal,
				}
			: {
					method: "POST",
					body: JSON.stringify(input),
				},
		zApiResponse(zReservationsMap)
	)) as Json;
}

export async function fetchVacations(signal?: AbortSignal): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend(
		"/vacations",
		signal ? { signal } : undefined,
		zApiResponse(zVacationsArray)
	)) as Json;
}

// === Customers (documents) ===
export async function fetchCustomer(
	waId: string,
	signal?: AbortSignal
): Promise<Json> {
	const id = encodeURIComponent(waId);
	// Use callPythonBackend to bypass Next.js proxy and call Python directly
	const { callPythonBackend } = await import("@shared/libs/backend");
	const result = await callPythonBackend(
		`/customers/${id}`,
		signal
			? {
					method: "GET",
					signal,
				}
			: {
					method: "GET",
				},
		zApiResponse(z.record(z.unknown()))
	);
	return result as Json;
}

export async function saveCustomerDocument(
	input: {
		waId: string;
		document?: unknown;
		name?: string | null;
		age?: number | null;
		ar?: boolean;
	},
	signal?: AbortSignal
): Promise<Json> {
	const id = encodeURIComponent(input.waId);
	const { waId: _wa, ...body } = input;
	const payload = JSON.stringify(body);
	// Use callPythonBackend to bypass Next.js proxy and call Python directly
	const { callPythonBackend } = await import("@shared/libs/backend");
	const result = await callPythonBackend(
		`/customers/${id}`,
		signal
			? {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: payload,
					signal,
				}
			: {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: payload,
				},
		zApiResponse(z.record(z.unknown()))
	);
	return result as Json;
}

// Batch fetch customer names by wa_id
export async function fetchCustomerNames(
	waIds: string[],
	signal?: AbortSignal
): Promise<Json> {
	try {
		const mod = await import("@shared/libs/utils/dev-logger");
		mod.devGroup("RQ fetchCustomerNames");
		mod.devLog("waIds_count", Array.isArray(waIds) ? waIds.length : 0);
		mod.devGroupEnd();
	} catch {
		// ignore logging failures
	}
	const list = Array.isArray(waIds) ? waIds.filter(Boolean) : [];
	if (list.length === 0) {
		return { success: true, data: {} } as unknown as Json;
	}
	const params = new URLSearchParams();
	params.set("wa_ids", list.join(","));
	const qs = params.toString();
	const { callPythonBackend } = await import("@shared/libs/backend");
	const resp = (await callPythonBackend(
		`/customers/names${qs ? `?${qs}` : ""}`,
		signal ? { signal } : undefined,
		zApiResponse(z.record(z.union([z.string(), z.null()])))
	)) as Json;
	return resp;
}
