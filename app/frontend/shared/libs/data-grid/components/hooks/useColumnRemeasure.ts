"use client";

import type { DataEditorRef } from "@glideapps/glide-data-grid";
import { useCallback, useEffect } from "react";

// Autosize functionality using glide-data-grid's built-in remeasureColumns (like st_DataFrame)
export function useColumnRemeasure(
  dataEditorRef: React.RefObject<DataEditorRef | null>,
  onAutosize?: (columnIndex: number) => void
) {
  const handleAutosize = useCallback(
    (columnIndex: number) => {
      if (dataEditorRef?.current) {
        // Use CompactSelection for single column like st_DataFrame does
        import("@glideapps/glide-data-grid").then(({ CompactSelection }) => {
          dataEditorRef.current?.remeasureColumns(
            CompactSelection.fromSingleSelection(columnIndex)
          );
        });
      }
    },
    [dataEditorRef]
  );

  // Expose autosize to parent if provided
  useEffect(() => {
    if (onAutosize) {
      // Replace the parent's autosize with our implementation
      (window as unknown as { gridAutosize?: () => void }).gridAutosize = () =>
        handleAutosize(0);
    }
    return () => {
      const w = window as unknown as { gridAutosize?: () => void };
      if (w.gridAutosize) {
        w.gridAutosize = () => {
          // Cleanup: no-op handler to prevent errors
        };
      }
    };
  }, [onAutosize, handleAutosize]);

  return {
    handleAutosize,
  };
}
