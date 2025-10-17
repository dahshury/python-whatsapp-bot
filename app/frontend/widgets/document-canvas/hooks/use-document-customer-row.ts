"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useResetDataSourceOnColumnsChange } from "@/shared/libs/data-grid/components/hooks/use-reset-data-source-on-columns-change";
import { ignoreAddRow } from "@/shared/libs/data-grid/utils/single-row-grid";
import { useLanguage } from "@/shared/libs/state/language-context";
import { useUnlockReady } from "@/widgets/document-canvas/hooks/use-unlock-ready";
import { useWaIdPhoneSync } from "@/widgets/document-canvas/hooks/use-waid-phone-sync";
import { createSingleRowDataSource } from "../../../shared/libs/data-grid/factories/create-single-row-data-source";
import { useCustomerColumns } from "./use-customer-columns";
import { useCustomerProfileLoader } from "./use-customer-profile-loader";

export function useDocumentCustomerRow(
	selectedWaId: string | null | undefined,
	_isLocalized?: boolean
) {
	const waId = selectedWaId || "";
	const { isLocalized } = useLanguage();
	const localized = _isLocalized ?? isLocalized;
	// loading and error are provided by useCustomerProfileLoader
	const [validationErrors] = useState<
		Array<{ row: number; col: number; message: string; fieldName?: string }>
	>([]);

	// One-row datasource columns: name, age, phone
	const customerColumns = useCustomerColumns(localized);

	const customerDataSource = useMemo(
		() => createSingleRowDataSource(customerColumns, ["", null, ""]),
		[customerColumns]
	);

	// Update column titles live when language changes without losing row data
	useResetDataSourceOnColumnsChange(customerDataSource, customerColumns, 0);

	// Reserved for future suppression needs (e.g., when programmatically setting values)
	// const suppressAgeSaveRef = useRef<boolean>(false);

	const onAddRowOverride = useCallback(ignoreAddRow, []);

	// Keep a reference to the grid provider so we can clear editing/cache state
	// when updating the phone cell outside of the provider-ready lifecycle
	const providerRef = useRef<unknown | null>(null);

	// Only name and phone are required for unlock (age is optional)
	const isUnlockReady = useUnlockReady(customerColumns, customerDataSource);

	const { onDataProviderReady, customerLoading, customerError } =
		useCustomerProfileLoader({
			waId,
			customerColumns,
			customerDataSource: customerDataSource as unknown as {
				setCellData: (
					col: number,
					row: number,
					v: unknown
				) => Promise<boolean> | Promise<void>;
				getCellData: (col: number, row: number) => Promise<unknown>;
			},
			providerRef,
		});

	// Update phone field when waId changes - fetch will handle name/age
	useWaIdPhoneSync({
		waId,
		customerColumns,
		customerDataSource: customerDataSource as unknown as {
			setCellData: (
				col: number,
				row: number,
				v: unknown
			) => Promise<void> | Promise<boolean>;
		},
		providerRef: providerRef as unknown as { current: unknown },
	});

	// Live age save when editing the single row
	// In current integration, live editing is wired in the page when data provider is ready

	return {
		customerColumns,
		customerDataSource,
		customerLoading,
		customerError,
		validationErrors,
		onAddRowOverride,
		onDataProviderReady,
		isUnlockReady,
	} as const;
}
