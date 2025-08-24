"use client";

import { useEffect } from "react";
import { toast } from "sonner";
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
						toast.promise(operationToUndo.execute(), {
							loading: isRTL
								? `جاري التراجع: ${operationToUndo.description}...`
								: `Undoing: ${operationToUndo.description}...`,
							success: (_data) => {
								// Assuming execute() returns some success message or data
								return isRTL
									? `تم التراجع بنجاح: ${operationToUndo.description}`
									: `Successfully undid: ${operationToUndo.description}`;
							},
							error: (err) => {
								// If undo fails, we might want to push it back or handle error
								// For now, just log and notify
								console.error("Undo failed:", err);
								return isRTL
									? `فشل التراجع: ${operationToUndo.description}. خطأ: ${err.message || "خطأ غير معروف"}`
									: `Failed to undo: ${operationToUndo.description}. Error: ${err.message || "Unknown error"}`;
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
	}, [popUndo, canUndo, isRTL]);

	return null; // This component does not render anything
}
