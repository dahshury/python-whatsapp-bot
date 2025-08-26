import {
	cancelReservation,
	modifyReservation,
	reserveTimeSlot,
} from "@/lib/api";
import { toastService } from "@/lib/toast-service";

type RowChange = {
	date?: string;
	time?: string;
	phone?: string;
	type?: string | number;
	name?: string;
};

interface SuccessfulOperation {
	type: "create" | "modify" | "cancel";
	id: string; // wa_id or event id
	data?: any;
}

// Use WebSocket writes with HTTP fallback
function sendWS(message: any): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const wsRef = (globalThis as any).__wsConnection;
			if (wsRef?.current?.readyState === WebSocket.OPEN) {
				wsRef.current.send(JSON.stringify(message));
				resolve(true);
			} else {
				resolve(false);
			}
		} catch {
			resolve(false);
		}
	});
}

async function modifyReservationWS(
	waId: string,
	updates: {
		date: string;
		time: string;
		title?: string;
		type?: number;
		reservationId?: number;
		approximate?: boolean;
	},
): Promise<any> {
	const ok = await sendWS({
		type: "modify_reservation",
		data: {
			wa_id: waId,
			date: updates.date,
			time_slot: updates.time,
			customer_name: updates.title,
			type: updates.type,
			reservation_id: updates.reservationId,
			approximate: updates.approximate,
		},
	});
	if (ok) return { success: true };
	return await modifyReservation(waId, updates);
}

export class DataTableOperationsService {
	private readonly calendarApi: any;
	private readonly isRTL: boolean;
	private readonly slotDurationHours: number;
	private readonly freeRoam: boolean;
	private readonly refreshCustomerData?: () => Promise<void>;

	constructor(
		calendarApi: any,
		isRTL: boolean,
		slotDurationHours: number,
		freeRoam: boolean,
		refreshCustomerData?: () => Promise<void>,
	) {
		this.calendarApi = calendarApi;
		this.isRTL = isRTL;
		this.slotDurationHours = slotDurationHours;
		this.freeRoam = freeRoam;
		this.refreshCustomerData = refreshCustomerData;
	}

	private to24h(value: string): string {
		// Accept HH:mm or localized 12h; normalize to HH:mm
		const v = (value || "").trim();
		if (/^\d{2}:\d{2}$/.test(v)) return v;
		try {
			const d = new Date(`1970-01-01T${v}`);
			const hh = String(d.getHours()).padStart(2, "0");
			const mm = String(d.getMinutes()).padStart(2, "0");
			return `${hh}:${mm}`;
		} catch {
			return v;
		}
	}

	private parseType(value: string | number | undefined): number {
		if (typeof value === "number") return value;
		const v = String(value || "").toLowerCase();
		if (v.includes("follow") || v.includes("مراجعة")) return 1;
		return 0;
	}

