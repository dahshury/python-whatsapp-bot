// Lightweight API client used across the frontend. Routes proxy to the Python backend via Next.js API.

type Json = Record<string, unknown>;

async function fetchJson(path: string, init?: RequestInit): Promise<Json> {
	const res = await fetch(path, {
		headers: { "Content-Type": "application/json" },
		...init,
	});
	try {
		const data = await res.json();
		return data ?? {};
	} catch {
		return { success: false, message: "Invalid JSON response" };
	}
}

export function getMessage(key: string, isLocalized?: boolean): string {
	const ar: Record<string, string> = {
		system_error_try_later: "خطأ بالنظام، حاول لاحقًا",
	};
	const en: Record<string, string> = {
		system_error_try_later: "System error, please try again later",
	};
	const dict = isLocalized ? ar : en;
	return dict[key] ?? key;
}

// === Conversations ===
export async function fetchConversations(): Promise<Json> {
	return await fetchJson("/api/conversations");
}

// === Reservations ===
export async function fetchReservations(options?: {
	future?: boolean;
	includeCancelled?: boolean;
	fromDate?: string;
	toDate?: string;
}): Promise<Json> {
	const params = new URLSearchParams();
	if (options?.future !== undefined)
		params.set("future", String(options.future));
	if (options?.includeCancelled !== undefined)
		params.set("include_cancelled", String(options.includeCancelled));
	if (options?.fromDate) params.set("from_date", options.fromDate);
	if (options?.toDate) params.set("to_date", options.toDate);
	const qs = params.toString();
	return await fetchJson(`/api/reservations${qs ? `?${qs}` : ""}`);
}

export async function reserveTimeSlot(input: {
	id: string; // wa_id
	title: string; // customer_name
	date: string; // YYYY-MM-DD
	time: string; // 12h or 24h, backend accepts both
	type?: number; // 0/1
	max_reservations?: number; // default 6
	hijri?: boolean;
	ar?: boolean;
}): Promise<Json> {
	return await fetchJson("/api/reserve", {
		method: "POST",
		body: JSON.stringify(input),
	});
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
): Promise<Json> {
	return await fetchJson("/api/modify-reservation", {
		method: "POST",
		body: JSON.stringify({ id, ...updates }),
	});
}

export async function undoModifyReservation(input: {
	reservationId: number;
	originalData: {
		wa_id: string;
		date: string;
		time_slot: string;
		customer_name?: string;
		type?: number;
	};
	ar?: boolean;
}): Promise<Json> {
	return await fetchJson("/api/reservations/undo-modify", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function cancelReservation(input: {
	id: string; // wa_id
	date: string; // YYYY-MM-DD
	isLocalized?: boolean;
}): Promise<Json> {
	return await fetchJson("/api/cancel-reservation", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function fetchVacations(): Promise<Json> {
	return await fetchJson("/api/vacations");
}
