"use client";

import { i18n } from "@shared/libs/i18n";
import type { FC } from "react";
import { useCallback, useEffect } from "react";
import { Toaster } from "sonner";
import { useCustomerNames } from "@/features/chat/hooks/useCustomerNames";
import { notificationManager } from "@/shared/libs/toast/notification-manager";
import { toastService } from "./toast-service";

// Maximum length for time slot display (HH:MM format)
const TIME_SLOT_DISPLAY_LENGTH = 5;
// Maximum length for message description in toast notifications
const MAX_MESSAGE_DESCRIPTION_LENGTH = 100;

export const ToastRouter: FC = () => {
  const { data: customerNames } = useCustomerNames();

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

        if (type === "reservation_created") {
          notificationManager.showReservationCreated({
            customer: data.customer_name,
            wa_id: data.wa_id,
            date: data.date,
            time: (data.time_slot || "").slice(0, TIME_SLOT_DISPLAY_LENGTH),
            isLocalized,
          });
        } else if (
          type === "reservation_updated" ||
          type === "reservation_reinstated"
        ) {
          notificationManager.showReservationModified({
            customer: data.customer_name,
            wa_id: data.wa_id,
            date: data.date,
            time: (data.time_slot || "").slice(0, TIME_SLOT_DISPLAY_LENGTH),
            isLocalized,
          });
        } else if (type === "reservation_cancelled") {
          notificationManager.showReservationCancelled({
            customer: data.customer_name,
            wa_id: data.wa_id,
            date: data.date,
            time: (data.time_slot || "").slice(0, TIME_SLOT_DISPLAY_LENGTH),
            isLocalized,
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
  }, [resolveCustomerName]);

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
