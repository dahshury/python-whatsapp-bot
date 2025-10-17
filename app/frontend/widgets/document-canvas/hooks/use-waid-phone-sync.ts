"use client";

import { useEffect, useRef } from "react";
import { getDocGridApi } from "@/shared/libs/data-grid/components/utils/grid-api";
import { clearEditingAndCacheForCells } from "@/shared/libs/data-grid/components/utils/provider-state";

export function useWaIdPhoneSync(args: {
	waId: string;
	customerColumns: { id: string }[];
	customerDataSource: {
		setCellData: (
			col: number,
			row: number,
			v: unknown
		) => Promise<void> | Promise<boolean>;
	};
	providerRef: { current: unknown };
}): void {
	const { waId, customerColumns, customerDataSource, providerRef } = args;
	const prevWaIdRef = useRef<string | null>(null);

	useEffect(() => {
		try {
			if (prevWaIdRef.current === waId) {
				return;
			}

			const phoneCol = customerColumns.findIndex((c) => c.id === "phone");
			prevWaIdRef.current = waId;

			if (phoneCol !== -1) {
				const phoneValue = getFormattedPhoneValue(waId);

				// Intentional: we don't await this async operation
				customerDataSource.setCellData(phoneCol, 0, phoneValue).catch(() => {
					// Intentional: setCellData failures are handled silently
				});

				try {
					clearEditingAndCacheForCells(providerRef.current, [
						{ col: phoneCol, row: 0 },
					]);
					const gridApi = getDocGridApi();
					gridApi?.updateCells?.([{ cell: [phoneCol, 0] }]);
				} catch {
					// Intentional: grid update may fail
				}
			}
		} catch {
			// Intentional: phone sync errors are handled silently
		}
	}, [waId, customerColumns, customerDataSource, providerRef]);
}

function getFormattedPhoneValue(waId: string | null): string {
	if (!waId) {
		return "";
	}
	return waId.startsWith("+") ? waId : `+${waId}`;
}
