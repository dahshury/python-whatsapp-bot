import { useCallback } from "react";

type UseSaveChangesArgs = {
	validateAllCells: () => unknown;
	performSave: () => Promise<unknown> | unknown;
	setCanSave: (canSave: boolean) => void;
};

export function useSaveChanges({
	validateAllCells,
	performSave,
	setCanSave,
}: UseSaveChangesArgs) {
	return useCallback(async () => {
		try {
			validateAllCells();
		} catch {
			// ignore validation exceptions; save handler will surface errors
		}

		const result = await Promise.resolve(performSave());
		if (result === true) {
			setCanSave(false);
		}
	}, [performSave, validateAllCells, setCanSave]);
}
