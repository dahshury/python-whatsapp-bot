"use client";

import { i18n } from "@shared/libs/i18n";
import type { FC } from "react";
import { useCallback, useEffect } from "react";
import { Toaster } from "sonner";
import { useCustomerNames } from "@/features/chat/hooks/useCustomerNames";
import { useUndoReservation } from "@/features/reservations/hooks/useUndoReservation";
import { notificationManager } from "@/shared/libs/toast/notification-manager";
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

        const asString = (value: unknown): string | undefined =>
          typeof value === "string" ? value : undefined;
        const asNumber = (value: unknown): number | undefined =>
          typeof value === "number" ? value : undefined;
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
          const reservationId = asNumber((data as { id?: unknown }).id);
          const normalizedWaId =
            asString((data as { wa_id?: unknown }).wa_id) ??
            ((data as { wa_id?: unknown }).wa_id != null
              ? String((data as { wa_id?: unknown }).wa_id)
              : "");
          const eventDate = asString((data as { date?: unknown }).date) ?? "";
          const timeSlot =
            asString((data as { time_slot?: unknown }).time_slot) ?? "";
          const customerName =
            asString((data as { customer_name?: unknown }).customer_name) ??
            undefined;

          const undoCreateAction =
            reservationId !== undefined && normalizedWaId !== ""
              ? () => {
                  undoCreate.mutate({
                    reservationId,
                    waId: normalizedWaId,
                    ar: isLocalized,
                  });
                }
              : null;

          notificationManager.showReservationCreated({
            ...(customerName ? { customer: customerName } : {}),
            wa_id: normalizedWaId,
            date: eventDate,
            time: timeSlot.slice(0, TIME_SLOT_DISPLAY_LENGTH),
            isLocalized,
            ...(undoCreateAction ? { onUndo: undoCreateAction } : {}),
          });
        } else if (
          type === "reservation_updated" ||
          type === "reservation_reinstated"
        ) {
          const reservationId = asNumber((data as { id?: unknown }).id);
          const currentWaId =
            asString((data as { wa_id?: unknown }).wa_id) ??
            ((data as { wa_id?: unknown }).wa_id != null
              ? String((data as { wa_id?: unknown }).wa_id)
              : "");
          const currentDate = asString((data as { date?: unknown }).date) ?? "";
          const currentTimeSlot =
            asString((data as { time_slot?: unknown }).time_slot) ?? "";
          const customerName =
            asString((data as { customer_name?: unknown }).customer_name) ??
            undefined;
          const originalData = (
            data as { original_data?: Record<string, unknown> }
          )?.original_data;

          let undoModifyAction: (() => void) | null = null;

          if (
            reservationId !== undefined &&
            originalData &&
            typeof originalData === "object"
          ) {
            const payload = originalData as Record<string, unknown>;
            // Use ONLY values from original_data - don't fall back to current values
            // This ensures undo reverts to the actual original state, not the new state
            const payloadWaId = asString(payload.wa_id);
            const payloadDate = asString(payload.date);
            const payloadTimeSlot = asString(payload.time_slot);
            const payloadCustomerName = asString(payload.customer_name);
            const payloadType = asNumber(payload.type);

            // Only create undo action if we have the required fields from original_data
            if (payloadWaId && payloadDate && payloadTimeSlot) {
              const safeOriginalData = {
                wa_id: payloadWaId,
                date: payloadDate,
                time_slot: payloadTimeSlot,
                // Include customer_name and type only if they exist in original_data
                // This ensures we revert name and type changes correctly
                ...(payloadCustomerName !== undefined
                  ? { customer_name: payloadCustomerName }
                  : {}),
                ...(payloadType !== undefined ? { type: payloadType } : {}),
              };

              // Detect if phone number (wa_id) changed by comparing with current wa_id
              const phoneChanged = currentWaId && currentWaId !== payloadWaId;

              undoModifyAction = () => {
                undoModify.mutate({
                  reservationId,
                  originalData: safeOriginalData,
                  ar: isLocalized,
                  // Pass new wa_id if phone changed so undo can revert it
                  ...(phoneChanged ? { newWaId: currentWaId } : {}),
                });
              };
            }
          }

          notificationManager.showReservationModified({
            ...(customerName ? { customer: customerName } : {}),
            wa_id: currentWaId,
            date: currentDate,
            time: currentTimeSlot.slice(0, TIME_SLOT_DISPLAY_LENGTH),
            isLocalized,
            ...(undoModifyAction ? { onUndo: undoModifyAction } : {}),
          });
        } else if (type === "reservation_cancelled") {
          const reservationId = asNumber((data as { id?: unknown }).id);
          const normalizedWaId =
            asString((data as { wa_id?: unknown }).wa_id) ??
            ((data as { wa_id?: unknown }).wa_id != null
              ? String((data as { wa_id?: unknown }).wa_id)
              : "");
          const eventDate = asString((data as { date?: unknown }).date) ?? "";
          const timeSlot =
            asString((data as { time_slot?: unknown }).time_slot) ?? "";
          const customerName =
            asString((data as { customer_name?: unknown }).customer_name) ??
            undefined;

          const undoCancelAction =
            reservationId !== undefined
              ? () => {
                  undoCancel.mutate({
                    reservationId,
                    ar: isLocalized,
                  });
                }
              : null;

          notificationManager.showReservationCancelled({
            ...(customerName ? { customer: customerName } : {}),
            wa_id: normalizedWaId,
            date: eventDate,
            time: timeSlot.slice(0, TIME_SLOT_DISPLAY_LENGTH),
            isLocalized,
            ...(undoCancelAction ? { onUndo: undoCancelAction } : {}),
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
