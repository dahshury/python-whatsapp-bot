import { toastService } from "@/lib/toast-service";
import type { UpdateType } from "@/lib/ws/types";

export function notifyUpdate(
	type: UpdateType,
	data: Record<string, unknown>,
): void {
	switch (type) {
		case "reservation_created": {
			const d = data as {
				customer_name?: string;
				wa_id?: string;
				date?: string;
				time_slot?: string;
			};
			toastService.reservationCreated({
				customer: d.customer_name,
				wa_id: d.wa_id,
				date: d.date,
				time: String(d.time_slot || "").slice(0, 5),
			});
			break;
		}
		case "reservation_cancelled": {
			const d = data as {
				customer_name?: string;
				wa_id?: string;
				date?: string;
				time_slot?: string;
			};
			toastService.reservationCancelled({
				customer: d.customer_name,
				wa_id: d.wa_id,
				date: d.date,
				time: String(d.time_slot || "").slice(0, 5),
			});
			break;
		}
		case "reservation_updated":
		case "reservation_reinstated": {
			const d = data as {
				customer_name?: string;
				wa_id?: string;
				date?: string;
				time_slot?: string;
			};
			toastService.reservationModified({
				customer: d.customer_name,
				wa_id: d.wa_id,
				date: d.date,
				time: String(d.time_slot || "").slice(0, 5),
			});
			break;
		}
		case "conversation_new_message": {
			const d = data as { wa_id?: string; message?: string };
			toastService.newMessage({
				title: `Message • ${String(d.wa_id || "")}`,
				description: String(d.message || "").slice(0, 100),
			});
			break;
		}
		default:
			break;
	}
}
