"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useEnsureInitialized } from "@/features/documents";
import { createPhoneEditInterceptor } from "@/features/documents/grid/phoneEditInterceptor";
import { useDocumentsSection } from "@/features/documents/hooks/useDocumentsSection";
import { useCustomerData } from "@/shared/libs/data/customer-data-context";
import { TEMPLATE_USER_WA_ID } from "@/shared/libs/documents";
import { DocumentsSectionLayout } from "./DocumentsSectionLayout";

function DocumentsPageContent() {
  const { customers } = useCustomerData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ensureInitialized = useEnsureInitialized();
  const templateInitializedRef = useRef(false);

  // Initialize template document on mount to ensure it exists
  useEffect(() => {
    if (templateInitializedRef.current) {
      return;
    }
    templateInitializedRef.current = true;

    ensureInitialized(TEMPLATE_USER_WA_ID).catch(() => {
      // Silently handle errors - template initialization is best-effort
    });
  }, [ensureInitialized]);

  // Main composition hook - orchestrates all document section logic
  const {
    waId,
    isFullscreen,
    isSceneTransitioning,
    customerDataSource,
    validationErrors,
    loading,
    saveStatus,
    setSaveStatus,
    fsContainerRef,
    handleCreateNewCustomer,
    handleProviderReady,
    enterFullscreen,
    exitFullscreen,
  } = useDocumentsSection();

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

  const gridDispatch = useCallback(
    (
      type:
        | "doc:user-select"
        | "doc:customer-loaded"
        | "grid:age-request"
        | "doc:persist"
        | "doc:notify",
      detail: unknown
    ) => {
      try {
        window.dispatchEvent(new CustomEvent(type, { detail }));
      } catch {
        // Ignore dispatch errors to avoid breaking grid editing flow
      }
    },
    []
  );

  const phoneEditInterceptor = useMemo(
    () =>
      createPhoneEditInterceptor({
        findCustomerByPhone,
        dispatch: gridDispatch,
        documentsMode: true,
        onCustomerSelected: (selectedWaId) => {
          if (!selectedWaId) {
            return;
          }

          // If we're already on this waId, reuse existing event flow
          if (waId === selectedWaId) {
            gridDispatch("doc:user-select", { waId: selectedWaId });
            return;
          }

          try {
            const params = new URLSearchParams(searchParams.toString());
            params.set("waId", selectedWaId);
            const query = params.toString();
            const url = query ? `/documents?${query}` : "/documents";
            router.push(url);
          } catch {
            gridDispatch("doc:user-select", { waId: selectedWaId });
          }
        },
      }),
    [findCustomerByPhone, gridDispatch, router, searchParams, waId]
  );

  const editInterceptors = useMemo(
    () => [phoneEditInterceptor],
    [phoneEditInterceptor]
  );

  return (
    <DocumentsSectionLayout
      customerDataSource={customerDataSource}
      editInterceptors={editInterceptors}
      enterFullscreen={enterFullscreen}
      exitFullscreen={exitFullscreen}
      fsContainerRef={fsContainerRef}
      gridDispatch={gridDispatch}
      handleCreateNewCustomer={handleCreateNewCustomer}
      handleProviderReady={handleProviderReady}
      isFullscreen={isFullscreen}
      isSceneTransitioning={isSceneTransitioning}
      loading={loading}
      saveStatus={saveStatus}
      setSaveStatus={setSaveStatus}
      validationErrors={validationErrors}
      waId={waId}
    />
  );
}

export default function DocumentsSection() {
  return <DocumentsPageContent />;
}
