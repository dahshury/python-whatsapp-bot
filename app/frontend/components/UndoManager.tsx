"use client";

import { useEffect } from "react";
import { useUndoStore } from "@/hooks/useUndoStore";
import { useLanguage } from "@/lib/language-context";

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
						const { toastService } = require("@/lib/toast-service");
						toastService.promise(operationToUndo.execute(), {
							loading: isLocalized
								? `جاري التراجع: ${operationToUndo.description}...`
								: `Undoing: ${operationToUndo.description}...`,
							success: () => {
								try {
									toastService.success(
										isLocalized ? "تم التراجع بنجاح" : "Undo successful",
										operationToUndo.description,
									);
								} catch {}
								return "";
							},
							error: (err: unknown) => {
								console.error("Undo failed:", err);
								try {
									const errorMessage =
										err instanceof Error
											? err.message
											: isLocalized
												? "خطأ غير معروف"
												: "Unknown error";
									toastService.error(
										isLocalized ? "فشل التراجع" : "Undo failed",
										`${operationToUndo.description}: ${errorMessage}`,
									);
								} catch {}
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
