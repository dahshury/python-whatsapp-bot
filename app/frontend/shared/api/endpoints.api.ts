import { i18n } from "@shared/libs/i18n";

type Json = Record<string, unknown>;

export function getMessage(key: string, isLocalized?: boolean): string {
  return i18n.getMessage(key, isLocalized);
}

// Legacy fetchConversations removed - conversations are now loaded on-demand via TanStack Query
// Use useConversationMessagesQuery hook instead for per-customer conversation loading
// Use useCalendarConversationEvents hook for calendar conversation events

// === Reservations ===
export async function fetchReservations(options?: {
  future?: boolean;
  includeCancelled?: boolean;
  fromDate?: string;
  toDate?: string;
}): Promise<Json> {
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
  return (await callPythonBackend(
    `/reservations${qs ? `?${qs}` : ""}`
  )) as Json;
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
  const { callPythonBackend } = await import("@shared/libs/backend");
  // Ensure backend receives reservation_type explicitly; also include type for compatibility
  const payload = {
    id: input.id,
    title: input.title,
    date: input.date,
    time: input.time,
    // Provide both keys since backend currently supports both
    reservation_type: input.type ?? 0,
    type: input.type ?? 0,
    max_reservations: input.max_reservations,
    hijri: input.hijri,
    ar: input.ar,
  };
  return (await callPythonBackend("/reserve", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as Json;
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
  }
): Promise<Json> {
  const { callPythonBackend } = await import("@shared/libs/backend");
  return (await callPythonBackend("/modify-reservation", {
    method: "POST",
    body: JSON.stringify({ id, ...updates }),
  })) as Json;
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
  const { callPythonBackend } = await import("@shared/libs/backend");
  // Note: This now calls the Next.js API route which calls the base /reservations/{wa_id}/modify endpoint
  return (await callPythonBackend("/api/reservations/undo-modify", {
    method: "POST",
    body: JSON.stringify(input),
  })) as Json;
}

export async function cancelReservation(input: {
  id: string; // wa_id
  date: string; // YYYY-MM-DD
  isLocalized?: boolean;
}): Promise<Json> {
  const { callPythonBackend } = await import("@shared/libs/backend");
  return (await callPythonBackend("/cancel-reservation", {
    method: "POST",
    body: JSON.stringify(input),
  })) as Json;
}

export async function fetchVacations(): Promise<Json> {
  const { callPythonBackend } = await import("@shared/libs/backend");
  return (await callPythonBackend("/vacations")) as Json;
}

// === Customers (documents) ===
export async function fetchCustomer(waId: string): Promise<Json> {
  const id = encodeURIComponent(waId);
  // Use callPythonBackend to bypass Next.js proxy and call Python directly
  const { callPythonBackend } = await import("@shared/libs/backend");
  const result = await callPythonBackend(`/customers/${id}`, {
    method: "GET",
  });
  return result as Json;
}

export async function saveCustomerDocument(input: {
  waId: string;
  document?: unknown;
  name?: string | null;
  age?: number | null;
  ar?: boolean;
}): Promise<Json> {
  const id = encodeURIComponent(input.waId);
  const { waId: _wa, ...body } = input;
  const payload = JSON.stringify({ ...body, _call_source: "frontend" }); // Tag as frontend-initiated to filter notifications
  // Use callPythonBackend to bypass Next.js proxy and call Python directly
  const { callPythonBackend } = await import("@shared/libs/backend");
  const result = await callPythonBackend(`/customers/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });
  return result as Json;
}
