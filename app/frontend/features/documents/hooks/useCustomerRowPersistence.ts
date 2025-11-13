"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import type { IColumnDefinition, IDataSource } from "@/shared/libs/data-grid";
import { DEFAULT_DOCUMENT_WA_ID } from "@/shared/libs/documents";
import { CustomerRowPersistenceService } from "../services/customer-row-persistence.service";
import { createDocumentsService } from "../services/documents.service.factory";

export type UseCustomerRowPersistenceParams = {
  waId: string;
  customerDataSource: IDataSource | null;
  customerColumns: IColumnDefinition[];
  onCreateNewCustomer?: (input: {
    name: string;
    phone: string;
    age: number | null;
  }) => Promise<string | null | undefined>;
};

/**
 * Hook for persisting customer row data (name/age) to the backend.
 * Handles debouncing, change detection, in-flight guards, and toast notifications.
 *
 * @param params - Hook parameters
 * @returns Callback to persist row data
 */
export function useCustomerRowPersistence(
  params: UseCustomerRowPersistenceParams
): {
  persistRow: (triggeredBy?: "name" | "age" | "phone") => Promise<void>;
} {
  const { waId, customerDataSource, customerColumns, onCreateNewCustomer } =
    params;
  const { isLocalized } = useLanguageStore();

  // Track previous persisted values per waId
  const prevByWaRef = useRef<Map<string, { name: string; age: number | null }>>(
    new Map()
  );
  // Track in-flight persistence to prevent duplicates
  const persistInFlightRef = useRef<{
    waId: string;
    name: string;
    age: number | null;
  } | null>(null);

  const persistRow = useCallback(
    async (triggeredBy?: "name" | "age" | "phone") => {
      console.log("[persistRow] Called", {
        triggeredBy,
        waId,
        hasOnCreateNewCustomer: !!onCreateNewCustomer,
      });

      try {
        if (!customerDataSource) {
          console.log("[persistRow] No customerDataSource, aborting");
          return;
        }

        const nameCol = customerColumns.findIndex((c) => c.id === "name");
        const ageCol = customerColumns.findIndex((c) => c.id === "age");
        const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

        const [nameVal, ageVal, phoneVal] = await Promise.all([
          nameCol !== -1
            ? customerDataSource.getCellData(nameCol, 0)
            : Promise.resolve(""),
          ageCol !== -1
            ? customerDataSource.getCellData(ageCol, 0)
            : Promise.resolve(null),
          phoneCol !== -1
            ? customerDataSource.getCellData(phoneCol, 0)
            : Promise.resolve(""),
        ]);

        const name = (nameVal as string) || "";
        const age = (ageVal as number | null) ?? null;
        const phone =
          typeof phoneVal === "string" ? phoneVal : String(phoneVal ?? "");

        const sanitizedPhone = phone.replace(/\D+/g, "");

        console.log("[persistRow] Cell values", {
          name,
          age,
          phone,
          sanitizedPhone,
        });

        // Check if we should create a new customer:
        // 1. If waId is empty/default, OR
        // 2. If phone number doesn't match current waId (user entered a different phone)
        const shouldCreateNew =
          onCreateNewCustomer &&
          sanitizedPhone &&
          (!waId ||
            waId === DEFAULT_DOCUMENT_WA_ID ||
            sanitizedPhone !== waId.replace(/\D+/g, ""));

        console.log("[persistRow] Should create new customer?", {
          shouldCreateNew,
          hasCallback: !!onCreateNewCustomer,
          hasSanitizedPhone: !!sanitizedPhone,
          waIdCheck: !waId || waId === DEFAULT_DOCUMENT_WA_ID,
        });

        if (shouldCreateNew) {
          if (!sanitizedPhone) {
            console.log("[persistRow] No sanitized phone, aborting creation");
            return;
          }

          console.log("[persistRow] ✓ Creating new customer via onCreateNewCustomer");
          const createdWaId = await onCreateNewCustomer({
            name,
            phone: sanitizedPhone,
            age,
          });

          console.log("[persistRow] onCreateNewCustomer result:", createdWaId);

          if (createdWaId) {
            prevByWaRef.current.set(createdWaId, {
              name: name.trim(),
              age,
            });
            persistInFlightRef.current = null;
            console.log("[persistRow] ✓ Customer created successfully, waId:", createdWaId);
          } else {
            console.warn("[persistRow] ⚠️ onCreateNewCustomer returned null/undefined");
          }
          return;
        }
        
        console.log("[persistRow] Not creating new customer, proceeding with normal persistence...");

        const documentsService = createDocumentsService();

        const result = await CustomerRowPersistenceService.persistRow({
          waId,
          customerDataSource,
          customerColumns,
          documentsService,
          isLocalized,
          triggeredBy,
          prevByWa: prevByWaRef.current,
          currentInFlight: persistInFlightRef.current,
        });

        // Update refs with result
        prevByWaRef.current = result.prevByWa;
        persistInFlightRef.current = result.persistInFlight;
      } catch {
        // Errors handled in service via toast
      }
    },
    [
      customerColumns,
      customerDataSource,
      waId,
      isLocalized,
      onCreateNewCustomer,
    ]
  );

  useEffect(() => {
    if (!customerDataSource) {
      return;
    }

    const handler = (event: Event) => {
      try {
        const detail = (event as CustomEvent).detail as { waId?: string };
        if (!detail || detail.waId !== waId) {
          return;
        }

        const nameCol = customerColumns.findIndex((c) => c.id === "name");
        const ageCol = customerColumns.findIndex((c) => c.id === "age");
        if (nameCol === -1 && ageCol === -1) {
          return;
        }

        Promise.all([
          nameCol !== -1
            ? customerDataSource.getCellData(nameCol, 0)
            : Promise.resolve(""),
          ageCol !== -1
            ? customerDataSource.getCellData(ageCol, 0)
            : Promise.resolve(null),
        ])
          .then(([nameValue, ageValue]) => {
            const sanitizedName = ((nameValue as string) || "").trim();
            let age: number | null = null;
            if (typeof ageValue === "number" && Number.isFinite(ageValue)) {
              age = ageValue;
            } else if (ageValue === null || ageValue === "") {
              age = null;
            } else if (Number.isFinite(Number(ageValue))) {
              age = Number(ageValue);
            }
            const next = new Map(prevByWaRef.current);
            next.set(waId, { name: sanitizedName, age });
            prevByWaRef.current = next;
            persistInFlightRef.current = null;
          })
          .catch(() => {
            // Swallow load errors; persistence will recompute on next edit
          });
      } catch {
        // Ignore event handler errors
      }
    };

    window.addEventListener("doc:customer-loaded", handler as EventListener);
    return () => {
      window.removeEventListener(
        "doc:customer-loaded",
        handler as EventListener
      );
    };
  }, [customerColumns, customerDataSource, waId]);

  return {
    persistRow,
  };
}