	private formatDateOnly(value: any): string | null {
		try {
			if (!value) return null;
			if (value instanceof Date) {
				const y = value.getFullYear();
				const m = String(value.getMonth() + 1).padStart(2, "0");
				const d = String(value.getDate()).padStart(2, "0");
				return `${y}-${m}-${d}`;
			}
			const str = String(value).trim();
			if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
			if (str.includes("T")) return str.split("T")[0];
			const d = new Date(str);
			if (Number.isNaN(d.getTime())) return null;
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, "0");
			const day = String(d.getDate()).padStart(2, "0");
			return `${y}-${m}-${day}`;
		} catch {
			return null;
		}
	}

	private formatHHmm(value: any): string | null {
		try {
			if (!value) return null;
			if (value instanceof Date) {
				const hh = String(value.getHours()).padStart(2, "0");
				const mm = String(value.getMinutes()).padStart(2, "0");
				return `${hh}:${mm}`;
			}
			const str = String(value).trim();
			// Handle ISO-like strings containing a 'T' (e.g., 1970-01-01T14:00:00.000Z)
			if (str.includes("T")) {
				const dTry = new Date(str);
				if (!Number.isNaN(dTry.getTime())) {
					// Use LOCAL hours to preserve the user's intended time
					const hh = String(dTry.getHours()).padStart(2, "0");
					const mm = String(dTry.getMinutes()).padStart(2, "0");
					return `${hh}:${mm}`;
				}
			}
			// 24h HH:mm
			const m1 = str.match(
				/^([01]?\d|2\d):([0-5]\d)(?::[0-5]\d(?:\.\d{1,3}Z)?)?$/,
			);
			if (m1) return `${m1[1].padStart(2, "0")}:${m1[2]}`;
			// 12h
			const m2 = str.match(/^(0?\d|1[0-2]):([0-5]\d)\s*(am|pm)$/i);
			if (m2) {
				let hours = parseInt(m2[1], 10);
				const minutes = m2[2];
				const isPM = m2[3].toLowerCase() === "pm";
				if (hours === 12 && !isPM) hours = 0;
				else if (hours !== 12 && isPM) hours += 12;
				return `${String(hours).padStart(2, "0")}:${minutes}`;
			}
			// Try Date parser fallback for strings like 14:00:00Z
			const d = new Date(`1970-01-01T${str}`);
			if (!Number.isNaN(d.getTime())) {
				const hh = String(d.getHours()).padStart(2, "0");
				const mm = String(d.getMinutes()).padStart(2, "0");
				return `${hh}:${mm}`;
			}
			return null;
		} catch {
			return null;
		}
	}

	private formatHHmmInZone(
		value: any,
		timeZone: string = "Asia/Riyadh",
	): string | null {
		try {
			if (!value) return null;
			// If already HH:mm, return as-is
			const asStr = String(value).trim();
			const m = asStr.match(/^([01]?\d|2\d):([0-5]\d)$/);
			if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;

			const d = value instanceof Date ? value : new Date(asStr);
			if (Number.isNaN(d.getTime())) return null;
			const fmt = new Intl.DateTimeFormat("en-GB", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
				timeZone,
			});
			return fmt.format(d);
		} catch {
			return null;
		}
	}

	private markLocalEcho(key: string): void {
		try {
			(globalThis as any).__localOps =
				(globalThis as any).__localOps || new Set<string>();
			(globalThis as any).__localOps.add(key);
			setTimeout(() => {
				try {
					(globalThis as any).__localOps.delete(key);
				} catch {}
			}, 4000);
		} catch {}
	}

	async processCancellations(
		deletedRows: number[],
		gridRowToEventMap: Map<number, any>,
		onEventCancelled?: (eventId: string) => void,
		_onEventAdded?: (event: any) => void,
	): Promise<{
		hasErrors: boolean;
		successfulOperations: SuccessfulOperation[];
	}> {
		let hasErrors = false;
		const successful: SuccessfulOperation[] = [];

		for (const rowIdx of deletedRows || []) {
			const mapped = gridRowToEventMap.get(rowIdx);
			if (!mapped) continue;
			const eventId = String(mapped.id);
			const waId: string = (
				mapped.extendedProps?.waId ||
				mapped.extendedProps?.wa_id ||
				mapped.id ||
				""
			).toString();
			const date = mapped.start?.split("T")[0];
			try {
				// Optimistic UI: mark cancelled on the calendar event
				const evObj = this.calendarApi?.getEventById?.(eventId);
				if (evObj) {
					try {
						evObj.setExtendedProp("cancelled", true);
					} catch {}
				}
				// Backend cancel
				const resp = await cancelReservation({
					id: waId,
					date,
					isRTL: this.isRTL,
				});
				if (!resp?.success)
					throw new Error(resp?.message || resp?.error || "Cancel failed");

				// Remove visually from calendar (optional: keep and grey out). Use remove for explicit deletion UX.
				try {
					evObj?.remove?.();
				} catch {}

				onEventCancelled?.(eventId);
				successful.push({ type: "cancel", id: eventId, data: { waId, date } });

				// Mirror drag-drop toast style via WS provider; mark local echo key to suppress duplicate toast
				const key1 = `reservation_cancelled:${String(resp?.id || mapped.extendedProps?.reservationId || eventId)}:${date}:`;
				const key2 = `reservation_cancelled:${String(waId)}:${date}:`;
				this.markLocalEcho(key1);
				this.markLocalEcho(key2);
			} catch (e) {
				hasErrors = true;
				toastService.error(
					this.isRTL ? "فشل الإلغاء" : "Cancel Failed",
					(e as Error)?.message ||
						(this.isRTL
							? "خطأ بالنظام، حاول لاحقًا"
							: "System error, try later"),
					3000,
				);
			}
		}

		return { hasErrors, successfulOperations: successful };
	}

	async processModifications(
		editedRows: Record<string, RowChange>,
		gridRowToEventMap: Map<number, any>,
		onEventModified?: (eventId: string, event: any) => void,
	): Promise<{
		hasErrors: boolean;
		successfulOperations: SuccessfulOperation[];
	}> {
		let hasErrors = false;
		const successful: SuccessfulOperation[] = [];

		const indices = Object.keys(editedRows || {});
		for (const idxStr of indices) {
			const rowIdx = Number(idxStr);
			const change = editedRows[idxStr] || {};
			const original = gridRowToEventMap.get(rowIdx);
			if (!original) continue;

			const evId = String(original.id);
			const waId: string = (
				original.extendedProps?.waId ||
				original.extendedProps?.wa_id ||
				original.id ||
				""
			).toString();
			const prevStartStr: string = original.start;
			const prevDate = prevStartStr.split("T")[0];
			const timeStrNew = this.to24h(
				change.time || prevStartStr.split("T")[1]?.slice(0, 5) || "00:00",
			);
			const dateStrNew = (change.date || prevDate) as string;
			const typeNew = this.parseType(
				change.type ?? original.extendedProps?.type,
			);
			const titleNew =
				change.name ||
				original.title ||
				original.extendedProps?.customerName ||
				waId;

			try {
				// Optimistic UI using FullCalendar Event API
				const evObj = this.calendarApi?.getEventById?.(evId);
				if (evObj) {
					try {
						evObj.setProp("title", titleNew);
					} catch {}
					try {
						evObj.setExtendedProp("type", Number(typeNew));
					} catch {}
					try {
						evObj.setExtendedProp("cancelled", false);
					} catch {}
					const startIso = `${dateStrNew}T${timeStrNew}:00`;
					try {
						const prevStart = new Date(prevStartStr);
						const newStart = new Date(startIso);
						const deltaMs = newStart.getTime() - prevStart.getTime();
						if (typeof (evObj as any).moveStart === "function") {
							(globalThis as any).__suppressEventChangeDepth =
								((globalThis as any).__suppressEventChangeDepth || 0) + 1;
							(evObj as any).moveStart({ milliseconds: deltaMs });
							try {
								(globalThis as any).__suppressEventChangeDepth -= 1;
							} catch {}
						} else if (typeof (evObj as any).setStart === "function") {
							(globalThis as any).__suppressEventChangeDepth =
								((globalThis as any).__suppressEventChangeDepth || 0) + 1;
							(evObj as any).setStart(newStart);
							try {
								(globalThis as any).__suppressEventChangeDepth -= 1;
							} catch {}
						} else {
							(globalThis as any).__suppressEventChangeDepth =
								((globalThis as any).__suppressEventChangeDepth || 0) + 1;
							(evObj as any).setDates(newStart, null);
							try {
								(globalThis as any).__suppressEventChangeDepth -= 1;
							} catch {}
						}
					} catch {
						try {
							(globalThis as any).__suppressEventChangeDepth =
								((globalThis as any).__suppressEventChangeDepth || 0) + 1;
							(evObj as any).setDates(new Date(startIso), null);
						} catch {
						} finally {
							try {
								(globalThis as any).__suppressEventChangeDepth -= 1;
							} catch {}
						}
					}
				}

				// Backend modify
				const resp = await modifyReservationWS(waId, {
					date: dateStrNew,
					time: timeStrNew,
					title: titleNew,
					type: Number(typeNew),
					reservationId: original.extendedProps?.reservationId,
					approximate: !(
						typeof window !== "undefined" &&
						(this.calendarApi?.view?.type || "")
							.toLowerCase()
							.includes("timegrid")
					),
				});
				if (!resp?.success)
					throw new Error(resp?.message || resp?.error || "Modify failed");

				onEventModified?.(evId, {
					id: evId,
					title: titleNew,
					start: `${dateStrNew}T${timeStrNew}:00`,
					end: `${dateStrNew}T${timeStrNew}:00`,
					extendedProps: {
						type: Number(typeNew),
						cancelled: false,
						reservationId: original.extendedProps?.reservationId,
					},
				});
				successful.push({
					type: "modify",
					id: evId,
					data: {
						waId,
						date: dateStrNew,
						time: timeStrNew,
						type: Number(typeNew),
					},
				});

				// Stash previous/new context for fancy WS toast (same style as drag/drop)
				try {
					(globalThis as any).__calendarLastModifyContext =
						(globalThis as any).__calendarLastModifyContext ||
						new Map<string, any>();
					(globalThis as any).__calendarLastModifyContext.set(String(evId), {
						waId,
						prevDate,
						prevTime: prevStartStr.split("T")[1]?.slice(0, 5),
						prevType: original.extendedProps?.type,
						name: titleNew,
						newDate: dateStrNew,
						newTime: timeStrNew,
						newType: Number(typeNew),
					});
				} catch {}

				// Mark local echo and rely on WS provider fancy toast
				const key1 = `reservation_updated:${String(resp?.id || original.extendedProps?.reservationId || evId)}:${dateStrNew}:${timeStrNew}`;
				const key2 = `reservation_updated:${String(waId)}:${dateStrNew}:${timeStrNew}`;
				this.markLocalEcho(key1);
				this.markLocalEcho(key2);
			} catch (e) {
				hasErrors = true;
				toastService.error(
					this.isRTL ? "فشل التعديل" : "Update Failed",
					(e as Error)?.message ||
						(this.isRTL
							? "خطأ بالنظام، حاول لاحقًا"
							: "System error, try later"),
					3000,
				);
			}
		}

		return { hasErrors, successfulOperations: successful };
	}

	async processAdditions(
		addedRows: Array<RowChange>,
		onEventAdded?: (event: any) => void,
		_onEventCancelled?: (eventId: string) => void,
	): Promise<{
		hasErrors: boolean;
		successfulOperations: SuccessfulOperation[];
	}> {
		let hasErrors = false;
		const successful: SuccessfulOperation[] = [];

		for (const row of addedRows || []) {
			const dStr = this.formatDateOnly(row.date) || "";
			// Prefer fixed clinic timezone formatting to avoid local/UTC skew
			const tStr =
				this.formatHHmmInZone(row.time, "Asia/Riyadh") ||
				this.formatHHmm(row.time) ||
				this.to24h((row.time || "").toString()) ||
				"";
			const phoneRaw = (row.phone || "").toString();
			const waId = phoneRaw.startsWith("+")
				? phoneRaw
				: phoneRaw
					? `+${phoneRaw}`
					: phoneRaw;
			const type = this.parseType(row.type);
			const name = (row.name || "").toString();

			try {
				// Defensive check: ensure all required fields are present before calling API
				const missing: string[] = [];
				if (!waId) missing.push("id/phone");
				if (!name) missing.push("name");
				if (!dStr) missing.push("date");
				if (!tStr) missing.push("time");
				if (missing.length) {
					toastService.error(
						this.isRTL ? "حقول مطلوبة مفقودة" : "Missing required fields",
						(this.isRTL ? "يرجى إكمال: " : "Please fill: ") +
							missing.join(", "),
						3000,
					);
					hasErrors = true;
					continue;
				}

				// Backend create
				const resp = await reserveTimeSlot({
					id: waId,
					title: name || waId,
					date: dStr,
					time: tStr,
					type: Number(type),
					ar: this.isRTL,
				});
				if (!resp?.success) {
					const reason =
						(typeof resp?.message === "string" && resp.message) ||
						(typeof resp?.error === "string" && resp.error) ||
						(typeof resp?.detail === "string" && resp.detail) ||
						(resp && typeof resp === "object" ? JSON.stringify(resp) : "") ||
						"Unknown";
					const desc = [
						this.isRTL ? "فشل إنشاء الحجز" : "Failed to create reservation",
						`${name || waId} • ${dStr} ${tStr} • type ${Number(type)}`,
						reason
							? this.isRTL
								? `السبب: ${reason}`
								: `reason: ${reason}`
							: "",
					]
						.filter(Boolean)
						.join("\n");
					// Note: keep user feedback in toast; avoid error overlay in Next.js
					console.warn("reserveTimeSlot failed:", resp);
					toastService.error(
						this.isRTL ? "فشل الإنشاء" : "Create Failed",
						desc,
						6000,
					);
					hasErrors = true;
					continue;
				}

				// Add to calendar immediately
				const startIso = `${dStr}T${tStr}:00`;
				const newEvent = this.calendarApi?.addEvent?.({
					id: String(
						resp?.id || resp?.reservationId || `${waId}-${dStr}-${tStr}`,
					),
					title: name || waId,
					start: startIso,
					end: startIso,
					extendedProps: {
						type: Number(type),
						cancelled: false,
						waId,
						wa_id: waId,
						reservationId: resp?.id || resp?.reservationId,
					},
				});
				if (newEvent && typeof newEvent.setExtendedProp === "function") {
					try {
						newEvent.setExtendedProp("waId", waId);
					} catch {}
					try {
						newEvent.setExtendedProp("wa_id", waId);
					} catch {}
				}

				onEventAdded?.({
					id: String(
						resp?.id || resp?.reservationId || `${waId}-${dStr}-${tStr}`,
					),
					title: name || waId,
					start: startIso,
					end: startIso,
					extendedProps: {
						type: Number(type),
						cancelled: false,
						waId,
						wa_id: waId,
						reservationId: resp?.id || resp?.reservationId,
					},
				});

				successful.push({
					type: "create",
					id: waId,
					data: { date: dStr, time: tStr },
				});
				// Mark local echo and rely on WS provider toast
				const key1 = `reservation_created:${String(resp?.id || resp?.reservationId || "")}:${dStr}:${tStr}`;
				const key2 = `reservation_created:${String(waId)}:${dStr}:${tStr}`;
				this.markLocalEcho(key1);
				this.markLocalEcho(key2);
			} catch (e) {
				hasErrors = true;
				const base = this.isRTL ? "فشل الإنشاء" : "Create Failed";
				const msg = (e as any)?.message || (e as any)?.toString?.() || "";
				const desc = [
					this.isRTL ? "معلومات الطلب" : "Request",
					`${name || waId} • ${dStr} ${tStr} • type ${Number(type)}`,
					msg && (this.isRTL ? `السبب: ${msg}` : `reason: ${msg}`),
				]
					.filter(Boolean)
					.join("\n");
				toastService.error(base, desc, 6000);
			}
		}

		return { hasErrors, successfulOperations: successful };
	}

	updateCalendarWithOperations(
		_successfulOperations: SuccessfulOperation[],
		_onEventAdded?: (event: any) => void,
	): void {
		try {
			this.calendarApi?.updateSize?.();
			if (typeof this.refreshCustomerData === "function") {
				void this.refreshCustomerData();
			}
		} catch {}
	}
}
