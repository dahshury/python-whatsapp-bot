/* eslint-disable */

import { generateLocalOpKeys } from "@/lib/realtime-utils";
import { toastService } from "@/lib/toast-service";
import type { CalendarApi } from "../types/data-table-types";
import { CalendarIntegrationService } from "./calendar-integration.service";
import type { WebSocketService } from "../websocket/websocket.service";
import { FormattingService } from "../utils/formatting.service";
import type { LocalEchoManager } from "../utils/local-echo.manager";

export interface EventChangeInfo {
    event: {
        id: string;
        title?: string;
        start?: Date;
        end?: Date;
        startStr?: string;
        endStr?: string;
        extendedProps?: Record<string, unknown>;
    };
    oldEvent?: {
        id: string;
        title?: string;
        start?: Date;
        end?: Date;
        startStr?: string;
        endStr?: string;
        extendedProps?: Record<string, unknown>;
    };
    revert?: () => void;
}

export class CalendarDnDService {
    private readonly calendarIntegration: CalendarIntegrationService;
    private readonly formatting: FormattingService;

    constructor(
        private readonly calendarApi: CalendarApi,
        private readonly webSocketService: WebSocketService,
        private readonly localEchoManager: LocalEchoManager,
        private readonly isLocalized: boolean,
    ) {
        this.calendarIntegration = new CalendarIntegrationService(
            calendarApi,
            localEchoManager,
        );
        this.formatting = new FormattingService();
    }

