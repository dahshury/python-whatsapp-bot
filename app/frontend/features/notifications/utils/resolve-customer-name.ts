export type ReservationsData =
  | Record<string, Array<{ customer_name?: string }>>
  | undefined;

export function resolveCustomerName(
  waId: string | undefined,
  fallbackName: string | undefined,
  reservations: ReservationsData
): string | undefined {
  try {
    if (fallbackName && String(fallbackName).trim()) {
      return String(fallbackName);
    }
    const id = String(waId || "");
    if (!id) {
      return;
    }
    const list = reservations?.[id] || [];
    for (const r of list) {
      if (r?.customer_name) {
        return String(r.customer_name);
      }
    }
  } catch {
    // Ignore errors when fetching customer name from reservations
  }
  return;
}
