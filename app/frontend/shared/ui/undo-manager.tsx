"use client";

import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { useUndoStore } from "@shared/libs/store/use-undo-store";
import { useEffect } from "react";
import { toastService } from "@/shared/libs/toast/toast-service";

export function UndoManager() {
  const { popUndo, canUndo } = useUndoStore();
  const { isLocalized } = useLanguage();

  useEffect(() => {
    const handleUndo = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "z") {
        if (canUndo()) {
          event.preventDefault();
          const operationToUndo = popUndo();
          if (operationToUndo) {
            // Use centralized toast service wrapper for promise toasts
            toastService.promise(operationToUndo.execute(), {
              loading: `${i18n.getMessage("undo_processing", isLocalized)}: ${operationToUndo.description}...`,
              success: () => {
                try {
                  toastService.success(
                    i18n.getMessage("undo_success", isLocalized),
                    operationToUndo.description
                  );
                } catch {
                  // Ignore errors when showing undo success toast
                }
                return "";
              },
              error: (err: unknown) => {
                try {
                  const errorMessage =
                    err instanceof Error
                      ? err.message
                      : i18n.getMessage("undo_unknown_error", isLocalized);
                  toastService.error(
                    i18n.getMessage("undo_failed", isLocalized),
                    `${operationToUndo.description}: ${errorMessage}`
                  );
                } catch {
                  // Ignore errors when showing undo error toast
                }
                return "";
              },
            });
          }
        } else {
          // Optional: Notify user if there's nothing to undo
          // toast("Nothing to undo.");
        }
      }
    };

    document.addEventListener("keydown", handleUndo);
    return () => {
      document.removeEventListener("keydown", handleUndo);
    };
  }, [popUndo, canUndo, isLocalized]);

  return null; // This component does not render anything
}
