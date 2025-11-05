"use client";

import type { DataEditorRef } from "@glideapps/glide-data-grid";
import { useSettings } from "@shared/libs/state/settings-context";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useDataTableDataSource,
  useDataTableSaveHandler,
  useDataTableValidation,
} from "@/features/data-table";
import { useDebouncedValidation } from "@/features/data-table/hooks/useDebouncedValidation";
import { useEditingStateCanSave } from "@/features/data-table/hooks/useEditingStateCanSave";
import { mergeEventsWithLocalEdits } from "@/features/data-table/hooks/useMergeEventsWithLocalEdits";
import { createPhoneEditInterceptor } from "@/features/documents/grid/phoneEditInterceptor";
import { useCustomerData } from "@/shared/libs/data/customer-data-context";
import { FullscreenProvider } from "@/shared/libs/data-grid/components/contexts/FullscreenContext";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import { formatDateRange } from "@/shared/libs/date/formatDateRange";
import { i18n } from "@/shared/libs/i18n";
import { useDialogBackdrop } from "@/shared/ui/dialog/useDialogBackdrop";
// formatDateTimeOptions removed - using inline options instead
import type {
  CalendarEvent as DataTableCalendarEvent,
  DataTableEditorProps,
} from "@/widgets/data-table-editor/types";
import { Backdrop } from "@/widgets/data-table-editor/ui/Backdrop";
import { Footer as EditorFooter } from "@/widgets/data-table-editor/ui/Footer";
import { Header as EditorHeader } from "@/widgets/data-table-editor/ui/Header";
import { UnsavedChangesDialog } from "./data-table-editor/data-table-editor/UnsavedChangesDialog";
import { getReservationKey as _getReservationKey } from "./lib/reservation-utils";
import { useGridTheme } from "./lib/useGridTheme";
import { areValidationErrorsEqual } from "./lib/validation-utils";

const Grid = dynamic(() => import("./grids/CalendarEditorGrid"), {
  ssr: false,
});

// Deep comparison for validation errors to prevent unnecessary state updates
// moved areValidationErrorsEqual to ./lib/validation-utils

