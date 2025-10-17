"use client";

import { useMemo } from "react";

export function useUnlockReady(
	_columns: { id: string; isRequired?: boolean }[],
	_ds: { getCellData?: (c: number, r: number) => Promise<unknown> } | unknown
) {
	// Current logic is constant true; keep hook to centralize evolution.
	return useMemo(() => true, []);
}
