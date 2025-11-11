"use client";

import type { DataEditorRef } from "@glideapps/glide-data-grid";
import { useCallback, useEffect } from "react";
import type { IColumnDefinition, IDataSource } from "@/shared/libs/data-grid";
import { createGridImperativeApi } from "@/shared/libs/data-grid/api/gridImperativeApi";

const GRID_API_SETUP_DELAY_MS = 100;
const GRID_REFRESH_DELAY_MS = 100;

type UseDocumentsGridRefreshParams = {
  gridDataEditorRef: React.RefObject<DataEditorRef | null>;
  customerDataSource: IDataSource | null;
  customerColumns: IColumnDefinition[];
};

/**
 * Hook to manage grid refresh logic for documents section.
 * Handles:
 * - Setting up the global grid API
 * - Refreshing grid cells when customer data changes
 * - Listening for customer loaded events
 */
export function useDocumentsGridRefresh({
  gridDataEditorRef,
  customerDataSource,
  customerColumns,
}: UseDocumentsGridRefreshParams): void {
  // Refresh grid cells helper
  const refreshGridCells = useCallback(() => {
    if (!gridDataEditorRef.current) {
      return;
    }

    try {
      const cells: { cell: [number, number] }[] = [];
      for (let c = 0; c < customerColumns.length; c += 1) {
        cells.push({ cell: [c, 0] });
      }
      if (cells.length > 0) {
        gridDataEditorRef.current?.updateCells(cells);
      }
    } catch {
      // Silently fail if update fails
    }
  }, [gridDataEditorRef, customerColumns.length]);

  // Set up grid API when data editor is ready
  useEffect(() => {
    const checkAndSetup = () => {
      if (gridDataEditorRef.current) {
        const gridApi = createGridImperativeApi(gridDataEditorRef);
        (window as unknown as { __docGridApi?: typeof gridApi }).__docGridApi =
          gridApi;
      }
    };

    // Check immediately
    checkAndSetup();

    // Also check after a short delay to catch async initialization
    const timeoutId = setTimeout(checkAndSetup, GRID_API_SETUP_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [gridDataEditorRef]);

  // Force grid refresh when customer data changes
  useEffect(() => {
    if (!gridDataEditorRef.current) {
      return;
    }
    if (!customerDataSource) {
      return;
    }

    // Small delay to ensure data source has been updated
    const timeoutId = setTimeout(() => {
      refreshGridCells();
    }, GRID_REFRESH_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [customerDataSource, refreshGridCells, gridDataEditorRef.current]);

  // Listen for customer loaded events to trigger grid refresh
  useEffect(() => {
    if (!gridDataEditorRef.current) {
      return;
    }

    const handleCustomerLoaded = () => {
      // Small delay to ensure data has been applied
      setTimeout(() => {
        refreshGridCells();
      }, GRID_REFRESH_DELAY_MS);
    };

    window.addEventListener("doc:customer-loaded", handleCustomerLoaded);
    return () => {
      window.removeEventListener("doc:customer-loaded", handleCustomerLoaded);
    };
  }, [refreshGridCells, gridDataEditorRef.current]);
}
