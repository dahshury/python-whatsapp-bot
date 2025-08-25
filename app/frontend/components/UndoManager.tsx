"use client";

import { useEffect } from "react";
import { useUndoStore } from "@/hooks/useUndoStore";
import { useLanguage } from "@/lib/language-context";

export function UndoManager() {
	const { popUndo, canUndo } = useUndoStore();
	const { isRTL } = useLanguage();

	useEffect(() => {
		const handleUndo = (event: KeyboardEvent) => {
			if ((event.ctrlKey || event.metaKey) && event.key === "z") {
				if (canUndo()) {
					event.preventDefault();
					const operationToUndo = popUndo();
					if (operationToUndo) {
						import("sonner").then(({ toast: sonner }) => {
							sonner.promise(operationToUndo.execute(), {
								loading: isRTL
									? `جاري التراجع: ${operationToUndo.description}...`
									: `Undoing: ${operationToUndo.description}...`,
								success: () => {
									try {
										const { toastService } = require("@/lib/toast-service");
										toastService.success(isRTL ? "تم التراجع بنجاح" : "Undo successful", operationToUndo.description);
									} catch {}
									return "";
								},
								error: (err: any) => {
									console.error("Undo failed:", err);
									try {
										const { toastService } = require("@/lib/toast-service");
										toastService.error(isRTL ? "فشل التراجع" : "Undo failed", `${operationToUndo.description}: ${err?.message || (isRTL ? "خطأ غير معروف" : "Unknown error")}`);
									} catch {}
									return "";
								},
							});
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
	}, [popUndo, canUndo, isRTL]);

	return null; // This component does not render anything
}
