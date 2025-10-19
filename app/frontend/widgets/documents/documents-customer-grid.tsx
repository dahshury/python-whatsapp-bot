"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import type { IDataSource } from "@/shared/libs/data-grid";
import { createGlideTheme, FullscreenProvider } from "@/shared/libs/data-grid";

const ClientGrid = dynamic(
	() => import("@/shared/libs/data-grid/components/Grid"),
	{
		ssr: false,
	}
);

type Props = {
	dataSource: IDataSource;
	validationErrors?: Array<{
		row: number;
		col: number;
		message: string;
		fieldName?: string;
	}>;
	loading?: boolean;
	className?: string;
	onProviderReadyAction?: (provider: unknown) => void;
	onClearAction?: () => void;
};

export function DocumentsCustomerGrid({
	dataSource,
	validationErrors,
	loading,
	className,
	onProviderReadyAction,
	onClearAction,
}: Props) {
	const { theme: currentTheme } = useTheme();
	const isDarkMode = currentTheme === "dark";

	const gridTheme = useMemo(() => {
		const baseTheme = createGlideTheme(isDarkMode ? "dark" : "light");
		return {
			...baseTheme,
			// Larger text to fit taller row height
			baseFontStyle: "18px",
			editorFontSize: "18px",
			headerFontStyle: "600 12px",
			// Reasonable padding for readability
			cellHorizontalPadding: 10,
			cellVerticalPadding: 6,
			lineHeight: 1.25,
		};
	}, [isDarkMode]);

	return (
		<div className="min-h-0 w-full flex-1 rounded-md border border-border/50 bg-background/60 p-1">
			<FullscreenProvider>
				{/* Dynamic import - TypeScript can't validate props from async imports */}
				<ClientGrid
					className={className || "min-h-[64px] w-full"}
					dataSource={dataSource as unknown as IDataSource}
					disableTrailingRow={true}
					documentsGrid={true}
					fullWidth={true}
					headerHeight={20}
					hideAppendRowPlaceholder={true}
					isDarkMode={isDarkMode}
					loading={loading ?? false}
					{...(onClearAction && { onAddRowOverride: onClearAction })}
					{...(onProviderReadyAction && {
						onDataProviderReady: onProviderReadyAction,
					})}
					rowHeight={48}
					rowMarkers="none"
					showThemeToggle={false}
					theme={gridTheme}
					{...(validationErrors && { validationErrors })}
				/>
			</FullscreenProvider>
		</div>
	);
}
