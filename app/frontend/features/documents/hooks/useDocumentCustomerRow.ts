"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppConfigQuery } from "@/features/app-config";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import { InMemoryDataSource } from "@/shared/libs/data-grid/components/core/data-sources/InMemoryDataSource";
import type {
  IColumnDefinition,
  IDataSource,
} from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import { ColumnDataType } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import { configColumnsToIColumnDefinitions } from "@/shared/libs/data-grid/utils/config-columns";
import { i18n } from "@/shared/libs/i18n";
import { logger } from "@/shared/libs/logger";
import { createDocumentsService } from "../services/documents.service.factory";

const FETCH_IN_FLIGHT_RESET_DELAY_MS = 100;

const logDocumentCustomerRowWarning = (context: string, error: unknown) => {
  logger.warn(`[useDocumentCustomerRow] ${context}`, error);
};

const sanitizeAgeValue = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.round(parsed);
};

const buildPhoneFromWaId = (waId: string): string => {
  if (!waId) {
    return "";
  }
  const trimmed = waId.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
};

export default function useDocumentCustomerRow(
  selectedWaId: string | null | undefined,
  _isLocalized?: boolean
) {
  const waId = selectedWaId || "";
  const { isLocalized } = useLanguageStore();
  const localized = _isLocalized ?? isLocalized;
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [validationErrors] = useState<
    Array<{ row: number; col: number; message: string; fieldName?: string }>
  >([]);

  // Get app config for documents columns
  const { data: appConfig } = useAppConfigQuery();
  // Use updatedAt as stable key to prevent unnecessary recalculations from toSnapshot()
  // This prevents grid flicker caused by toSnapshot() creating new objects on every render
  const configUpdatedAt = appConfig?.updatedAt;
  const documentsColumns = useMemo(
    () => appConfig?.toSnapshot().documentsColumns,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configUpdatedAt]
  );

  const customerColumns = useMemo<IColumnDefinition[]>(() => {
    // Use config columns if available
    if (documentsColumns && documentsColumns.length > 0) {
      return configColumnsToIColumnDefinitions(documentsColumns, localized);
    }

    // Fallback to default columns (backward compatibility)
    return [
      {
        id: "name",
        name: "name",
        title: i18n.getMessage("field_name", localized),
        dataType: ColumnDataType.TEXT,
        isEditable: true,
        isRequired: true,
        width: 150,
      },
      {
        id: "age",
        name: "age",
        title: i18n.getMessage("field_age", localized),
        dataType: ColumnDataType.NUMBER,
        isEditable: true,
        isRequired: false,
        width: 50,
        metadata: { useWheel: true },
        validationRules: [
          { type: "min", value: 10, message: "Minimum age is 10" },
          { type: "max", value: 120, message: "Maximum age is 120" },
        ],
      },
      {
        id: "phone",
        name: "phone",
        title: i18n.getMessage("field_phone", localized),
        dataType: ColumnDataType.PHONE,
        isEditable: true,
        isRequired: true,
        width: 150,
      },
    ];
  }, [localized, documentsColumns]);

  const customerDataSource = useMemo<IDataSource>(() => {
    const initialRow: unknown[] = ["", null, ""];
    return new InMemoryDataSource(1, customerColumns.length, customerColumns, [
      initialRow,
    ]);
  }, [customerColumns]);

  useEffect(() => {
    try {
      (async () => {
        const existing = await customerDataSource.getRowData(0);
        const resettable = customerDataSource as unknown as {
          reset?: (columns: IColumnDefinition[], rows: unknown[][]) => void;
        };
        if (typeof resettable.reset === "function") {
          resettable.reset(customerColumns, [existing]);
        }
      })().catch((error) => {
        logDocumentCustomerRowWarning(
          "Failed to reset customer data source with existing row",
          error
        );
      });
    } catch (error) {
      logDocumentCustomerRowWarning(
        "Error initializing customer data source reset",
        error
      );
    }
  }, [customerColumns, customerDataSource]);

  const onAddRowOverride = useCallback(() => {
    return;
  }, []);

  const providerRef = useRef<DataProvider | null>(null);

  const isUnlockReady = true;

  const fetchInFlightRef = useRef<string | null>(null);
  const latestRowRef = useRef<{
    waId: string;
    name: string;
    age: number | null;
  } | null>(null);

  const applyCustomerRow = useCallback(
    async (
      payload: { waId: string; name: string; age: number | null },
      provider: unknown | null | undefined
    ) => {
      const typedProvider = provider ? (provider as DataProvider) : null;
      const nameCol = customerColumns.findIndex((c) => c.id === "name");
      const ageCol = customerColumns.findIndex((c) => c.id === "age");
      const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

      const sanitizedName = (payload.name ?? "").trim();
      const sanitizedAge = sanitizeAgeValue(payload.age);
      const phoneValue = buildPhoneFromWaId(payload.waId);

      const rowData = customerColumns.map((column) => {
        switch (column.id) {
          case "name":
            return sanitizedName;
          case "age":
            return sanitizedAge;
          case "phone":
            return phoneValue;
          default:
            return null;
        }
      });

      try {
        if (customerDataSource instanceof InMemoryDataSource) {
          customerDataSource.reset(customerColumns, [rowData]);
        } else {
          if (nameCol !== -1) {
            await customerDataSource.setCellData(nameCol, 0, sanitizedName);
          }
          if (ageCol !== -1) {
            await customerDataSource.setCellData(ageCol, 0, sanitizedAge);
          }
          if (phoneCol !== -1) {
            await customerDataSource.setCellData(phoneCol, 0, phoneValue);
          }
        }
      } catch (error) {
        logDocumentCustomerRowWarning(
          "Failed to apply customer row data to data source",
          error
        );
      }

      if (typedProvider) {
        try {
          typedProvider.getEditingState().clearMemory();
        } catch (error) {
          logDocumentCustomerRowWarning(
            "Failed to clear provider editing state while applying customer row",
            error
          );
        }
        try {
          await typedProvider.refresh();
        } catch (error) {
          logDocumentCustomerRowWarning(
            "Failed to refresh data provider while applying customer row",
            error
          );
        }
      }

      try {
        type GridApiLike = {
          updateCells?: (cells: { cell: [number, number] }[]) => void;
        };
        const gridApi = (
          window as unknown as {
            __docGridApi?: GridApiLike;
          }
        ).__docGridApi;
        if (gridApi?.updateCells) {
          const updates = [nameCol, ageCol, phoneCol]
            .filter((col) => col !== -1)
            .map((col) => ({ cell: [col as number, 0] as [number, number] }));
          if (updates.length > 0) {
            gridApi.updateCells(updates);
          }
        }
      } catch (error) {
        logDocumentCustomerRowWarning(
          "Failed to update grid cells after applying customer row",
          error
        );
      }

      window.dispatchEvent(
        new CustomEvent("doc:customer-loaded", {
          detail: { waId: payload.waId },
        })
      );
      try {
        window.dispatchEvent(
          new CustomEvent("doc:unlock-request", {
            detail: { waId: payload.waId },
          })
        );
      } catch {
        // Ignore unlock request dispatch errors
      }
    },
    [customerColumns, customerDataSource]
  );

  const loadCustomerData = useCallback(
    async (targetWaId: string) => {
      const trimmed = targetWaId?.trim();
      if (!trimmed) {
        return false;
      }

      if (fetchInFlightRef.current === trimmed) {
        if (latestRowRef.current?.waId === trimmed && providerRef.current) {
          await applyCustomerRow(latestRowRef.current, providerRef.current);
        }
        return false;
      }

      fetchInFlightRef.current = trimmed;
      setCustomerLoading(true);

      try {
        (globalThis as { __docRestInFlight?: boolean }).__docRestInFlight =
          true;

        const svc = createDocumentsService();
        const resp = await svc.getByWaId(trimmed);
        const restName = (resp?.name ?? "") as string;
        const restAge = (resp?.age ?? null) as number | null;

        try {
          await customerDataSource.getCellData(0, 0);
        } catch {
          // ignore verification errors
        }

        const sanitizedPayload = {
          waId: trimmed,
          name: (restName || "").trim(),
          age: sanitizeAgeValue(restAge),
        };
        latestRowRef.current = sanitizedPayload;

        if (providerRef.current) {
          await applyCustomerRow(sanitizedPayload, providerRef.current);
        }

        setCustomerError(null);
        return true;
      } catch (error) {
        logDocumentCustomerRowWarning(
          `Failed to load customer data for waId ${trimmed}`,
          error
        );
        setCustomerError(
          (error as Error)?.message || "Failed to load customer"
        );
        return false;
      } finally {
        (globalThis as { __docRestInFlight?: boolean }).__docRestInFlight =
          false;
        setCustomerLoading(false);
        setTimeout(() => {
          if (fetchInFlightRef.current === trimmed) {
            fetchInFlightRef.current = null;
          }
        }, FETCH_IN_FLIGHT_RESET_DELAY_MS);
      }
    },
    [applyCustomerRow, customerDataSource]
  );

  const onDataProviderReady = useCallback(
    async (provider: unknown) => {
      providerRef.current = provider as DataProvider;
      if (latestRowRef.current && latestRowRef.current.waId === waId) {
        await applyCustomerRow(latestRowRef.current, provider);
        return;
      }
      await loadCustomerData(waId);
    },
    [waId, applyCustomerRow, loadCustomerData]
  );

  const prevWaIdRef = useRef<string | null>(null);
  useEffect(() => {
    try {
      if (prevWaIdRef.current === waId) {
        return;
      }

      prevWaIdRef.current = waId;

      // If waId is empty, clear the cached row data and blank all fields
      if (!waId || waId.trim() === "") {
        latestRowRef.current = null;
        fetchInFlightRef.current = null;

        const nameCol = customerColumns.findIndex((c) => c.id === "name");
        const ageCol = customerColumns.findIndex((c) => c.id === "age");
        const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

        const clearedRow = customerColumns.map((column) =>
          column.id === "age" ? null : ""
        );

        let resetApplied = false;
        if (customerDataSource instanceof InMemoryDataSource) {
          try {
            customerDataSource.reset(customerColumns, [clearedRow]);
            resetApplied = true;
          } catch (error) {
            logDocumentCustomerRowWarning(
              "Failed to reset in-memory data source when waId cleared",
              error
            );
          }
        }

        if (!resetApplied) {
          try {
            if (nameCol !== -1) {
              customerDataSource.setCellData(nameCol, 0, "");
            }
            if (ageCol !== -1) {
              customerDataSource.setCellData(ageCol, 0, null);
            }
            if (phoneCol !== -1) {
              customerDataSource.setCellData(phoneCol, 0, "");
            }
          } catch (error) {
            logDocumentCustomerRowWarning(
              "Failed to clear grid cells when waId became empty",
              error
            );
          }
        }

        const provider = providerRef.current;
        if (provider) {
          try {
            provider.getEditingState().clearMemory();
          } catch (error) {
            logDocumentCustomerRowWarning(
              "Failed to clear editing state when waId cleared",
              error
            );
          }
          try {
            provider.refresh();
          } catch (error) {
            logDocumentCustomerRowWarning(
              "Failed to refresh data provider when waId cleared",
              error
            );
          }
        }

        try {
          const gridApi = (
            window as unknown as {
              __docGridApi?: {
                updateCells?: (cells: { cell: [number, number] }[]) => void;
              };
            }
          ).__docGridApi;
          const updates = [nameCol, ageCol, phoneCol]
            .filter((col) => col !== -1)
            .map((col) => ({ cell: [col, 0] as [number, number] }));
          if (updates.length > 0) {
            gridApi?.updateCells?.(updates);
          }
        } catch (error) {
          logDocumentCustomerRowWarning(
            "Failed to trigger grid updates when waId cleared",
            error
          );
        }

        return;
      }

      const phoneCol = customerColumns.findIndex((c) => c.id === "phone");
      if (phoneCol !== -1) {
        let phoneValue = "";
        if (waId) {
          phoneValue = waId.startsWith("+") ? waId : `+${waId}`;
        }
        const suppressionKey = "__docSuppressPhoneSelect";
        const globalScope = globalThis as {
          __docSuppressPhoneSelect?: number;
        };
        globalScope[suppressionKey] = (globalScope[suppressionKey] ?? 0) + 1;
        customerDataSource
          .setCellData(phoneCol, 0, phoneValue)
          .catch((error) => {
            logDocumentCustomerRowWarning(
              `Failed to set phone cell data for waId ${waId}`,
              error
            );
          })
          .finally(() => {
            try {
              const current = globalScope[suppressionKey] ?? 1;
              const next = current - 1;
              if (next > 0) {
                globalScope[suppressionKey] = next;
              } else {
                delete globalScope[suppressionKey];
              }
            } catch {
              // Ignore suppression cleanup failures
            }
          });

        try {
          const providerWithInternals = (providerRef.current ||
            {}) as unknown as {
            cellCache?: Map<string, unknown>;
            editingState?: {
              editedCells?: Map<number, Map<number, unknown>>;
            };
          };
          if (providerWithInternals.editingState?.editedCells) {
            const rowMap =
              providerWithInternals.editingState.editedCells.get(0);
            rowMap?.delete(phoneCol);
          }
          providerWithInternals.cellCache?.delete(`${phoneCol}-0`);
          const gridApi = (
            window as unknown as {
              __docGridApi?: {
                updateCells?: (cells: { cell: [number, number] }[]) => void;
              };
            }
          ).__docGridApi;
          gridApi?.updateCells?.([{ cell: [phoneCol, 0] }]);
        } catch (error) {
          logDocumentCustomerRowWarning(
            "Failed to update grid cells after phone column update",
            error
          );
        }
      }
    } catch (error) {
      logDocumentCustomerRowWarning(
        "Error updating phone column when waId changed",
        error
      );
    }
  }, [waId, customerColumns, customerDataSource]);

  // Trigger data loading when waId changes (regardless of provider readiness)
  // This ensures customer data loads when the page opens with waId in the URL
  useEffect(() => {
    if (!waId || waId.trim() === "") {
      return;
    }

    loadCustomerData(waId).catch((error) => {
      logDocumentCustomerRowWarning(
        "Failed to reload customer data when waId changed",
        error
      );
    });
  }, [waId, loadCustomerData]);

  // Listen for explicit reload requests (e.g., after clearing and returning to same customer)
  useEffect(() => {
    if (!waId || waId.trim() === "") {
      return;
    }

    const handler = (event: Event) => {
      try {
        const detail = (event as CustomEvent).detail as {
          waId?: string | null;
        };
        const targetWaId = detail?.waId ?? null;

        if (!targetWaId || targetWaId !== waId) {
          return;
        }

        loadCustomerData(targetWaId).catch((reloadError) => {
          logDocumentCustomerRowWarning(
            "Failed to reload customer data after force reload request",
            reloadError
          );
        });
      } catch (error) {
        logDocumentCustomerRowWarning(
          "Failed to handle force customer reload event",
          error
        );
      }
    };

    window.addEventListener(
      "doc:force-customer-reload",
      handler as EventListener
    );
    return () => {
      window.removeEventListener(
        "doc:force-customer-reload",
        handler as EventListener
      );
    };
  }, [waId, loadCustomerData]);

  return {
    customerColumns,
    customerDataSource,
    customerLoading,
    customerError,
    validationErrors,
    onAddRowOverride,
    onDataProviderReady,
    isUnlockReady,
    providerRef,
  } as const;
}
