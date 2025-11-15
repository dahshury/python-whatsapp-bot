import type { QueryClient } from "@tanstack/react-query";
import type React from "react";
import type { Reservation } from "@/entities/event";
import type { CalendarCoreRef } from "@/features/calendar";
import type { CalendarEvent } from "@/widgets/data-table-editor/types";

const reservationDebugEnabled =
  process.env.NEXT_PUBLIC_DISABLE_RESERVATION_DEBUG !== "true";
const reservationDebugLog = (_label: string, _payload?: unknown) => {
  if (!reservationDebugEnabled) {
    return;
  }
  // Debug logging disabled - no-op function
};

/**
 * Dependencies for customer WA ID modification service
 */
export type CustomerWaIdModifierDependencies = {
  queryClient: QueryClient;
  calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
  selectedConversationId: string | null;
  setSelectedConversation: (id?: string | null) => void;
  onEventModified?: (eventId: string, event: CalendarEvent) => void;
};

/**
 * Creates a service function for modifying customer WA ID (phone number).
 * This handles:
 * - API call to modify ID endpoint
 * - Cache rekeying (customer-names, calendar-reservations, reservations-date-range, customer-grid-data, customer-stats)
 * - Calendar API event updates
 * - Sidebar chat store updates
 *
 * All behavior is preserved exactly as in the original hook implementation.
 */
