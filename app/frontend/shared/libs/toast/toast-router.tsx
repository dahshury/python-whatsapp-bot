"use client";

import { i18n } from "@shared/libs/i18n";
import type { FC } from "react";
import { useCallback, useEffect } from "react";
import { Toaster } from "sonner";
import { useCustomerNames } from "@/features/chat/hooks/useCustomerNames";
import { notificationManager } from "@/shared/libs/toast/notification-manager";
import { useUndoReservation } from "@/features/reservations/hooks/useUndoReservation";
import { toastService } from "./toast-service";

// Maximum length for time slot display (HH:MM format)
const TIME_SLOT_DISPLAY_LENGTH = 5;
// Maximum length for message description in toast notifications
const MAX_MESSAGE_DESCRIPTION_LENGTH = 100;

export const ToastRouter: FC = () => {
  const { data: customerNames } = useCustomerNames();
  const { undoCreate, undoModify, undoCancel } = useUndoReservation();

  const resolveCustomerName = useCallback(
    (waId?: string, fallbackName?: string): string | undefined => {
      try {
        if (fallbackName && String(fallbackName).trim()) {
          return String(fallbackName);
        }
        const id = String(waId || "");
        if (!id) {
          return;
        }
        if (!customerNames) {
          return;
        }
        const customer = customerNames[id];
        return customer?.customer_name || undefined;
      } catch {
        // Customer name resolution failed - return undefined
      }
      return;
    },
    [customerNames]
  );

  useEffect(() => {
    const handleAny = (ev: Event) => {
      try {
        const { type, data } = (ev as CustomEvent).detail || {};
        if (!(type && data)) {
          return;
        }
        const isLocalized = (() => {
          try {
            const loc = localStorage.getItem("locale");
            return Boolean(loc && loc !== "en");
          } catch {
            return false;
          }
        })();

        const eventSource = (data as { _source?: string })?._source;
        const isUndoEvent = eventSource === "undo";

        if (isUndoEvent) {
          return;
        }

        if (type === "reservation_created") {
          const reservationId = data.id as number | undefined;
          const waId = data.wa_id as string | undefined;
          
          notificationManager.showReservationCreated({
            customer: data.customer_name,
            wa_id: data.wa_id,
            date: data.date,
            time: (data.time_slot || "").slice(0, TIME_SLOT_DISPLAY_LENGTH),
            isLocalized,
            onUndo:
              reservationId && waId
                ? () => {
                    undoCreate.mutate({
                      reservationId,
                      waId,
                      ar: isLocalized,
                    });
                  }
                : undefined,
          });
        } else if (
          type === "reservation_updated" ||
          type === "reservation_reinstated"
        ) {
          const reservationId = data.id as number | undefined;
          const waId = data.wa_id as string | undefined;
          const date = data.date as string | undefined;
          const timeSlot = data.time_slot as string | undefined;
          const customerName = data.customer_name as string | undefined;
          const reservationType = data.type as number | undefined;
          const originalData = (data as { original_data?: Record<string, unknown> })?.original_data;

          notificationManager.showReservationModified({
            customer: data.customer_name,
            wa_id: data.wa_id,
            date: data.date,
            time: (data.time_slot || "").slice(0, TIME_SLOT_DISPLAY_LENGTH),
            isLocalized,
            onUndo:
              reservationId && originalData && typeof originalData === "object"
                && originalData.date && originalData.time_slot
                ? () => {
                    const safeOriginalData = {
                      wa_id: (originalData.wa_id as string) || waId,
                      date: String(originalData.date || date || ""),
                      time_slot: String(originalData.time_slot || timeSlot || ""),
                      customer_name: (originalData.customer_name as string) || customerName,
                      type: originalData.type as number | undefined,
                    };

                    undoModify.mutate({
                      reservationId,
                      originalData: safeOriginalData,
                      ar: isLocalized,
                    });
                  }
                : undefined,
          });
        } else if (type === "reservation_cancelled") {
          const reservationId = data.id as number | undefined;
          
          notificationManager.showReservationCancelled({
            customer: data.customer_name,
            wa_id: data.wa_id,
            date: data.date,
            time: (data.time_slot || "").slice(0, TIME_SLOT_DISPLAY_LENGTH),
            isLocalized,
            onUndo:
              reservationId
                ? () => {
                    undoCancel.mutate({
                      reservationId,
                      ar: isLocalized,
                    });
                  }
                : undefined,
          });
        } else if (type === "conversation_new_message") {
          const messageLabel = i18n.getMessage(
            "toast_new_message",
            isLocalized
          );
          const waId = String(
            (data as { wa_id?: string; waId?: string })?.wa_id ||
              (data as { waId?: string }).waId ||
              ""
          );
          const name = resolveCustomerName(
            waId,
            (data as { customer_name?: string })?.customer_name
          );
          const who = name || waId;
          const title = `${messageLabel} • ${who}`;
          const maybeDate = (data as { date?: string }).date;
          const maybeTime = (data as { time?: string }).time;
          const maybeMessage = (data as { message?: string }).message;
          toastService.newMessage({
            title,
            description: (maybeMessage || "").slice(
              0,
              MAX_MESSAGE_DESCRIPTION_LENGTH
            ),
            wa_id: waId,
            ...(name ? { customerName: name } : {}),
            ...(typeof maybeDate === "string" ? { date: maybeDate } : {}),
            ...(typeof maybeTime === "string" ? { time: maybeTime } : {}),
            ...(typeof maybeMessage === "string"
              ? { message: maybeMessage }
              : {}),
            isLocalized,
          });
        } else if (type === "vacation_period_updated") {
          // silent
        }
      } catch {
        // Notification handling failed - skip this notification
      }
    };
    window.addEventListener("notification:add", handleAny as EventListener);
    return () => {
      window.removeEventListener(
        "notification:add",
        handleAny as EventListener
      );
    };
  }, [resolveCustomerName, undoCreate, undoModify, undoCancel]);

  return (
    <Toaster
      gap={8}
      position="bottom-right"
      style={{ zIndex: "var(--z-toaster)" }}
      toastOptions={{
        className: "sonner-toast",
        descriptionClassName: "sonner-description",
        style: {
          background: "transparent",
          border: "none",
          // @ts-expect-error custom css var forwarded to CSS
          "--toaster-z": "var(--z-toaster)",
        },
        classNames: {
          toast: "sonner-toast group",
          title: "sonner-title",
          description: "sonner-description",
          actionButton: "sonner-action",
          cancelButton: "sonner-cancel",
          closeButton: "sonner-close",
          error: "sonner-error",
          success: "sonner-success",
          warning: "sonner-warning",
          info: "sonner-info",
        },
      }}
    />
  );
};
