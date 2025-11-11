"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo } from "react";
import type { SaveStatus } from "@/features/documents/types/save-state.types";
import type { TldrawStoreState } from "./useTldrawStore";

type UseDocumentStoreStatusParams = {
  canvasError: unknown;
  isCanvasError: boolean;
  isCanvasFetching: boolean;
  isCanvasLoading: boolean;
  canLoadCanvas: boolean;
  overlayLoading: boolean;
  remoteSnapshot: unknown;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  tldrawEditorStoreState: TldrawStoreState;
  tldrawViewerStoreState: TldrawStoreState;
  waId: string;
};

type UseDocumentStoreStatusResult = {
  storeErrorMessage: string | undefined;
};

export const useDocumentStoreStatus = ({
  canvasError,
  isCanvasError,
  isCanvasFetching,
  isCanvasLoading,
  canLoadCanvas,
  overlayLoading,
  remoteSnapshot: _remoteSnapshot,
  setSaveStatus,
  tldrawEditorStoreState,
  tldrawViewerStoreState: _tldrawViewerStoreState,
  waId,
}: UseDocumentStoreStatusParams): UseDocumentStoreStatusResult => {
  const storeErrorMessage = useMemo(() => {
    if (isCanvasError) {
      if (canvasError instanceof Error) {
        return canvasError.message || "Failed to load document canvas.";
      }
      return "Failed to load document canvas.";
    }
    if (tldrawEditorStoreState.status === "error") {
      const cause = tldrawEditorStoreState.error;
      if (cause instanceof Error) {
        return cause.message || "Unable to initialize TLDraw store.";
      }
      return "Unable to initialize TLDraw store.";
    }
    return;
  }, [canvasError, isCanvasError, tldrawEditorStoreState]);

  useEffect(() => {
    if (!waId) {
      setSaveStatus((prev) =>
        prev.status === "ready" ? prev : { status: "ready" }
      );
      return;
    }

    setSaveStatus((prev) => {
      if (storeErrorMessage) {
        return {
          status: "error",
          message: storeErrorMessage,
        };
      }

      const shouldShowLoading =
        overlayLoading ||
        (canLoadCanvas &&
          (isCanvasLoading ||
            isCanvasFetching ||
            tldrawEditorStoreState.status === "loading"));

      if (!canLoadCanvas) {
        if (
          prev.status === "dirty" ||
          prev.status === "saving" ||
          prev.status === "ready"
        ) {
          return prev;
        }
        return { status: "ready" };
      }

      if (shouldShowLoading) {
        return prev.status === "dirty" || prev.status === "saving"
          ? prev
          : { status: "loading" };
      }

      if (
        tldrawEditorStoreState.status === "ready" &&
        prev.status === "loading"
      ) {
        return { status: "saved", at: Date.now() };
      }

      return prev;
    });
  }, [
    isCanvasFetching,
    isCanvasLoading,
    canLoadCanvas,
    overlayLoading,
    setSaveStatus,
    storeErrorMessage,
    tldrawEditorStoreState,
    waId,
  ]);

  return {
    storeErrorMessage,
  };
};
