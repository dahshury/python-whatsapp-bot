"use client";

import { logger } from "@shared/libs/logger";
import type { FC } from "react";
import { useEffect } from "react";
import {
  isLocalOperation,
  type LocalOpData,
} from "@/shared/libs/realtime-utils";

type RealtimeMessage = {
  detail?: {
    type?: string;
    data?: LocalOpData;
  };
};

export const RealtimeEventBus: FC = () => {
  useEffect(() => {
    const handler = (message: RealtimeMessage) => {
      try {
        const { type, data } = message?.detail || {};
        if (!(type && data)) {
          return;
        }
        try {
          logger.debug("🔔 [RealtimeEventBus] message", type, data);
        } catch {
          // Logger failed - continue processing message
        }

        // Suppress notification events for snapshots and ack/nack control messages
        try {
          const t = String(type).toLowerCase();
          if (t === "snapshot") {
            return;
          }
          // Revert: do not filter here; source filtering happens in useWebSocketData and reducer
          if (t.endsWith("_ack") || t.endsWith("_nack")) {
            return;
          }
          if (t === "ack" || t === "nack") {
            return;
          }
          // Never emit notifications for typing indicators
          if (t === "conversation_typing") {
            return;
          }
          // Never emit notifications for customer document updates
          if (t === "customer_document_updated") {
            return;
          }
          // Never emit notifications for tool-call chat entries or system/assistant messages
          if (t === "conversation_new_message") {
            try {
              const role = String(
                (data as { role?: string } | undefined)?.role || ""
              ).toLowerCase();
              // Only show notifications for user/customer messages
              if (role !== "user" && role !== "customer") {
                return;
              }
            } catch {
              // Role extraction failed - continue processing
            }
          }
        } catch {
          // Type processing failed - continue with notification dispatch
        }

        const local = isLocalOperation(type, data);

        // Prefer server-provided timestamp for dedupe with persisted history
        let tsNum = Date.now();
        try {
          const tsIso = (message?.detail as unknown as { timestamp?: string })
            ?.timestamp;
          if (tsIso) {
            const parsed = Date.parse(String(tsIso));
            if (!Number.isNaN(parsed)) {
              tsNum = parsed;
            }
          }
        } catch {
          // Timestamp parsing failed - use current time
        }
        // Dispatch the notification capture event with local hint
        // Include _source in the event so notification button can filter
        try {
          const notif = new CustomEvent("notification:add", {
            detail: { type, data, ts: tsNum, __local: local },
          });
          window.dispatchEvent(notif);
        } catch {
          // Event dispatch failed - notification may be lost
        }
      } catch {
        // Message processing failed entirely - skip this message
      }
    };

    // The ws hook already dispatches 'realtime' events internally after state updates.
    // Here we subscribe to those and mirror the notification flow, with dedupe and local detection.
    window.addEventListener("realtime", handler as EventListener);
    return () =>
      window.removeEventListener("realtime", handler as EventListener);
  }, []);

  return null;
};