export function DataTableEditor(props: DataTableEditorProps) {
  const {
    open,
    onOpenChange,
    events,
    selectedDateRange,
    isLocalized,
    slotDurationHours,
    onSave: _onSave,
    onEventClick: _onEventClick,
    freeRoam = false,
    data: _data = [],
    onDataChange: _onDataChange,
    language: _language = "en",
    calendarRef,
    onEventAdded,
    onEventModified,
    onEventCancelled,
  } = props;

  const [isGridReady, setIsGridReady] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<
    (() => void) | null
  >(null);
  const [isExiting, setIsExiting] = useState(false);
  const { theme: appTheme } = useTheme();
  const { theme: _styleTheme } = useSettings();
  const isDarkMode = appTheme === "dark";
  const { onExitComplete: onBackdropExitComplete } = useDialogBackdrop(
    open,
    isExiting
  );

  const _isLocalized = isLocalized ?? false;
  const { customers } = useCustomerData();

  const findCustomerByPhone = useCallback(
    (phone: string) => {
      if (!phone) {
        return;
      }
      const normalizedInput = phone.replace(/\D/g, "");
      if (!normalizedInput) {
        return;
      }
      return customers.find((customer) => {
        const candidates = [customer.phone, customer.id];
        return candidates.some((candidate) => {
          if (typeof candidate !== "string") {
            return false;
          }
          return candidate.replace(/\D/g, "") === normalizedInput;
        });
      });
    },
    [customers]
  );

  const dataProviderRef = useRef<DataProvider | null>(null);
  const dataEditorRef = useRef<DataEditorRef | null>(null);
  // Removed themeKey to prevent forced Grid remounts that cause flicker

  // Maintain a local, merge-friendly events source while editing to avoid losing draft rows/cells
  const [sourceEvents, setSourceEvents] =
    useState<DataTableCalendarEvent[]>(events);
  const previousEventsRef = useRef<DataTableCalendarEvent[]>(events);

  // Stable reservation identity used for locking and dedupe
  const getReservationKey = useCallback(
    (ev: DataTableCalendarEvent) => _getReservationKey(ev),
    []
  );

  useEffect(() => {
    previousEventsRef.current = sourceEvents;
  }, [sourceEvents]);

  // Theme: encapsulated in lib hook
  const { gridTheme } = useGridTheme();

  const phoneEditInterceptor = useMemo(
    () =>
      createPhoneEditInterceptor({
        findCustomerByPhone,
      }),
    [findCustomerByPhone]
  );

  const editInterceptors = useMemo(
    () => [phoneEditInterceptor],
    [phoneEditInterceptor]
  );

  const { dataSource, gridRowToEventMapRef } = useDataTableDataSource({
    events: sourceEvents,
    selectedDateRange,
    slotDurationHours,
    freeRoam,
    open,
    isLocalized: isLocalized ?? false,
  });

  const { validateAllCells, checkEditingState, hasUnsavedChanges } =
    useDataTableValidation(dataProviderRef);

  const { computeCanSave } = useEditingStateCanSave();

  const [validationErrors, setValidationErrors] = useState<
    Array<{ row: number; col: number; message: string; fieldName?: string }>
  >([]);

  // Ref to track previous validation errors for comparison
  const previousValidationErrors = useRef<
    Array<{ row: number; col: number; message: string; fieldName?: string }>
  >([]);

  // Stable validation error setter that only updates if errors actually changed
  const setValidationErrorsIfChanged = useCallback(
    (
      newErrors: Array<{
        row: number;
        col: number;
        message: string;
        fieldName?: string;
      }>
    ) => {
      if (
        !areValidationErrorsEqual(previousValidationErrors.current, newErrors)
      ) {
        previousValidationErrors.current = newErrors;
        setValidationErrors(newErrors);
      }
    },
    []
  );

  const { isSaving, handleSaveChanges: performSave } = useDataTableSaveHandler({
    ...(calendarRef ? { calendarRef } : {}),
    isLocalized: _isLocalized,
    slotDurationHours: slotDurationHours || 1,
    freeRoam,
    gridRowToEventMapRef,
    dataProviderRef,
    validateAllCells,
    ...(onEventAdded ? { onEventAdded } : {}),
    ...(onEventModified ? { onEventModified } : {}),
    ...(onEventCancelled ? { onEventCancelled } : {}),
  });

  // Stabilize function references used inside effects to keep dependency arrays constant
  const getReservationKeyRef = useRef(getReservationKey);
  useEffect(() => {
    getReservationKeyRef.current = getReservationKey;
  }, [getReservationKey]);

  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Memoize the formatted date range to prevent flickering during dialog animation
  const formattedDateRange = useMemo(
    () =>
      formatDateRange(
        selectedDateRange
          ? {
              start: selectedDateRange.start,
              end: selectedDateRange.end || null,
            }
          : null,
        _isLocalized,
        slotDurationHours || 1
      ),
    [selectedDateRange, _isLocalized, slotDurationHours]
  );

  const handleCheckEditingState = useCallback(() => {
    const state = checkEditingState();

    let canEnable = state.hasChanges && state.isValid;

    // Additional guard: offload to feature hook
    try {
      if (dataProviderRef.current) {
        canEnable = computeCanSave(
          dataProviderRef.current as unknown as DataProvider,
          gridRowToEventMapRef,
          state
        );
      }
    } catch (_err) {
      /* ignore additional validation check failure */
    }

    setCanSave(canEnable);

    // Also refresh validation errors immediately so UI updates as rules are fixed/violated
    try {
      const result = validateAllCells();
      setValidationErrorsIfChanged(result.errors || []);
    } catch (_err) {
      /* ignore validation refresh errors */
    }
  }, [
    checkEditingState,
    gridRowToEventMapRef,
    setValidationErrorsIfChanged,
    validateAllCells,
    computeCanSave,
  ]);

  // Stable debounced validation check function
  const createDebouncedValidationCheck = useDebouncedValidation({
    handleCheckEditingState,
    validateAllCells,
    dataProviderRef,
    setValidationErrors: setValidationErrorsIfChanged,
  });

  useEffect(() => {
    if (open) {
      setCanSave(false);
      if (dataProviderRef.current) {
        try {
          dataProviderRef.current.refresh?.();
        } catch (_err) {
          /* ignore provider refresh errors */
        }
      }
    }
    setCanSave(false);
    // Clear validation errors when dialog transitions to closed to prevent stale state
    if (!open) {
      setValidationErrors([]);
      previousValidationErrors.current = [];
    }
  }, [open]);

  // When open toggles to false, mark as exiting so class stays until exit completes
  useEffect(() => {
    if (!open) {
      setIsExiting(true);
    }
  }, [open]);

  useEffect(
    () => () => {
      const provider = dataProviderRef.current as
        | (DataProvider & { unsubscribe?: () => void })
        | null;
      if (provider?.unsubscribe) {
        provider.unsubscribe();
      }
    },
    []
  );

  // Merge incoming websocket-driven events with local editing state so edited rows don't disappear
  // Use layout effect to avoid a visible frame where rows flicker before merge applies
  React.useLayoutEffect(() => {
    try {
      if (!open) {
        setSourceEvents(events);
        return;
      }
      const provider = dataProviderRef.current as DataProvider | null;
      const merged = mergeEventsWithLocalEdits({
        incomingEvents: (events || []) as unknown as Record<string, unknown>[],
        previousEvents: (previousEventsRef.current || []) as unknown as Record<
          string,
          unknown
        >[],
        provider: provider as unknown as DataProvider,
        gridRowToEventMapRef,
        getReservationKey: getReservationKeyRef.current as unknown as (
          ev: Record<string, unknown>
        ) => string,
        hasUnsavedChanges: hasUnsavedChangesRef.current(),
      }) as unknown as DataTableCalendarEvent[];
      setSourceEvents(merged);
    } catch {
      setSourceEvents(events);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, open, gridRowToEventMapRef]);

  const handleSaveChanges = useCallback(async () => {
    // Check validation
    validateAllCells();

    const success = await performSave();

    if (success) {
      setCanSave(false);
    }
  }, [performSave, validateAllCells]);

  const handleCloseAttempt = useCallback(
    (closeAction: () => void) => {
      if (hasUnsavedChanges()) {
        setPendingCloseAction(() => closeAction);
        setShowUnsavedChangesDialog(true);
      } else {
        closeAction();
      }
    },
    [hasUnsavedChanges]
  );

  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    if (pendingCloseAction) {
      pendingCloseAction();
      setPendingCloseAction(null);
    }
  }, [pendingCloseAction]);

  const handleSaveAndClose = useCallback(async () => {
    setShowUnsavedChangesDialog(false);
    await handleSaveChanges();
    if (pendingCloseAction) {
      pendingCloseAction();
      setPendingCloseAction(null);
    }
  }, [pendingCloseAction, handleSaveChanges]);

  return (
    <>
      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          setIsExiting(false);
          onBackdropExitComplete();
        }}
      >
        {open && (
          <>
            <Backdrop
              backdropClassName="dialog-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm"
              backdropKey="dt-backdrop"
              onRequestClose={() =>
                handleCloseAttempt(() => onOpenChange(false))
              }
              zIndex={Z_INDEX.DIALOG_BACKDROP}
            />

            <motion.dialog
              animate={{ opacity: 1, scale: 1, y: "-50%" }}
              aria-describedby="data-editor-description"
              className="dialog-content fixed top-[50%] left-[50%] flex h-auto max-h-[95vh] w-full max-w-6xl flex-col gap-0 overflow-visible border bg-background p-0 shadow-lg sm:rounded-lg"
              exit={{ opacity: 0, scale: 0.98, y: "calc(-50% - 8px)" }}
              initial={{ opacity: 0, scale: 0.98, y: "calc(-50% + 8px)" }}
              key={`dt-dialog-${selectedDateRange?.start || "none"}`}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  const fullscreenPortal = document.getElementById(
                    "grid-fullscreen-portal"
                  );
                  if (fullscreenPortal) {
                    e.preventDefault();
                    return;
                  }
                  handleCloseAttempt(() => onOpenChange(false));
                }
              }}
              open
              style={{
                zIndex: Z_INDEX.DIALOG_CONTENT,
                animation: "none",
                x: "-50%",
              }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <EditorHeader
                onClose={() => handleCloseAttempt(() => onOpenChange(false))}
                subTitle={formattedDateRange}
                title={i18n.getMessage("data_editor_title", _isLocalized)}
              />

              <div className="min-h-0 w-full flex-1 overflow-visible">
                <div className="relative h-full w-full overflow-visible">
                  {!isGridReady && (
                    <div className="absolute inset-0 z-10 bg-background/0" />
                  )}
                  <div>
                    <FullscreenProvider>
                      {Grid && (
                        <Grid
                          dataEditorRef={
                            dataEditorRef as React.RefObject<DataEditorRef>
                          }
                          dataSource={dataSource}
                          editInterceptors={editInterceptors}
                          fullWidth={true}
                          isDarkMode={isDarkMode}
                          loading={!isGridReady}
                          onDataProviderReady={(provider: unknown) => {
                            const dataProvider = provider as DataProvider;
                            dataProviderRef.current = dataProvider;

                            const editingState = dataProvider.getEditingState();

                            // Use the stable debounced validation check function
                            const debouncedCheck =
                              createDebouncedValidationCheck();

                            const unsubscribe =
                              editingState.onChange(debouncedCheck);

                            // Live validation updates whenever a cell value is loaded/changed
                            try {
                              dataProvider.setOnCellDataLoaded?.(
                                (_c: number, _r: number) => {
                                  try {
                                    const v = validateAllCells();
                                    setValidationErrorsIfChanged(
                                      v.errors || []
                                    );
                                  } catch (_err) {
                                    /* ignore validation update errors */
                                  }
                                }
                              );
                            } catch (_err) {
                              /* ignore setOnCellDataLoaded binding errors */
                            }

                            (
                              dataProviderRef.current as DataProvider & {
                                unsubscribe?: () => void;
                              }
                            ).unsubscribe = unsubscribe;

                            handleCheckEditingState();
                          }}
                          onReady={() => setIsGridReady(true)}
                          showThemeToggle={false}
                          theme={gridTheme}
                          validationErrors={validationErrors}
                        />
                      )}
                    </FullscreenProvider>
                  </div>
                </div>
              </div>

              <EditorFooter
                canSave={canSave}
                isSaving={isSaving}
                onSave={handleSaveChanges}
                saveLabel={i18n.getMessage("save_changes", _isLocalized)}
                savingLabel={i18n.getMessage("saving", _isLocalized)}
                validationErrors={validationErrors}
              />
            </motion.dialog>
          </>
        )}
      </AnimatePresence>

      <UnsavedChangesDialog
        canSave={canSave}
        isLocalized={_isLocalized}
        isSaving={isSaving}
        onDiscard={handleDiscardChanges}
        onOpenChange={setShowUnsavedChangesDialog}
        onSaveAndClose={handleSaveAndClose}
        open={showUnsavedChangesDialog}
      />
    </>
  );
}
