"use client";

import type { DataEditorRef, Theme } from "@glideapps/glide-data-grid";
import type React from "react";
import type { DataProvider, IDataSource } from "@/shared/libs/data-grid";
import { FullscreenProvider } from "@/shared/libs/data-grid";

type ValidationError = {
	row: number;
	col: number;
	message: string;
	fieldName?: string;
};

type GridComponentProps = {
	showThemeToggle?: boolean;
	fullWidth?: boolean;
	theme?: Partial<Theme>;
	isDarkMode?: boolean;
	dataSource: IDataSource;
	dataEditorRef?: React.RefObject<DataEditorRef | null>;
	loading?: boolean;
	validationErrors?: ValidationError[];
	onReady?: () => void;
	onDataProviderReady?: (provider: unknown) => void;
};

type CalendarEditorGridContainerProps = {
	Grid: React.ComponentType<GridComponentProps> | null;
	theme?: Partial<Theme>;
	isDarkMode: boolean;
	dataSource: IDataSource;
	dataEditorRef?: React.RefObject<DataEditorRef | null>;
	loading?: boolean;
	validationErrors?: ValidationError[];
	onReady?: () => void;

	dataProviderRef: React.RefObject<DataProvider | null>;
	createDebouncedValidationCheck: () => () => void;
	validateAllCells: () => { errors?: ValidationError[] } | undefined | null;
	setValidationErrorsIfChanged: (errors: ValidationError[]) => void;
	handleCheckEditingState: () => void;
};

export function CalendarEditorGridContainer(
	props: CalendarEditorGridContainerProps
) {
	const {
		Grid,
		theme,
		isDarkMode,
		dataSource,
		dataEditorRef,
		loading,
		validationErrors,
		onReady,
		dataProviderRef,
		createDebouncedValidationCheck,
		validateAllCells,
		setValidationErrorsIfChanged,
		handleCheckEditingState,
	} = props;

	const handleDataProviderReady = (provider: unknown) => {
		const dataProvider = provider as DataProvider;
		dataProviderRef.current = dataProvider;

		const editingState = dataProvider.getEditingState();

		const debouncedCheck = createDebouncedValidationCheck();

		const onEditingStateChange = () => {
			try {
				debouncedCheck();
			} catch {
				// Handler will be retried on next change
			}
			try {
				handleCheckEditingState();
			} catch {
				// State change will be captured on next event
			}
		};

		const unsubscribe = editingState.onChange(onEditingStateChange);

		try {
			dataProvider.setOnCellDataLoaded?.((_c: number, _r: number) => {
				try {
					const v = validateAllCells?.();
					setValidationErrorsIfChanged((v?.errors as ValidationError[]) || []);
					handleCheckEditingState();
				} catch {
					// Cell data loaded but validation may fail; will retry
				}
			});
		} catch {
			// Cell data loaded callback not supported
		}

		(
			dataProviderRef.current as DataProvider & { unsubscribe?: () => void }
		).unsubscribe = unsubscribe;

		try {
			handleCheckEditingState();
		} catch {
			// Initial state check may fail; will be retried on next change
		}
	};

	return (
		<FullscreenProvider>
			{Grid && (
				<Grid
					fullWidth={true}
					showThemeToggle={false}
					{...(theme ? { theme } : {})}
					{...(typeof isDarkMode === "boolean" ? { isDarkMode } : {})}
					dataSource={dataSource}
					{...(dataEditorRef ? { dataEditorRef } : {})}
					{...(typeof loading !== "undefined" ? { loading } : {})}
					{...(validationErrors ? { validationErrors } : {})}
					{...(onReady ? { onReady } : {})}
					onDataProviderReady={handleDataProviderReady}
				/>
			)}
		</FullscreenProvider>
	);
}
