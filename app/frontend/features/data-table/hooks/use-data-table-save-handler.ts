import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useCallback, useState } from "react";
import type { Reservation, RowChange } from "@/entities/event";
import type { CalendarCoreRef } from "@/features/calendar";
import {
  type CancelReservationParams,
  type CreateReservationParams,
  type MutateReservationParams,
  useCancelReservation,
  useCreateReservation,
  useMutateReservation,
} from "@/features/reservations/hooks";
import { extractCancellationData } from "@/features/reservations/utils/extract-cancellation-data";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import type { BaseColumnProps } from "@/shared/libs/data-grid/components/core/types";
import { useSidebarChatStore } from "@/shared/libs/store/sidebar-chat-store";
import { FormattingService } from "@/shared/libs/utils/formatting.service";
import { normalizePhoneForStorage } from "@/shared/libs/utils/phone-utils";
import type {
  CalendarEvent,
  EditingChanges,
  ValidationResult,
} from "@/widgets/data-table-editor/types";

const TOAST_ERROR_DURATION_MS = 5000;
const TOAST_VALIDATION_DURATION_MS = 8000;
const GRID_DEFAULT_COLUMN_WIDTH = 100;
const CALENDAR_UPDATE_DELAY_MS = 150;

const reservationDebugEnabled =
  process.env.NEXT_PUBLIC_DISABLE_RESERVATION_DEBUG !== "true";
const reservationDebugLog = (_label: string, _payload?: unknown) => {
  if (!reservationDebugEnabled) {
    return;
  }
  // Debug logging disabled - no-op function
};

type ModificationPayload = {
  mutation: MutateReservationParams;
  event: CalendarEvent;
  waIdChange?: { oldWaId: string; newWaId: string } | null;
};

type UseDataTableSaveHandlerProps = {
  calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
  isLocalized: boolean;
  slotDurationHours: number;
  freeRoam: boolean;
  gridRowToEventMapRef: React.RefObject<Map<number, CalendarEvent>>;
  dataProviderRef: React.RefObject<DataProvider | null>;
  validateAllCells: () => ValidationResult;
  onEventAdded?: (event: CalendarEvent) => void;
  onEventModified?: (eventId: string, event: CalendarEvent) => void;
  onEventCancelled?: (eventId: string) => void;
  refreshCustomerData?: () => Promise<void>;
};

