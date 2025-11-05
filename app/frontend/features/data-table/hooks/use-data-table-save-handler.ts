import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import type React from "react";
import { useCallback, useState } from "react";
import type { RowChange } from "@/entities/event";
import type { CalendarCoreRef } from "@/features/calendar";
import {
  type CancelReservationParams,
  type CreateReservationParams,
  type MutateReservationParams,
  useCancelReservation,
  useCreateReservation,
  useMutateReservation,
} from "@/features/reservations/hooks";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import type { BaseColumnProps } from "@/shared/libs/data-grid/components/core/types";
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

type ModificationPayload = {
  mutation: MutateReservationParams;
  event: CalendarEvent;
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
  isLocalized,
  slotDurationHours: _slotDurationHours,
  freeRoam,
  gridRowToEventMapRef,
  dataProviderRef,
  validateAllCells,
  onEventModified,
  onEventCancelled,
  refreshCustomerData,
}: UseDataTableSaveHandlerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const formattingService = new FormattingService();

  // Use TanStack Query mutations
  const modifyMutation = useMutateReservation();
  const createMutation = useCreateReservation();
  const cancelMutation = useCancelReservation();

  // Helper to extract modification data from RowChange and CalendarEvent
  const extractModificationData = useCallback(
    (
      change: RowChange,
      original: CalendarEvent
    ): ModificationPayload | null => {
      const TIME_FORMAT_LENGTH = 5;
      const evId = String(original.id);
      const waId = (
        original.extendedProps?.waId ||
        original.id ||
        ""
      ).toString();
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
      const titleNew =
        change.name ||
        original.title ||
        original.extendedProps?.customerName ||
        waId;
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
      const extendedProps = {
        ...(original.extendedProps || {}),
        waId,
        slotDate: dateStrNew,
        slotTime: normalizedSlotTime,
        type: typeValue,
        cancelled: false,
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
        waId,
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

      return { mutation, event: calendarEvent };
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

  // Helper to extract cancellation data from CalendarEvent
  const extractCancellationData = useCallback(
    (original: CalendarEvent): CancelReservationParams | null => {
      const waId = (
        original.extendedProps?.waId ||
        original.id ||
        ""
      ).toString();
      const date = original.start?.split("T")[0] || "";
      const TIME_FORMAT_LENGTH = 5;
      const slotTime = (
        original.extendedProps as { slotTime?: string } | undefined
      )?.slotTime;
      const startTimePart = original.start?.split("T")[1];
      const startTime = startTimePart
        ? startTimePart.slice(0, TIME_FORMAT_LENGTH)
        : undefined;
      const time = slotTime || startTime || undefined;

      if (!date) {
        return null;
      }
      if (!waId) {
        return null;
      }

      const reservationId = original.extendedProps?.reservationId;
      return {
        waId,
        date,
        ...(time !== undefined ? { time } : {}),
        ...(reservationId !== undefined ? { reservationId } : {}),
        isLocalized,
        freeRoam,
      };
    },
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

          const cancelParams = extractCancellationData(original);
          if (!cancelParams) {
            hasErrors = true;
            continue;
          }

          try {
            await cancelMutation.mutateAsync(cancelParams);
            if (onEventCancelled) {
              onEventCancelled(String(original.id));
            }
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

          try {
            await modifyMutation.mutateAsync(payload.mutation);
            if (onEventModified) {
              onEventModified(payload.event.id, payload.event);
            }
          } catch {
            hasErrors = true;
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
    extractCancellationData,
    onEventCancelled,
    onEventModified,
    refreshCustomerData,
  ]);

  return {
    isSaving,
    handleSaveChanges,
  };
}
