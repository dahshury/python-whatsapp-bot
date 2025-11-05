"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useDocumentsSection,
  useEnsureInitialized,
} from "@/features/documents";
import { createPhoneEditInterceptor } from "@/features/documents/grid/phoneEditInterceptor";
import { useCustomerData } from "@/shared/libs/data/customer-data-context";
import { TEMPLATE_USER_WA_ID } from "@/shared/libs/documents";
import { useLanguage } from "@/shared/libs/state/language-context";
import { DocumentsSectionLayout } from "./DocumentsSectionLayout";

function DocumentsPageContent() {
  const { resolvedTheme } = useTheme();
  const { locale, isLocalized } = useLanguage();
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
    scene,
    viewerScene,
    isUnlocked,
    isFullscreen,
    isSceneTransitioning,
    customerDataSource,
    validationErrors,
    loading,
    saveStatus,
    fsContainerRef,
    handleCreateNewCustomer,
    handleProviderReady,
    handleViewerCanvasChange,
    handleCanvasChange,
    onApiReadyWithApply,
    onViewerApiReady,
    enterFullscreen,
    exitFullscreen,
  } = useDocumentsSection({
    resolvedTheme,
  });

  const themeMode = useMemo<"light" | "dark">(
    () => (resolvedTheme === "dark" ? "dark" : "light") as "light" | "dark",
    [resolvedTheme]
  );

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
      handleCanvasChange={handleCanvasChange}
      handleCreateNewCustomer={handleCreateNewCustomer}
      handleProviderReady={handleProviderReady}
      handleViewerCanvasChange={handleViewerCanvasChange}
      isFullscreen={isFullscreen}
      isLocalized={isLocalized}
      isSceneTransitioning={isSceneTransitioning}
      isUnlocked={isUnlocked}
      loading={loading}
      locale={locale}
      onApiReadyWithApply={onApiReadyWithApply}
      onViewerApiReady={onViewerApiReady}
      saveStatus={saveStatus}
      scene={scene}
      themeMode={themeMode}
      validationErrors={validationErrors}
      viewerScene={viewerScene}
      waId={waId}
    />
  );
}

export default function DocumentsSection() {
  return <DocumentsPageContent />;
}