export function useDataTableSaveHandler({
  calendarRef,
  isLocalized,
  slotDurationHours: _slotDurationHours,
  freeRoam,
  gridRowToEventMapRef,
  dataProviderRef,
  validateAllCells,
  onEventModified,
  onEventCancelled: _onEventCancelled,
  refreshCustomerData,
}: UseDataTableSaveHandlerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const formattingService = new FormattingService();
  const queryClient = useQueryClient();
  const { selectedConversationId, setSelectedConversation } =
    useSidebarChatStore();

  // Use TanStack Query mutations
  const modifyMutation = useMutateReservation();
  const createMutation = useCreateReservation();
  const cancelMutation = useCancelReservation();

  const modifyCustomerWaId = useCallback(
    async (
      oldWaId: string,
      newWaId: string,
      nextCustomerName?: string | null,
      reservationId?: number | null
    ) => {
      const payloadCustomerName =
        nextCustomerName ??
        queryClient.getQueryData<
          Record<string, { wa_id: string; customer_name: string | null }>
        >(["customer-names"])?.[oldWaId]?.customer_name ??
        null;
      reservationDebugLog("modifyCustomerWaId:start", {
        oldWaId,
        newWaId,
        payloadCustomerName,
        nextCustomerName,
        reservationId,
        fallbackSource:
          nextCustomerName !== undefined ? "event" : "customer-names-cache",
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

      // Update customer names cache (rekey)
      queryClient.setQueryData<
        | Record<string, { wa_id: string; customer_name: string | null }>
        | undefined
      >(["customer-names"], (old) => {
        reservationDebugLog("modifyCustomerWaId:customerNamesCacheBefore", {
          oldSize: old ? Object.keys(old).length : 0,
          hasOldWaId: old ? Object.hasOwn(old, oldWaId) : false,
          hasNewWaId: old ? Object.hasOwn(old, newWaId) : false,
        });
        if (!old) {
          return old;
        }
        const updated = { ...old };
        const entry = updated[oldWaId];
        if (entry) {
          delete updated[oldWaId];
          updated[newWaId] = {
            ...entry,
            wa_id: newWaId,
            // Only update customer_name if we have a non-null value, otherwise keep existing
            customer_name:
              resolvedCustomerName !== null &&
              resolvedCustomerName !== undefined
                ? resolvedCustomerName
                : (entry.customer_name ?? null),
          };
        } else {
          // No existing entry, create new one with resolved name (even if null)
          updated[newWaId] = {
            wa_id: newWaId,
            customer_name: resolvedCustomerName ?? null,
          };
        }
        reservationDebugLog("modifyCustomerWaId:customerNamesCacheAfter", {
          newSize: Object.keys(updated).length,
          hasOldWaId: Object.hasOwn(updated, oldWaId),
          hasNewWaId: Object.hasOwn(updated, newWaId),
          newEntry: updated[newWaId],
        });
        return updated;
      });
      reservationDebugLog("modifyCustomerWaId:customerNamesCacheVerify", {
        cacheAfterSet: queryClient.getQueryData<Record<string, unknown>>([
          "customer-names",
        ]),
        sizeAfterSet: Object.keys(
          queryClient.getQueryData<Record<string, unknown>>([
            "customer-names",
          ]) ?? {}
        ).length,
        hasNewWaIdAfterSet: Object.hasOwn(
          queryClient.getQueryData<Record<string, unknown>>([
            "customer-names",
          ]) ?? {},
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
    },
    [
      queryClient,
      calendarRef,
      onEventModified,
      selectedConversationId,
      setSelectedConversation,
    ]
  );

  // Helper to extract modification data from RowChange and CalendarEvent
  const extractModificationData = useCallback(
    (
      change: RowChange,
      original: CalendarEvent
    ): ModificationPayload | null => {
      const TIME_FORMAT_LENGTH = 5;
      const evId = String(original.id);
      const waIdRaw = (
        original.extendedProps?.waId ||
        original.id ||
        ""
      ).toString();
      // Normalize the old waId to ensure consistent format (no + prefix)
      const waId = normalizePhoneForStorage(waIdRaw) || waIdRaw;
      if (!waId) {
        return null;
      }
      const prevStartStr = original.start || "";
      const prevDate = prevStartStr.split("T")[0];
      const prevTimeRaw =
        prevStartStr.split("T")[1]?.slice(0, TIME_FORMAT_LENGTH) || "00:00";
      let dateStrNew = prevDate;
      let timeStrNew =
        prevStartStr.split("T")[1]?.slice(0, TIME_FORMAT_LENGTH) || "00:00";

      if (change.scheduled_time instanceof Date) {
        const s = change.scheduled_time;
        dateStrNew = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
        timeStrNew = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
      } else if (
        typeof change.scheduled_time === "string" &&
        change.scheduled_time.includes("T")
      ) {
        const [dPart, tPart] = change.scheduled_time.split("T");
        dateStrNew = dPart;
        timeStrNew = formattingService.to24h(
          tPart ||
            prevStartStr.split("T")[1]?.slice(0, TIME_FORMAT_LENGTH) ||
            "00:00"
        );
      } else {
        timeStrNew = formattingService.to24h(
          (change as unknown as { time?: string }).time ||
            prevStartStr.split("T")[1]?.slice(0, TIME_FORMAT_LENGTH) ||
            "00:00"
        );
        dateStrNew = ((change as unknown as { date?: string }).date ||
          prevDate) as string;
      }

      const normalizedSlotTime = formattingService.normalizeToSlotBase(
        dateStrNew ?? "",
        timeStrNew ?? ""
      );
      const previousSlotTime = formattingService.normalizeToSlotBase(
        prevDate ?? "",
        prevTimeRaw ?? ""
      );
      const typeParsed = formattingService.parseType(
        change.type ?? original.extendedProps?.type,
        isLocalized
      );
      const typeValue = (() => {
        const maybeNumber = Number(typeParsed);
        if (Number.isFinite(maybeNumber)) {
          return maybeNumber;
        }
        const fallback = Number(original.extendedProps?.type);
        return Number.isFinite(fallback) ? fallback : 0;
      })();
      const hasPhoneChange = Object.hasOwn(change, "phone");
      const phoneRaw = hasPhoneChange
        ? String((change as unknown as { phone?: string }).phone ?? "")
        : "";
      const normalizedPhone = hasPhoneChange
        ? normalizePhoneForStorage(phoneRaw)
        : "";
      const waIdNew =
        hasPhoneChange && normalizedPhone ? normalizedPhone : waId;
      const titleNew = String(
        change.name ||
          original.title ||
          original.extendedProps?.customerName ||
          waId
      );
      const hasNameChange = Object.hasOwn(change, "name");
      const customerNameNew = (() => {
        if (hasNameChange) {
          return titleNew;
        }
        const existingName = original.extendedProps?.customerName;
        if (typeof existingName === "string" && existingName.length > 0) {
          return existingName;
        }
        return titleNew;
      })();
      const reservationId =
        typeof original.extendedProps?.reservationId === "number"
          ? original.extendedProps?.reservationId
          : undefined;
      const prevDurationMinutes = (() => {
        try {
          const MS_PER_MINUTE = 60_000;
          const FALLBACK_DURATION_MINUTES = 15;
          const startMs = new Date(original.start).getTime();
          const endMs = new Date(original.end ?? original.start).getTime();
          const diff = Math.max(0, endMs - startMs);
          const minutes = Math.round(diff / MS_PER_MINUTE);
          return Number.isFinite(minutes) && minutes > 0
            ? minutes
            : FALLBACK_DURATION_MINUTES;
        } catch {
          const FALLBACK_DURATION_MINUTES = 15;
          return FALLBACK_DURATION_MINUTES;
        }
      })();
      const newStartIso = `${dateStrNew}T${timeStrNew}:00`;
      const newEndIso = (() => {
        try {
          const MS_PER_MINUTE = 60_000;
          const [h, m] = (timeStrNew || "00:00").split(":");
          const base = new Date(
            `${dateStrNew}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`
          );
          const out = new Date(
            base.getTime() + prevDurationMinutes * MS_PER_MINUTE
          );
          return `${dateStrNew}T${String(out.getHours()).padStart(2, "0")}:${String(out.getMinutes()).padStart(2, "0")}:00`;
        } catch {
          return newStartIso;
        }
      })();
      const waIdChanged =
        hasPhoneChange && waIdNew.length > 0 && waIdNew !== waId;
      const extendedProps = {
        ...(original.extendedProps || {}),
        waId: waIdNew,
        wa_id: waIdNew,
        phone: waIdNew,
        slotDate: dateStrNew,
        slotTime: normalizedSlotTime,
        type: typeValue,
        cancelled: false,
        customerName: customerNameNew,
        ...(reservationId !== undefined ? { reservationId } : {}),
      };
      const calendarEvent: CalendarEvent = {
        id: evId,
        title: titleNew,
        start: newStartIso,
        end: newEndIso,
        type: "reservation",
        extendedProps,
      };
      const mutation: MutateReservationParams & {
        previousDate?: string;
        previousTimeSlot?: string;
      } = {
        waId: waIdNew,
        date: dateStrNew ?? "",
        time: normalizedSlotTime,
        title: titleNew,
        type: typeValue,
        approximate: true,
        isLocalized,
        ...(prevDate !== undefined ? { previousDate: prevDate } : {}),
        previousTimeSlot: previousSlotTime,
      };
      if (reservationId !== undefined) {
        mutation.reservationId = reservationId;
      }

      return {
        mutation,
        event: calendarEvent,
        waIdChange: waIdChanged ? { oldWaId: waId, newWaId: waIdNew } : null,
      };
    },
    [formattingService, isLocalized]
  );

  // Helper to extract creation data from RowChange
  const extractCreationData = useCallback(
    (row: RowChange): CreateReservationParams | null => {
      let dStr = "";
      let tStr = "";
      const st = row.scheduled_time as unknown;

      if (st instanceof Date) {
        dStr = formattingService.formatDateOnly(st) || "";
        tStr =
          formattingService.formatHHmmInZone(st, "Asia/Riyadh") ||
          formattingService.formatHHmm(st) ||
          "";
      } else if (typeof st === "string" && st.includes("T")) {
        const dateObj = new Date(st);
        dStr =
          formattingService.formatDateOnly(dateObj) || st.split("T")[0] || "";
        tStr =
          formattingService.formatHHmmInZone(dateObj, "Asia/Riyadh") ||
          formattingService.formatHHmm(dateObj) ||
          "";
      } else {
        dStr =
          formattingService.formatDateOnly(
            (row as unknown as { date?: string }).date
          ) || "";
        tStr =
          formattingService.formatHHmmInZone(
            (row as unknown as { time?: string }).time,
            "Asia/Riyadh"
          ) ||
          formattingService.formatHHmm(
            (row as unknown as { time?: string }).time
          ) ||
          formattingService.to24h(
            String((row as unknown as { time?: string }).time || "")
          ) ||
          "";
      }

      const waId = normalizePhoneForStorage((row.phone || "").toString());
      const MIN_PHONE_LENGTH = 7;
      if (!waId || waId.length < MIN_PHONE_LENGTH) {
        return null;
      }

      const slotTime = formattingService.normalizeToSlotBase(dStr, tStr);
      const type = formattingService.parseType(row.type, isLocalized);
      const name = (row.name || "").toString();

      return {
        waId,
        date: dStr,
        time: slotTime,
        title: name || waId,
        type,
        isLocalized,
      };
    },
    [formattingService, isLocalized]
  );

  // Helper to extract cancellation data from CalendarEvent (using shared utility)
  const extractCancellationDataForGrid = useCallback(
    (original: CalendarEvent): CancelReservationParams | null =>
      extractCancellationData(original, isLocalized, freeRoam),
    [isLocalized, freeRoam]
  );

  const handleSaveChanges = useCallback(async () => {
    if (!dataProviderRef.current) {
      toastService.error(
        i18n.getMessage("system_error_try_later", isLocalized),
        undefined,
        TOAST_ERROR_DURATION_MS
      );
      return;
    }

    if (isSaving) {
      return;
    }

    const validation = validateAllCells();
    if (!validation.isValid) {
      const errorMessages = validation.errors
        .map(
          (err) =>
            `${isLocalized ? "الصف" : "Row"} ${err.row + 1}: ${err.message}`
        )
        .join("\n");

      toastService.error(
        i18n.getMessage("validation_errors_title", isLocalized),
        errorMessages,
        TOAST_VALIDATION_DURATION_MS
      );

      return;
    }

    setIsSaving(true);

    try {
      const providerEditingState = dataProviderRef.current.getEditingState();
      // Build BaseColumnProps from provider's column definitions so toJson can map values correctly
      const provider = dataProviderRef.current;
      const defs: IColumnDefinition[] =
        (
          provider as unknown as {
            dataSource?: { getColumnDefinitions?: () => IColumnDefinition[] };
          }
        ).dataSource?.getColumnDefinitions?.() ?? [];
      const baseColumns: BaseColumnProps[] = defs.map(
        (def: IColumnDefinition, index: number): BaseColumnProps => ({
          id: def?.id ?? def?.name ?? `col_${index}`,
          name: def?.name ?? def?.id ?? `col_${index}`,
          title: def?.title ?? def?.name ?? def?.id ?? `Column ${index}`,
          width: def?.width ?? GRID_DEFAULT_COLUMN_WIDTH,
          isEditable: def?.isEditable !== false,
          isHidden: false,
          isPinned: def?.isPinned === true,
          isRequired: def?.isRequired === true,
          isIndex: false,
          indexNumber: index,
          contentAlignment: "left",
          defaultValue: def?.defaultValue,
          columnTypeOptions: {},
        })
      );
      const changesJson = providerEditingState.toJson(baseColumns);
      const changes: EditingChanges = JSON.parse(changesJson);

      let hasErrors = false;
      const gridRowToEventMap =
        gridRowToEventMapRef.current ?? new Map<number, CalendarEvent>();

      // Process cancellations first
      if (changes.deleted_rows && changes.deleted_rows.length > 0) {
        for (const rowIdx of changes.deleted_rows) {
          const original = gridRowToEventMap.get(rowIdx);
          if (!original) {
            continue;
          }

          const cancelParams = extractCancellationDataForGrid(original);
          if (!cancelParams) {
            hasErrors = true;
            continue;
          }

          try {
            await cancelMutation.mutateAsync(cancelParams);
            // NOTE: Don't call onEventCancelled - mutation cache updates are enough
          } catch {
            hasErrors = true;
          }
        }
      }

      // Process modifications (filter out rows being deleted)
      if (changes.edited_rows && Object.keys(changes.edited_rows).length > 0) {
        const deletedSet = new Set<number>(changes.deleted_rows || []);
        const filteredEditedEntries = Object.entries(
          changes.edited_rows
        ).filter(([rowIdxStr]) => !deletedSet.has(Number(rowIdxStr)));

        type ModificationBatch = {
          mutation: MutateReservationParams & {
            previousDate?: string;
            previousTimeSlot?: string;
          };
          event: CalendarEvent;
          waIdChange?: { oldWaId: string; newWaId: string } | null;
        };

        type ModificationBatchMutation = ModificationBatch["mutation"];
        const modificationMap = new Map<string, ModificationBatch>();

        for (const [rowIdxStr, change] of filteredEditedEntries) {
          const rowIdx = Number(rowIdxStr);
          const original = gridRowToEventMap.get(rowIdx);
          if (!original) {
            continue;
          }

          const payload = extractModificationData(change, original);
          if (!payload) {
            hasErrors = true;
            continue;
          }

          const mutation = payload.mutation;
          const key =
            String(payload.event.id || "") ||
            String(
              mutation.reservationId ??
                `${mutation.waId}-${mutation.date}-${mutation.time}`
            );

          const existing = modificationMap.get(key);
          if (existing) {
            const existingMutation =
              existing.mutation as ModificationBatchMutation;
            const mutationAsExtended = mutation as ModificationBatchMutation;
            const mergedPreviousDate =
              existingMutation.previousDate ?? mutationAsExtended.previousDate;
            const mergedPreviousTimeSlot =
              existingMutation.previousTimeSlot ??
              mutationAsExtended.previousTimeSlot;

            const mergedMutation: ModificationBatchMutation = {
              ...mutation,
              ...(mergedPreviousDate
                ? { previousDate: mergedPreviousDate }
                : {}),
              ...(mergedPreviousTimeSlot
                ? { previousTimeSlot: mergedPreviousTimeSlot }
                : {}),
            };

            const mergedEvent: CalendarEvent = {
              ...existing.event,
              ...payload.event,
              extendedProps: {
                ...(existing.event.extendedProps || {}),
                ...(payload.event.extendedProps || {}),
              },
            };
            const mergedWaIdChange =
              payload.waIdChange ?? existing.waIdChange ?? null;

            modificationMap.set(key, {
              mutation: mergedMutation,
              event: mergedEvent,
              waIdChange: mergedWaIdChange,
            });
          } else {
            modificationMap.set(key, {
              mutation,
              event: payload.event,
              waIdChange: payload.waIdChange ?? null,
            });
          }
        }

        const waIdChanges = new Map<
          string,
          { newWaId: string; context: ModificationBatch }
        >();
        for (const batch of modificationMap.values()) {
          const change = batch.waIdChange;
          if (change?.newWaId && change.newWaId !== change.oldWaId) {
            waIdChanges.set(change.oldWaId, {
              newWaId: change.newWaId,
              context: batch,
            });
          }
        }

        if (waIdChanges.size > 0) {
          for (const [oldWaId, info] of waIdChanges.entries()) {
            try {
              const contextEvent = info.context.event;
              const contextReservationId = (() => {
                const extendedProps = contextEvent.extendedProps || {};
                const rawId =
                  extendedProps.reservationId ??
                  (extendedProps as Record<string, unknown>).reservation_id;
                if (typeof rawId === "number") {
                  return rawId;
                }
                const parsed = Number(rawId);
                return Number.isFinite(parsed) ? parsed : null;
              })();
              await modifyCustomerWaId(
                oldWaId,
                info.newWaId,
                contextEvent.extendedProps?.customerName ??
                  contextEvent.title ??
                  null,
                contextReservationId
              );
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              toastService.error(
                i18n.getMessage("save_error", isLocalized),
                message
              );
              hasErrors = true;
              return false;
            }
          }
        }

        // Apply changes to calendar API - eventChange callback will trigger mutations
        const calendarApi = calendarRef?.current?.getApi?.();
        if (calendarApi) {
          for (const { event } of modificationMap.values()) {
            try {
              const eventApi = calendarApi.getEventById?.(event.id);
              if (!eventApi) {
                continue;
              }

              // Update title
              eventApi.setProp?.("title", event.title);

              // Update extended properties
              const extendedProps = event.extendedProps || {};
              for (const [key, value] of Object.entries(extendedProps)) {
                if (value !== undefined) {
                  eventApi.setExtendedProp?.(key, value);
                }
              }

              // Update dates last (triggers eventChange)
              if (event.start) {
                const startDate =
                  typeof event.start === "string"
                    ? new Date(event.start)
                    : event.start;
                let endDate: Date;
                if (event.end) {
                  endDate =
                    typeof event.end === "string"
                      ? new Date(event.end)
                      : event.end;
                } else {
                  endDate = startDate;
                }
                eventApi.setDates?.(startDate, endDate);
              }
            } catch (_err) {
              hasErrors = true;
            }
          }
          await new Promise((resolve) =>
            setTimeout(resolve, CALENDAR_UPDATE_DELAY_MS)
          );
        } else {
          for (const { mutation } of modificationMap.values()) {
            try {
              await modifyMutation.mutateAsync(mutation);
            } catch {
              hasErrors = true;
            }
          }
        }
      }

      // Process additions
      if (changes.added_rows && changes.added_rows.length > 0) {
        for (const addedRow of changes.added_rows) {
          const createParams = extractCreationData(addedRow);
          if (!createParams) {
            hasErrors = true;
            continue;
          }

          try {
            await createMutation.mutateAsync(createParams);
            // Note: onEventAdded callback is not needed since TanStack Query handles cache updates
            // The calendar will automatically re-render from the updated cache
          } catch {
            hasErrors = true;
          }
        }
      }

      // Refresh customer data if callback provided
      if (!hasErrors && refreshCustomerData) {
        try {
          await refreshCustomerData();
        } catch {
          // Silently ignore refresh errors (non-critical)
        }
      }

      // Clear editing state if no errors
      if (!hasErrors && dataProviderRef.current) {
        const editingState = dataProviderRef.current.getEditingState();
        editingState.clearMemory();
        dataProviderRef.current.refresh();
      }

      return !hasErrors;
    } catch (_error) {
      toastService.error(
        i18n.getMessage("save_error", isLocalized),
        i18n.getMessage("system_error_try_later", isLocalized),
        TOAST_ERROR_DURATION_MS
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    dataProviderRef,
    isLocalized,
    isSaving,
    validateAllCells,
    gridRowToEventMapRef,
    modifyMutation,
    createMutation,
    cancelMutation,
    extractModificationData,
    extractCreationData,
    modifyCustomerWaId,
    refreshCustomerData,
    extractCancellationDataForGrid,
    calendarRef?.current?.getApi,
  ]);

  return {
    isSaving,
    handleSaveChanges,
  };
}