export function createCustomerWaIdModifier(
  deps: CustomerWaIdModifierDependencies
) {
  const {
    queryClient,
    calendarRef,
    selectedConversationId,
    setSelectedConversation,
    onEventModified,
  } = deps;

  return async (
    oldWaId: string,
    newWaId: string,
    nextCustomerName?: string | null,
    reservationId?: number | null
  ): Promise<void> => {
    // Try to get customer name from multiple sources
    const customerNamesCache = queryClient.getQueryData<
      Record<string, { wa_id: string; customer_name: string | null }>
    >(["customer-names"]);

    const payloadCustomerName =
      nextCustomerName ??
      customerNamesCache?.[oldWaId]?.customer_name ??
      customerNamesCache?.[newWaId]?.customer_name ?? // Fallback in case oldWaId was already changed
      null;

    reservationDebugLog("modifyCustomerWaId:start", {
      oldWaId,
      newWaId,
      payloadCustomerName,
      nextCustomerName,
      reservationId,
      fallbackSource: (() => {
        if (nextCustomerName !== undefined) {
          return "event";
        }
        if (customerNamesCache?.[oldWaId]) {
          return "customer-names-cache[oldWaId]";
        }
        if (customerNamesCache?.[newWaId]) {
          return "customer-names-cache[newWaId]";
        }
        return "null";
      })(),
      cacheKeys: Object.keys(customerNamesCache ?? {}),
    });

    const response = await fetch("/api/modify-id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        old_id: oldWaId,
        new_id: newWaId,
        customer_name: payloadCustomerName,
        reservation_id: reservationId ?? null,
      }),
    });

    const result = (await response.json()) as {
      success?: boolean;
      message?: string;
      data?: { customer_name?: string | null };
    };
    reservationDebugLog("modifyCustomerWaId:response", {
      status: response.status,
      ok: response.ok,
      result,
    });

    if (!(response.ok && result?.success)) {
      const errorMessage =
        result?.message || "Failed to update customer phone number";
      reservationDebugLog("modifyCustomerWaId:error", {
        oldWaId,
        newWaId,
        errorMessage,
        requestBody: {
          old_id: oldWaId,
          new_id: newWaId,
          customer_name: payloadCustomerName,
          reservation_id: reservationId ?? null,
        },
        response: result,
      });
      throw new Error(errorMessage);
    }

    const resolvedCustomerName =
      result?.data?.customer_name ?? payloadCustomerName;
    reservationDebugLog("modifyCustomerWaId:resolvedName", {
      oldWaId,
      newWaId,
      resolvedCustomerName,
      payloadCustomerName,
    });

    // Invalidate customer names cache to force fresh fetch from backend
    // This ensures that on page refresh, we get the most up-to-date data
    await queryClient.invalidateQueries({
      queryKey: ["customer-names"],
    });
    reservationDebugLog("modifyCustomerWaId:customerNamesCacheVerify", {
      cacheAfterSet: queryClient.getQueryData<Record<string, unknown>>([
        "customer-names",
      ]),
      sizeAfterSet: Object.keys(
        queryClient.getQueryData<Record<string, unknown>>(["customer-names"]) ??
          {}
      ).length,
      hasNewWaIdAfterSet: Object.hasOwn(
        queryClient.getQueryData<Record<string, unknown>>(["customer-names"]) ??
          {},
        newWaId
      ),
    });

    // Immediately invalidate to pull authoritative backend snapshot
    await queryClient.invalidateQueries({
      queryKey: ["customer-names"],
      exact: true,
    });

    // Helper to rekey reservation maps
    const rekeyReservationMap = (
      map: Record<string, Reservation[]> | undefined
    ): Record<string, Reservation[]> | undefined => {
      if (!(map && Object.hasOwn(map, oldWaId))) {
        return map;
      }
      const updated = { ...map };
      const reservations = updated[oldWaId];
      delete updated[oldWaId];
      if (reservations) {
        updated[newWaId] = reservations.map((reservation) => ({
          ...reservation,
          wa_id: newWaId,
          customer_id: newWaId,
          customer_name:
            resolvedCustomerName !== undefined
              ? (resolvedCustomerName ?? reservation.customer_name ?? null)
              : (reservation.customer_name ?? null),
        }));
      }
      return updated;
    };

    // Rekey calendar reservations caches
    queryClient.setQueriesData(
      { queryKey: ["calendar-reservations"] },
      (old: Record<string, Reservation[]> | undefined) =>
        rekeyReservationMap(old)
    );

    // Rekey date-range reservations caches
    queryClient.setQueriesData(
      { queryKey: ["reservations-date-range"] },
      (old: Record<string, Reservation[]> | undefined) =>
        rekeyReservationMap(old)
    );
    const customerNamesEntry = queryClient.getQueryData<
      Record<string, { wa_id: string; customer_name: string | null }>
    >(["customer-names"])?.[newWaId];
    const calendarReservationKeys = queryClient
      .getQueriesData<Record<string, Reservation[]> | undefined>({
        queryKey: ["calendar-reservations"],
      })
      .flatMap(([, value]) => (value ? Object.keys(value) : []));
    reservationDebugLog("modifyCustomerWaId:cacheRekey", {
      customerNamesEntry,
      calendarReservationKeys,
    });

    // Move customer grid data
    const oldGridData = queryClient.getQueryData<
      { name: string; age: number | null } | undefined
    >(["customer-grid-data", oldWaId]);
    if (oldGridData !== undefined) {
      queryClient.setQueryData(["customer-grid-data", newWaId], {
        ...oldGridData,
        ...(resolvedCustomerName !== undefined
          ? { name: resolvedCustomerName ?? "" }
          : {}),
      });
      queryClient.removeQueries({
        queryKey: ["customer-grid-data", oldWaId],
        exact: true,
      });
    }

    // Move customer stats cache
    const oldStats = queryClient.getQueryData<
      Record<string, unknown> | undefined
    >(["customer-stats", oldWaId]);
    if (oldStats !== undefined) {
      queryClient.setQueryData(["customer-stats", newWaId], {
        ...oldStats,
        ...(resolvedCustomerName !== undefined
          ? { customerName: resolvedCustomerName }
          : {}),
      });
      queryClient.removeQueries({
        queryKey: ["customer-stats", oldWaId],
        exact: true,
      });
    }

    // Update calendar API and React state if available
    const calendarApi = calendarRef?.current?.getApi?.();
    if (calendarApi) {
      try {
        // Suppress eventChange during these programmatic updates
        const globalScope = globalThis as {
          __suppressEventChangeDepth?: number;
        };
        const currentDepth = globalScope.__suppressEventChangeDepth || 0;
        globalScope.__suppressEventChangeDepth = currentDepth + 1;

        try {
          // Find all events with the old waId and update their extendedProps
          const allEvents = calendarApi.getEvents?.() || [];
          for (const eventApi of allEvents) {
            const eventWaId =
              (eventApi as { extendedProps?: Record<string, unknown> })
                ?.extendedProps?.waId ||
              (eventApi as { extendedProps?: Record<string, unknown> })
                ?.extendedProps?.wa_id;

            if (String(eventWaId) === oldWaId) {
              // Update waId and customer name in extendedProps
              (
                eventApi as {
                  setExtendedProp?: (key: string, value: unknown) => void;
                }
              )?.setExtendedProp?.("waId", newWaId);
              (
                eventApi as {
                  setExtendedProp?: (key: string, value: unknown) => void;
                }
              )?.setExtendedProp?.("wa_id", newWaId);
              (
                eventApi as {
                  setExtendedProp?: (key: string, value: unknown) => void;
                }
              )?.setExtendedProp?.("phone", newWaId);

              // Update customer name if we have one
              if (
                resolvedCustomerName !== undefined &&
                resolvedCustomerName !== null
              ) {
                (
                  eventApi as {
                    setExtendedProp?: (key: string, value: unknown) => void;
                  }
                )?.setExtendedProp?.("customerName", resolvedCustomerName);
                (
                  eventApi as {
                    setProp?: (key: string, value: unknown) => void;
                  }
                )?.setProp?.("title", resolvedCustomerName);
              }

              // Also trigger onEventModified to update React state
              const eventId = String((eventApi as { id?: unknown }).id || "");
              if (eventId && onEventModified) {
                const updatedEvent: CalendarEvent = {
                  id: eventId,
                  title:
                    resolvedCustomerName ??
                    (eventApi as { title?: string }).title ??
                    "",
                  start: (eventApi as { startStr?: string }).startStr ?? "",
                  ...((eventApi as { endStr?: string }).endStr
                    ? { end: (eventApi as { endStr?: string }).endStr }
                    : {}),
                  type: "reservation",
                  extendedProps: {
                    ...((
                      eventApi as { extendedProps?: Record<string, unknown> }
                    ).extendedProps || {}),
                    waId: newWaId,
                    phone: newWaId,
                    ...(resolvedCustomerName !== undefined &&
                    resolvedCustomerName !== null
                      ? { customerName: resolvedCustomerName }
                      : {}),
                  },
                };
                onEventModified(eventId, updatedEvent);
              }
              reservationDebugLog("modifyCustomerWaId:updateCalendarEvent", {
                eventId: (eventApi as { id?: string | number }).id,
                newWaId,
                resolvedCustomerName,
              });
            }
          }
        } finally {
          // Restore suppression depth
          const d = globalScope.__suppressEventChangeDepth || 0;
          globalScope.__suppressEventChangeDepth = Math.max(0, d - 1);
        }
      } catch (_error) {
        // Silently ignore errors when restoring event change suppression
      }
    }

    // Update selected conversation when it points to the old waId
    if (
      selectedConversationId === oldWaId ||
      selectedConversationId === `+${oldWaId}`
    ) {
      setSelectedConversation(newWaId);
      reservationDebugLog("modifyCustomerWaId:updateSelectedConversation", {
        previous: selectedConversationId,
        next: newWaId,
      });
    }

    // Don't invalidate queries - we've already manually updated all caches
    // Invalidating would cause refetch which might race with our manual updates
    // The caches will be refetched on next page load anyway
    reservationDebugLog("modifyCustomerWaId:completed", {
      oldWaId,
      newWaId,
      resolvedCustomerName,
    });
  };
}
