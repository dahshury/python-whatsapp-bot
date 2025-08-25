"use client";

import * as React from "react";
import { toastService } from "@/lib/toast-service";
import { useLanguage } from "@/lib/language-context";

export const ToastRouter: React.FC = () => {
  const { isRTL } = useLanguage();

  React.useEffect(() => {
    const handleAny = (ev: Event) => {
      try {
        const { type, data, __local } = (ev as CustomEvent).detail || {};
        if (!type || !data) return;
        // Show toasts for both local and backend events; unread count is handled elsewhere

        if (type === "reservation_created") {
          toastService.reservationCreated({
            id: data.id,
            customer: data.customer_name,
            wa_id: data.wa_id,
            date: data.date,
            time: (data.time_slot || "").slice(0,5),
            isRTL,
          });
        } else if (type === "reservation_updated" || type === "reservation_reinstated") {
          // Soft toast for modifications
          toastService.reservationModified({
            id: data.id,
            customer: data.customer_name,
            wa_id: data.wa_id,
            date: data.date,
            time: (data.time_slot || "").slice(0,5),
            isRTL,
          });
        } else if (type === "reservation_cancelled") {
          toastService.reservationCancelled({
            id: data.id,
            customer: data.customer_name,
            wa_id: data.wa_id,
            date: data.date,
            time: (data.time_slot || "").slice(0,5),
            isRTL,
          });
        } else if (type === "conversation_new_message") {
          const title = isRTL ? `رسالة • ${data.wa_id}` : `Message • ${data.wa_id}`;
          toastService.newMessage({ title, description: (data.message || "").slice(0, 100), isRTL });
        } else if (type === "vacation_period_updated") {
          // Keep silent or minimal toast
        }
      } catch {}
    };
    window.addEventListener("notification:add", handleAny as EventListener);
    return () => {
      window.removeEventListener("notification:add", handleAny as EventListener);
      window.removeEventListener("realtime", handleAny as EventListener);
    };
  }, [isRTL]);

  return null;
};


