import type React from "react";

// Vacation update handler constants
const LOCAL_OP_CLEANUP_MS = 5000;
const CONNECTION_RETRY_DELAY_MS = 300;

export type VacationUpdatePayload = {
  periods: Array<{
    start: string | Date;
    end: string | Date;
    title?: string;
  }>;
};

export type VacationUpdateHandlerCallbacks = {
  getWsRef: () => React.MutableRefObject<WebSocket | null>;
  connect: () => void;
};

export function createVacationUpdateHandler(
  callbacks: VacationUpdateHandlerCallbacks
) {
  const { getWsRef, connect } = callbacks;

  return (payload: VacationUpdatePayload): void => {
    try {
      const buildDateOnly = (d: string | Date): string => {
        const date = typeof d === "string" ? new Date(d) : d;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      const msg = {
        type: "vacation_update" as const,
        data: {
          periods: (payload.periods || [])
            .filter((p) => p?.start && p.end)
            .map((p) => ({
              start: buildDateOnly(p.start),
              end: buildDateOnly(p.end),
              title: p.title,
            })),
        },
      };

      // Mark this as a local operation so echoed notifications are suppressed
      try {
        (globalThis as { __localOps?: Set<string> }).__localOps =
          (globalThis as { __localOps?: Set<string> }).__localOps ||
          new Set<string>();
        const s = (globalThis as { __localOps?: Set<string> })
          .__localOps as Set<string>;
        // For vacation updates, echoed event type is 'vacation_period_updated' with no id/date/time
        // NotificationsButton builds composite key as `${type}::::` when fields are missing
        const localKey = "vacation_period_updated:::";
        s.add(localKey);
        setTimeout(() => {
          try {
            s.delete(localKey);
          } catch {
            // Local op cleanup failed - key may remain in set
          }
        }, LOCAL_OP_CLEANUP_MS);
      } catch {
        // Local op marking failed - echo notification may appear
      }

      const wsRef = getWsRef();
      const send = () => {
        try {
          wsRef.current?.send(JSON.stringify(msg));
        } catch {
          // WebSocket send failed - vacation update not sent
        }
      };

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect();
        setTimeout(send, CONNECTION_RETRY_DELAY_MS);
      } else {
        send();
      }
    } catch {
      // Vacation update handler failed - update not sent
    }
  };
}
