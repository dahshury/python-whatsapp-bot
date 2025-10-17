"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import type { IDataSource } from "@/shared/libs/data-grid";
import GridPhoneCombobox from "@/shared/libs/data-grid/components/ui/grid-phone-combobox";
import { i18n } from "@/shared/libs/i18n";
import { useLanguage } from "@/shared/libs/state/language-context";
import { AgeWheelPicker } from "@/shared/ui/age-wheel-picker";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";
import { ExcalidrawPopoverEditor } from "@/widgets/documents/excalidraw-preview-editor";

const PHONE_CELL_COLUMN_INDEX = 2;
const NAME_CELL_COLUMN_INDEX = 0;
const AGE_CELL_COLUMN_INDEX = 1;
const EXCALIDRAW_CELL_COLUMN_INDEX = 3;

type FormData = {
	name: string;
	phone: string;
	age: number | null;
	excalidraw: unknown;
};

type Props = {
	dataSource: IDataSource;
	loading?: boolean;
	className?: string;
	onClearAction?: () => Promise<void>;
	onProviderReadyAction?: (provider: unknown) => void;
};

const extractPhoneFromCellData = (cellData: unknown): string => {
	if (cellData && typeof cellData === "object" && "data" in cellData) {
		const phoneCell = cellData as unknown as { data?: { value?: string } };
		return phoneCell.data?.value || "";
	}
	return String(cellData || "");
};

const initializeFormData = async (
	dataSource: IDataSource
): Promise<FormData> => {
	const [nameData, ageData, phoneData, excalidrawData] = await Promise.all([
		dataSource.getCellData(NAME_CELL_COLUMN_INDEX, 0),
		dataSource.getCellData(AGE_CELL_COLUMN_INDEX, 0),
		dataSource.getCellData(PHONE_CELL_COLUMN_INDEX, 0),
		dataSource.getCellData(EXCALIDRAW_CELL_COLUMN_INDEX, 0),
	]);

	return {
		name: String(nameData || ""),
		age: (ageData as number | null) || null,
		phone: extractPhoneFromCellData(phoneData),
		excalidraw: excalidrawData || null,
	};
};

export function DocumentsCustomerForm({
	dataSource,
	loading,
	className,
	onProviderReadyAction,
}: Props) {
	const { theme: currentTheme } = useTheme();
	const { isLocalized } = useLanguage();
	const [formData, setFormData] = useState<FormData>({
		name: "",
		phone: "",
		age: null,
		excalidraw: null,
	});

	// Load initial data from datasource
	useEffect(() => {
		const loadData = async () => {
			try {
				const data = await initializeFormData(dataSource);
				setFormData(data);

				if (onProviderReadyAction) {
					onProviderReadyAction(dataSource);
				}
			} catch {
				// Silently fail on data load errors, but still invoke provider ready
				try {
					if (onProviderReadyAction) {
						onProviderReadyAction(dataSource);
					}
				} catch {
					// Provider ready failed
				}
			}
		};

		loadData();
	}, [dataSource, onProviderReadyAction]);

	// Handle name change
	const handleNameChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			setFormData((prev) => ({ ...prev, name: value }));

			try {
				await dataSource.setCellData(NAME_CELL_COLUMN_INDEX, 0, value);
				window.dispatchEvent(
					new CustomEvent("doc:persist", { detail: { field: "name" } })
				);
			} catch {
				// Silently fail on name update
			}
		},
		[dataSource]
	);

	// Handle phone change
	const handlePhoneChange = useCallback(
		async (value: string) => {
			setFormData((prev) => ({ ...prev, phone: value }));

			try {
				const phoneCell = {
					kind: "phone-cell",
					value,
				};
				await dataSource.setCellData(PHONE_CELL_COLUMN_INDEX, 0, phoneCell);
				window.dispatchEvent(
					new CustomEvent("doc:persist", { detail: { field: "phone" } })
				);
			} catch {
				// Silently fail on phone update
			}
		},
		[dataSource]
	);

	// Handle age change
	const handleAgeChange = useCallback(
		async (value: number | null) => {
			setFormData((prev) => ({ ...prev, age: value }));

			try {
				await dataSource.setCellData(AGE_CELL_COLUMN_INDEX, 0, value);
				window.dispatchEvent(
					new CustomEvent("doc:persist", { detail: { field: "age" } })
				);
			} catch {
				// Silently fail on age update
			}
		},
		[dataSource]
	);

	// Handle excalidraw change
	const handleExcalidrawChange = useCallback(
		async (value: unknown) => {
			setFormData((prev) => ({ ...prev, excalidraw: value }));

			try {
				await dataSource.setCellData(EXCALIDRAW_CELL_COLUMN_INDEX, 0, value);
			} catch {
				// Silently fail on excalidraw update
			}
		},
		[dataSource]
	);

	if (loading) {
		return (
			<div className="flex h-24 items-center justify-center rounded-md border border-border/50 bg-background/60 p-4">
				<Spinner />
			</div>
		);
	}

	return (
		<div
			className={`rounded-md border border-border/50 bg-background/60 p-2 ${className || ""}`}
		>
			<FieldSet className="gap-2">
				<FieldGroup className="gap-1.5">
					{/* Row 1: Name, Age, Phone (equal splits) */}
					<div className="grid grid-cols-3 gap-1.5">
						{/* Name Field */}
						<Field className="gap-1">
							<FieldLabel className="text-xs" htmlFor="name">
								{i18n.getMessage("field_name", isLocalized) || "Name"}
							</FieldLabel>
							<Input
								autoComplete="off"
								className="h-8 bg-background text-xs"
								id="name"
								onChange={handleNameChange}
								placeholder="Enter customer name"
								value={formData.name}
							/>
						</Field>

						{/* Age Field */}
						<Field className="gap-1">
							<FieldLabel className="text-xs">
								{i18n.getMessage("field_age", isLocalized) || "Age"}
							</FieldLabel>
							<AgeWheelPicker
								max={120}
								min={10}
								onChange={handleAgeChange}
								value={formData.age}
							/>
						</Field>

						{/* Phone Field */}
						<Field className="gap-1">
							<FieldLabel className="text-xs">
								{i18n.getMessage("field_phone", isLocalized) || "Phone"}
							</FieldLabel>
							<GridPhoneCombobox
								allowCreateNew={true}
								onChange={handlePhoneChange}
								phoneOptions={[]}
								value={formData.phone}
							/>
						</Field>
					</div>

					{/* Row 2: Excalidraw Notes (single line) */}
					<Field className="gap-1">
						<FieldLabel className="text-xs">
							{i18n.getMessage("field_excalidraw", isLocalized) ||
								"Excalidraw Notes"}
						</FieldLabel>
						<ExcalidrawPopoverEditor
							onChange={handleExcalidrawChange}
							previewHeight={180}
							theme={currentTheme === "dark" ? "dark" : "light"}
							value={formData.excalidraw}
						/>
					</Field>
				</FieldGroup>
			</FieldSet>
		</div>
	);
}
