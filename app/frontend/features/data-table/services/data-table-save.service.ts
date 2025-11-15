import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import type { MutateReservationParams } from "@/features/reservations/hooks";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import type { BaseColumnProps } from "@/shared/libs/data-grid/components/core/types";
import { FormattingService } from "@/shared/libs/utils/formatting.service";
import type { CalendarEvent } from "@/widgets/data-table-editor/types";
import {
  type CustomerWaIdModifierDependencies,
  createCustomerWaIdModifier,
} from "./customer-waid-modifier.service";
import {
  extractCancellationDataForGrid,
  extractCreationData,
  extractModificationData,
} from "./data-table-change.extractors";
import type {
  DataTableSaveDependencies,
  DataTableSaveMutations,
  EditingChangesPayload,
} from "./data-table-save.types";

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

type ModificationBatch = {
  mutation: MutateReservationParams & {
    previousDate?: string;
    previousTimeSlot?: string;
  };
  event: CalendarEvent;
  waIdChange?: { oldWaId: string; newWaId: string } | null;
};

type ModificationBatchMutation = ModificationBatch["mutation"];

/**
 * Creates the data table save service that orchestrates the entire save flow.
 * This service handles:
 * - Validation
 * - Editing state serialization
 * - Cancellations
 * - Modifications (with WA ID chaining)
 * - Additions
 * - Customer data refresh
 * - Editing state cleanup
 *
 * All behavior is preserved exactly as in the original hook implementation.
 */
export function createDataTableSaveService(
  deps: DataTableSaveDependencies,
  mutations: DataTableSaveMutations
) {
  const {
    queryClient,
    calendarRef,
    dataProviderRef,
    gridRowToEventMapRef,
    isLocalized,
    freeRoam,
    validateAllCells,
    onEventModified,
    refreshCustomerData,
    selectedConversationId,
    setSelectedConversation,
  } = deps;

  const { modifyMutation, createMutation, cancelMutation } = mutations;

  const formattingService = new FormattingService();

  // Create WA ID modifier service
  const waIdModifierDeps: CustomerWaIdModifierDependencies = {
    queryClient,
    selectedConversationId,
    setSelectedConversation,
  };
  if (calendarRef !== undefined && calendarRef !== null) {
    waIdModifierDeps.calendarRef = calendarRef;
  }
  if (onEventModified !== undefined) {
    waIdModifierDeps.onEventModified = onEventModified;
  }
  const modifyCustomerWaId = createCustomerWaIdModifier(waIdModifierDeps);

  return async (): Promise<boolean> => {
    if (!dataProviderRef.current) {
      toastService.error(
        i18n.getMessage("system_error_try_later", isLocalized),
        undefined,
        TOAST_ERROR_DURATION_MS
      );
      return false;
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

      return false;
    }

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
      const changes: EditingChangesPayload = JSON.parse(changesJson);

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

          const cancelParams = extractCancellationDataForGrid(
            original,
            isLocalized,
            freeRoam
          );
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

        const modificationMap = new Map<string, ModificationBatch>();

        for (const [rowIdxStr, change] of filteredEditedEntries) {
          const rowIdx = Number(rowIdxStr);
          const original = gridRowToEventMap.get(rowIdx);
          if (!original) {
            continue;
          }

          const payload = extractModificationData(
            change,
            original,
            formattingService,
            isLocalized
          );
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

            // Chain phone number changes: if we have A→B and then B→C, result should be A→C
            const mergedWaIdChange = (() => {
              const existingChange = existing.waIdChange;
              const newChange = payload.waIdChange;

              if (!newChange) {
                return existingChange ?? null;
              }
              if (!existingChange) {
                return newChange;
              }

              // Chain the changes: use the original oldWaId and the latest newWaId
              return {
                oldWaId: existingChange.oldWaId,
                newWaId: newChange.newWaId,
              };
            })();

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

              // Update gridRowToEventMap with new phone number so subsequent edits use correct waId
              for (const [rowIdx, event] of gridRowToEventMap.entries()) {
                const eventWaId =
                  event.extendedProps?.waId || event.extendedProps?.phone;
                if (eventWaId === oldWaId) {
                  const updatedEvent = {
                    ...event,
                    extendedProps: {
                      ...(event.extendedProps || {}),
                      waId: info.newWaId,
                      wa_id: info.newWaId,
                      phone: info.newWaId,
                    },
                  };
                  gridRowToEventMap.set(rowIdx, updatedEvent);
                  reservationDebugLog("updateGridRowEventMap", {
                    rowIdx,
                    oldWaId,
                    newWaId: info.newWaId,
                    eventId: event.id,
                  });
                }
              }
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
          const createParams = extractCreationData(
            addedRow,
            formattingService,
            isLocalized
          );
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
    }
  };
}