    async handleEventChange(args: {
        info: EventChangeInfo;
        isVacationDate: (date: string) => boolean;
        currentView: string;
        updateEvent: (
            id: string,
            event: { id: string; title?: string; start?: string; end?: string },
        ) => void;
        resolveEvent?: (
            id: string,
        ) => { extendedProps?: Record<string, unknown> } | undefined;
    }): Promise<void> {
        const { info, isVacationDate, currentView, updateEvent, resolveEvent } =
            args;
        const event = info?.event;
        if (!event) return;

        // Ignore moves on vacation dates
        const newDate = String(event.startStr || "").split("T")[0] || "";
        if (newDate && isVacationDate && isVacationDate(newDate)) {
            if (info?.revert) info.revert();
            return;
        }

        // Extract identifiers and metadata
        const resolved = resolveEvent ? resolveEvent(String(event.id)) : undefined;
        const waId = String(
            event.extendedProps?.waId ||
                event.extendedProps?.wa_id ||
                resolved?.extendedProps?.waId ||
                resolved?.extendedProps?.wa_id ||
                event.id,
        );
        const rawTime = (event.startStr?.split("T")[1] || "00:00").slice(0, 5);
        const slotBaseTime = this.formatting.normalizeToSlotBase(newDate, rawTime);
        const newTime = slotBaseTime;
        const type = Number(event.extendedProps?.type ?? 0);

        // Prefer explicit reservationId; fallback to numeric id if applicable
        let reservationId: number | undefined = (event.extendedProps
            ?.reservationId || event.extendedProps?.reservation_id) as
            | number
            | undefined;
        if (reservationId == null) {
            const maybeNum = Number(event.id);
            if (Number.isFinite(maybeNum)) reservationId = maybeNum as number;
        }

        // Decide approximation by view: exact for timeGrid, approximate otherwise
        const isTimeGrid = (currentView || "").toLowerCase().includes("timegrid");
        const approximate = !isTimeGrid;

        // Stash previous context
        const prevStartStr = info?.oldEvent?.startStr || event.startStr || "";
        const prevDate = prevStartStr?.split("T")[0] || "";
        const prevTime = (prevStartStr?.split("T")[1] || "00:00").slice(0, 5);

        // Mark local drag to suppress WS thrash
        try {
            (globalThis as unknown as {
                __calendarLocalMoves?: Map<string, number>;
            }).__calendarLocalMoves =
                ((globalThis as unknown as {
                    __calendarLocalMoves?: Map<string, number>;
                }).__calendarLocalMoves as Map<string, number>) ||
                new Map<string, number>();
            (
                (globalThis as unknown as {
                    __calendarLocalMoves?: Map<string, number>;
                }).__calendarLocalMoves as Map<string, number>
            ).set(String(event.id), Date.now());
        } catch {}

        // Pre-mark local echo keys before backend call (covers 12/24h variants)
        try {
            const preKeys = generateLocalOpKeys("reservation_updated", {
                id: reservationId ?? event.id,
                wa_id: waId,
                date: newDate,
                time: newTime,
            });
            for (const k of preKeys) this.localEchoManager.markLocalEcho(k);
        } catch {}

        // Backend call via WebSocket (with confirmation). Falls back to HTTP as needed.
        const resp = await this.webSocketService.modifyReservation(
            waId,
            {
                date: newDate,
                time: newTime,
                ...(event.title ? { title: event.title } : {}),
                type,
                ...(typeof reservationId === "number" ? { reservationId } : {}),
                approximate,
            },
            { isLocalized: this.isLocalized },
        );

        if (!resp?.success) {
            // Revert UI move
            if (info?.revert) {
                try {
                    info.revert();
                } catch {}
            }
            // Show error toast
            toastService.reservationModificationFailed({
                customer: event.title || "",
                wa_id: String(waId),
                date: String(newDate),
                time: newTime,
                isLocalized: this.isLocalized,
                error: String(resp?.message || resp?.error || "Operation failed"),
            });
            return;
        }

        // Success: update React state
        try {
            const payload: { id: string; title?: string; start?: string; end?: string } = {
                id: String(event.id),
                start: event.startStr || "",
                ...(event.endStr ? { end: event.endStr } : {}),
            };
            if (typeof event.title === "string") payload.title = event.title;
            updateEvent(String(event.id), payload);
        } catch {}

        // Normalize UI event to slot base and ensure metadata stays consistent
        try {
            const evObj = this.calendarApi.getEventById?.(String(event.id));
            if (evObj) {
                this.localEchoManager.withSuppressedEventChange(() => {
                    // Ensure metadata present
                    try {
                        evObj.setExtendedProp?.("slotDate", String(newDate));
                    } catch {}
                    try {
                        evObj.setExtendedProp?.("slotTime", newTime);
                    } catch {}
                    try {
                        evObj.setExtendedProp?.("cancelled", false);
                    } catch {}
                    // Persist reservationId for future drags
                    try {
                        const rid =
                            typeof reservationId === "number"
                                ? reservationId
                                : (() => {
                                      const n = Number(event.id);
                                      return Number.isFinite(n) ? (n as number) : undefined;
                                  })();
                        if (typeof rid === "number")
                            evObj.setExtendedProp?.("reservationId", rid);
                    } catch {}
                });
            }
        } catch {}

        // Store context for success toasts routed by WS
        try {
            this.localEchoManager.storeModificationContext(String(event.id), {
                waId,
                prevDate,
                prevTime,
                prevType: info?.oldEvent?.extendedProps?.type ?? type,
                name: event.title,
                newDate,
                newTime,
                newType: type,
            });
        } catch {}

        // Reflow previous and target slots using base times
        try {
            const prevBase = this.formatting.normalizeToSlotBase(prevDate, prevTime);
            if (prevDate && prevBase) this.calendarIntegration.reflowSlot(prevDate, prevBase);
        } catch {}
        try {
            if (newDate && newTime) this.calendarIntegration.reflowSlot(String(newDate), newTime);
        } catch {}

        // Mark extra local echo keys to suppress unread increments on WS echo
        try {
            const keys = generateLocalOpKeys("reservation_updated", {
                id: resp?.id || reservationId || event.id,
                wa_id: waId,
                date: String(newDate),
                time: newTime,
            });
            for (const k of keys) this.localEchoManager.markLocalEcho(k);
        } catch {}
    }
}


