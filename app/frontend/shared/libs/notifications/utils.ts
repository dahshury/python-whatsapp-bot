// Utility helpers for notifications

const HASH_MULTIPLIER = 31;
const HUE_MODULO = 360;

export function getWaId(data?: Record<string, unknown>): string {
	try {
		const d = (data || {}) as { wa_id?: unknown; waId?: unknown };
		const val = (d.wa_id ?? d.waId) as unknown;
		return typeof val === "string" ? val : String(val ?? "");
	} catch {
		return "";
	}
}

// Deterministic hue from string for colorful badges
export function hashToHue(input: string): number {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		hash = Math.imul(hash, HASH_MULTIPLIER) + input.charCodeAt(i);
	}
	return Math.abs(hash) % HUE_MODULO;
}

// Centralized allow-list for notification events that are allowed to reach the UI badge/toasts
const ALLOWED_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
	"conversation_new_message",
	"reservation_created",
	"reservation_updated",
	"reservation_reinstated",
	"reservation_cancelled",
]);

/**
 * Returns true if this event type is allowed to reach the notifications UI.
 * Only backend-committed events listed above are permitted.
 */
export function isAllowedNotificationEvent(
	type?: string,
	data?: Record<string, unknown>
): boolean {
	try {
		const t = String(type || "").toLowerCase();
		if (!t) {
			return false;
		}
		if (isControlSignal(t)) {
			return false;
		}
		if (!ALLOWED_NOTIFICATION_TYPES.has(t)) {
			return false;
		}

		// Additional constraints: only user/customer roles for new messages
		if (t === "conversation_new_message") {
			const role = String(
				(data as { role?: string } | undefined)?.role || ""
			).toLowerCase();
			if (role !== "user" && role !== "customer") {
				return false;
			}
		}

		return true;
	} catch {
		return false;
	}
}

function isControlSignal(type: string): boolean {
	if (type === "snapshot") {
		return true;
	}
	if (type.endsWith("_ack") || type.endsWith("_nack")) {
		return true;
	}
	if (type === "ack" || type === "nack") {
		return true;
	}
	if (type === "conversation_typing") {
		return true;
	}
	if (type === "customer_document_updated") {
		return true;
	}
	return false;
}
