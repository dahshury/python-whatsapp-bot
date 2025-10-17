export function setDocSavingFlags(
	isSaving: boolean,
	hasLocalEditsDuringSave?: boolean
): void {
	try {
		(
			globalThis as unknown as {
				__docIsSaving?: boolean;
				__docHasLocalEditsDuringSave?: boolean;
			}
		).__docIsSaving = isSaving;
	} catch {
		// Ignore errors when unable to set globalThis property (e.g., non-writable in strict mode)
	}

	if (hasLocalEditsDuringSave !== undefined) {
		try {
			(
				globalThis as unknown as {
					__docIsSaving?: boolean;
					__docHasLocalEditsDuringSave?: boolean;
				}
			).__docHasLocalEditsDuringSave = hasLocalEditsDuringSave;
		} catch {
			// Ignore errors when unable to set globalThis property (e.g., non-writable in strict mode)
		}
	}
}
