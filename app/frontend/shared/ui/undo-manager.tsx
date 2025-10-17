"use client";

import { useLanguage } from "@shared/libs/state/language-context";
import {
	type UndoableOperation,
	useUndoStore,
} from "@shared/libs/store/use-undo-store";
import { useEffect } from "react";
import { toastService } from "@/shared/libs/toast/toast-service";

const getErrorMessage = (err: unknown, isLocalized: boolean): string => {
	if (err instanceof Error) {
		return err.message;
	}
	return isLocalized ? "خطأ غير معروف" : "Unknown error";
};

const handleUndoOperation = (
	operationToUndo: UndoableOperation | undefined,
	isLocalized: boolean
) => {
	if (!operationToUndo) {
		return;
	}

	toastService.promise(operationToUndo.execute(), {
		loading: isLocalized
			? `جاري التراجع: ${operationToUndo.description}...`
			: `Undoing: ${operationToUndo.description}...`,
		success: () => {
			try {
				toastService.success(
					isLocalized ? "تم التراجع بنجاح" : "Undo successful",
					operationToUndo.description
				);
			} catch {
				// Suppress toast service errors
			}
			return "";
		},
		error: (err: unknown) => {
			try {
				const errorMessage = getErrorMessage(err, isLocalized);
				toastService.error(
					isLocalized ? "فشل التراجع" : "Undo failed",
					`${operationToUndo.description}: ${errorMessage}`
				);
			} catch {
				// Suppress toast service errors
			}
			return "";
		},
	});
};

export function UndoManager() {
	const { popUndo, canUndo } = useUndoStore();
	const { isLocalized } = useLanguage();

	useEffect(() => {
		const handleUndo = (event: KeyboardEvent) => {
			if ((event.ctrlKey || event.metaKey) && event.key === "z" && canUndo()) {
				event.preventDefault();
				const operationToUndo = popUndo();
				handleUndoOperation(operationToUndo, isLocalized);
			}
		};

		document.addEventListener("keydown", handleUndo);
		return () => {
			document.removeEventListener("keydown", handleUndo);
		};
	}, [popUndo, canUndo, isLocalized]);

	return null; // This component does not render anything
}
