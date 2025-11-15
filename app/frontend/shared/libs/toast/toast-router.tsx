"use client";

import { i18n } from "@shared/libs/i18n";
import type { FC } from "react";
import { useCallback, useEffect } from "react";
import { Toaster } from "sonner";
import { useCustomerNames } from "@/features/chat/hooks/useCustomerNames";
import { useNotificationPreferences } from "@/features/notifications/hooks/useNotificationPreferences";
import {
  playNotificationChime,
  sendEmailNotificationPlaceholder,
  showDesktopNotification,
} from "@/features/notifications/lib/notification-channels";
import { isWithinQuietHours } from "@/features/notifications/lib/quiet-hours";
import { useUndoReservation } from "@/features/reservations/hooks/useUndoReservation";
import {
  getUnknownCustomerLabel,
  isSameAsWaId,
} from "@/shared/libs/customer-name";
import { newMessage } from "@/shared/libs/toast/message-toast";
import { notificationManager } from "@/shared/libs/toast/notification-manager";

// Maximum length for time slot display (HH:MM format)
const TIME_SLOT_DISPLAY_LENGTH = 5;
// Maximum length for message description in toast notifications
const MAX_MESSAGE_DESCRIPTION_LENGTH = 100;
// Time conversion constant
const MILLISECONDS_PER_SECOND = 1000;

export const ToastRouter: FC = () => {
  const { data: customerNames } = useCustomerNames();
  const { undoCreate, undoModify, undoCancel } = useUndoReservation();
  const {
    preferences: notificationPreferences,
    timezone: notificationTimezone,
  } = useNotificationPreferences();

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
    const timers = new Set<number>();
    const reservationToggleMap: Record<string, boolean> = {
      reservation_created: notificationPreferences.notifyOnEventCreate,
      reservation_updated: notificationPreferences.notifyOnEventUpdate,
      reservation_reinstated: notificationPreferences.notifyOnEventUpdate,
      reservation_cancelled: notificationPreferences.notifyOnEventDelete,
    };
    const delayMs = Math.max(
      0,
      Number(
        (notificationPreferences as { notificationDelay?: number })
          .notificationDelay ?? 0
      ) * MILLISECONDS_PER_SECOND
    );

    const shouldHandleReservationEvent = (eventType: string) => {
      if (eventType in reservationToggleMap) {
        return reservationToggleMap[eventType];
      }
      return true;
    };

    const scheduleNotification = (fn: () => void) => {
      if (typeof window === "undefined" || delayMs <= 0) {
        fn();
        return;
      }
      const timeoutId = window.setTimeout(() => {
        timers.delete(timeoutId);
        fn();
      }, delayMs);
      timers.add(timeoutId);
    };

    const triggerChannels = (
      title: string,
      body: string,
      tag: string
    ): void => {
      if (notificationPreferences.notificationSound) {
        playNotificationChime();
      }
      if (notificationPreferences.notificationDesktop) {
        showDesktopNotification({ title, body, tag });
      }
      if (
        (notificationPreferences as { notificationEmail?: boolean })
          .notificationEmail
      ) {
        sendEmailNotificationPlaceholder(title);
      }
    };

    const formatReservationBody = (
      customer?: string,
      date?: string,
      time?: string
    ) => {
      const dateTime = [date, time].filter(Boolean).join(" ");
      return [customer, dateTime].filter(Boolean).join(" • ");
    };

    const processNotification = (
      type: string,
      data: Record<string, unknown>
    ) => {
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
        const friendlyName =
          customerName ?? resolveCustomerName(normalizedWaId, customerName);

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

        triggerChannels(
          i18n.getMessage("toast_reservation_created", isLocalized),
          formatReservationBody(
            friendlyName,
            eventDate,
            timeSlot.slice(0, TIME_SLOT_DISPLAY_LENGTH)
          ),
          type
        );
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
        const friendlyName =
          customerName ?? resolveCustomerName(currentWaId, customerName);
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
          const payloadWaId = asString(payload.wa_id);
          const payloadDate = asString(payload.date);
          const payloadTimeSlot = asString(payload.time_slot);
          const payloadCustomerName = asString(payload.customer_name);
          const payloadType = asNumber(payload.type);

          if (payloadWaId && payloadDate && payloadTimeSlot) {
            const safeOriginalData = {
              wa_id: payloadWaId,
              date: payloadDate,
              time_slot: payloadTimeSlot,
              ...(payloadCustomerName !== undefined
                ? { customer_name: payloadCustomerName }
                : {}),
              ...(payloadType !== undefined ? { type: payloadType } : {}),
            };

            const phoneChanged = currentWaId && currentWaId !== payloadWaId;

            undoModifyAction = () => {
              undoModify.mutate({
                reservationId,
                originalData: safeOriginalData,
                ar: isLocalized,
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

        triggerChannels(
          i18n.getMessage("toast_reservation_modified", isLocalized),
          formatReservationBody(
            friendlyName,
            currentDate,
            currentTimeSlot.slice(0, TIME_SLOT_DISPLAY_LENGTH)
          ),
          type
        );
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
        const friendlyName =
          customerName ?? resolveCustomerName(normalizedWaId, customerName);

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

        triggerChannels(
          i18n.getMessage("toast_reservation_cancelled", isLocalized),
          formatReservationBody(
            friendlyName,
            eventDate,
            timeSlot.slice(0, TIME_SLOT_DISPLAY_LENGTH)
          ),
          type
        );
      } else if (type === "conversation_new_message") {
        const messageLabel = i18n.getMessage("toast_new_message", isLocalized);
        const waId = String(
          (data as { wa_id?: string; waId?: string })?.wa_id ||
            (data as { waId?: string }).waId ||
            ""
        );
        const name = resolveCustomerName(
          waId,
          (data as { customer_name?: string })?.customer_name
        );
        const safeName =
          name && !isSameAsWaId(name, waId)
            ? name
            : getUnknownCustomerLabel(isLocalized);
        const title = `${messageLabel} • ${safeName}`;
        const maybeDate = (data as { date?: string }).date;
        const maybeTime = (data as { time?: string }).time;
        const maybeMessage = (data as { message?: string }).message;
        newMessage({
          title,
          description: (maybeMessage || "").slice(
            0,
            MAX_MESSAGE_DESCRIPTION_LENGTH
          ),
          wa_id: waId,
          ...(name && !isSameAsWaId(name, waId) ? { customerName: name } : {}),
          ...(typeof maybeDate === "string" ? { date: maybeDate } : {}),
          ...(typeof maybeTime === "string" ? { time: maybeTime } : {}),
          ...(typeof maybeMessage === "string"
            ? { message: maybeMessage }
            : {}),
          isLocalized,
        });

        triggerChannels(
          messageLabel,
          [safeName, maybeMessage].filter(Boolean).join(" • "),
          type
        );
      }
    };

    const handleAny = (ev: Event) => {
      try {
        const { type, data } = (ev as CustomEvent).detail || {};
        if (!(type && data)) {
          return;
        }

        if ((data as { _source?: string })?._source === "undo") {
          return;
        }

        if (!shouldHandleReservationEvent(type)) {
          return;
        }

        if (
          isWithinQuietHours(
            notificationPreferences.quietHours,
            notificationTimezone
          )
        ) {
          return;
        }

        scheduleNotification(() => {
          processNotification(type, data);
        });
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
      for (const timerId of timers) {
        window.clearTimeout(timerId);
      }
    };
  }, [
    resolveCustomerName,
    undoCreate,
    undoModify,
    undoCancel,
    notificationPreferences,
    notificationTimezone,
  ]);

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
