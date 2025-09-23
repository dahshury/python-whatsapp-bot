"use client";

import dynamic from "next/dynamic";
import { LockIllustration } from "@/components/lock-illustration";
import "@excalidraw/excalidraw/index.css";
import { useSearchParams } from "next/navigation";
import { useTheme as useNextThemes } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { DockNav } from "@/components/dock-nav";
import { DocumentCanvas } from "@/components/documents/DocumentCanvas";
import { FullscreenProvider } from "@/components/glide_custom_cells/components/contexts/FullscreenContext";
import { InMemoryDataSource } from "@/components/glide_custom_cells/components/core/data-sources/InMemoryDataSource";
import { createGlideTheme } from "@/components/glide_custom_cells/components/utils/streamlitGlideTheme";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useDocumentCustomerRow } from "@/hooks/useDocumentCustomerRow";
import { useDocumentScene } from "@/hooks/useDocumentScene";
import { DEFAULT_DOCUMENT_WA_ID } from "@/lib/default-document";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";

const Grid = dynamic(() => import("@/components/grids/DocumentsGrid"), {
	ssr: false,
});

export default function DocumentsPage() {
	const { isLocalized, locale } = useLanguage();
	const search = useSearchParams();
	const selectedWaId = search.get("waId") || "";
	const { resolvedTheme, theme: nextTheme } = useNextThemes();
	useSettings();

	// Initialize hooks whose values are used for enabling scene
	const {
		customerColumns,
		customerDataSource,
		customerLoading,
		customerError,
		validationErrors,
		onAddRowOverride,
		onDataProviderReady,
		isUnlockReady,
	} = useDocumentCustomerRow(selectedWaId, isLocalized);

	const { loading, handleCanvasChange, onExcalidrawAPI } = useDocumentScene(
		selectedWaId,
		{
			enabled: selectedWaId === DEFAULT_DOCUMENT_WA_ID || isUnlockReady,
		},
	);

	const isDarkMode = useMemo(() => {
		const desired = (
			nextTheme && nextTheme !== "system" ? nextTheme : resolvedTheme
		) as string | undefined;
		return desired === "dark";
	}, [resolvedTheme, nextTheme]);

	const excalidrawLang = useMemo(
		() => (locale === "ar" ? "ar-SA" : locale),
		[locale],
	);

	const excalidrawTheme = useMemo(() => {
		const desired = (
			nextTheme && nextTheme !== "system" ? nextTheme : resolvedTheme
		) as string | undefined;
		return desired === "dark" ? "dark" : "light";
	}, [nextTheme, resolvedTheme]);

	const [_gridThemeTick, setGridThemeTick] = useState(0);
	useEffect(() => {
		const id = requestAnimationFrame(() => setGridThemeTick((t) => t + 1));
		return () => cancelAnimationFrame(id);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const el = document.documentElement;
		let prevDark = el.classList.contains("dark");
		const observer = new MutationObserver(() => {
			const currDark = el.classList.contains("dark");
			if (currDark !== prevDark) {
				prevDark = currDark;
				requestAnimationFrame(() => setGridThemeTick((t) => t + 1));
			}
		});
		observer.observe(el, { attributes: true, attributeFilter: ["class"] });
		return () => observer.disconnect();
	}, []);

	const gridTheme = useMemo(
		() => createGlideTheme(isDarkMode ? "dark" : "light"),
		[isDarkMode],
	);

	// moved above to compute enablement before useDocumentScene

	// Bridge lock state for sidebar status: locked until minimal unlock criteria are met
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			(
				window as unknown as {
					__docLockState?: { isLocked?: boolean };
				}
			).__docLockState = {
				isLocked: !isUnlockReady && selectedWaId !== DEFAULT_DOCUMENT_WA_ID,
			};
		} catch {}
		return () => {
			try {
				(window as unknown as { __docLockState?: unknown }).__docLockState =
					undefined as unknown as never;
			} catch {}
		};
	}, [isUnlockReady, selectedWaId]);

	const placeholderCustomerDataSource = useMemo(() => {
		if (!selectedWaId) return null;
		const initialRow: unknown[] = ["", null, selectedWaId || ""];
		return new InMemoryDataSource(1, customerColumns.length, customerColumns, [
			initialRow,
		]);
	}, [selectedWaId, customerColumns]);

	return (
		<SidebarInset>
			<header className="relative flex h-10 shrink-0 items-center justify-center border-b px-3">
				<SidebarTrigger className="absolute left-4" />
				<DockNav className="mt-0 min-h-[2.25rem]" />
			</header>
			<div className="flex flex-col gap-2 px-4 pt-1 pb-4 h-[calc(100vh-2.5rem)]">
				<div className="w-full">
					{selectedWaId ? (
						<div className="relative transition-[width] duration-300 ease-out">
							{customerError && (
								<div className="p-2 text-sm text-red-500">{customerError}</div>
							)}
							{Grid && (
								<FullscreenProvider>
									<Grid
										key={`customer-grid-${selectedWaId || "none"}`}
										showThemeToggle={false}
										fullWidth={true}
										theme={gridTheme}
										isDarkMode={isDarkMode}
										loading={customerLoading}
										dataSource={
											customerDataSource ||
											placeholderCustomerDataSource ||
											new InMemoryDataSource(
												1,
												customerColumns.length,
												customerColumns,
												[["", null, selectedWaId || ""]],
											)
										}
										validationErrors={validationErrors}
										rowHeight={24}
										headerHeight={22}
										hideAppendRowPlaceholder={true}
										rowMarkers="none"
										disableTrailingRow={true}
										className="!border-0 m-0 p-0"
										onAddRowOverride={onAddRowOverride}
										onDataProviderReady={onDataProviderReady}
									/>
								</FullscreenProvider>
							)}
						</div>
					) : (
						<div className="relative transition-[width] duration-300 ease-out">
							{Grid && (
								<FullscreenProvider>
									<Grid
										key={"customer-grid-none"}
										showThemeToggle={false}
										fullWidth={true}
										theme={gridTheme}
										isDarkMode={isDarkMode}
										loading={false}
										dataSource={
											new InMemoryDataSource(
												1,
												customerColumns.length,
												customerColumns,
												[["", null, ""]],
											)
										}
										validationErrors={validationErrors}
										rowHeight={24}
										headerHeight={22}
										hideAppendRowPlaceholder={true}
										rowMarkers="none"
										disableTrailingRow={true}
										className="!border-0 m-0 p-0"
										onAddRowOverride={onAddRowOverride}
										onDataProviderReady={onDataProviderReady}
									/>
								</FullscreenProvider>
							)}
						</div>
					)}
				</div>

				<div className="flex-1 min-h-0">
					<div
						className="w-full h-full border rounded-md overflow-hidden bg-background relative"
						aria-busy={loading}
					>
						<div
							className={`w-full h-full transition-opacity ${loading || (!isUnlockReady && selectedWaId !== DEFAULT_DOCUMENT_WA_ID) ? "opacity-30 pointer-events-none" : "opacity-100"}`}
						>
							<DocumentCanvas
								theme={excalidrawTheme as "light" | "dark"}
								langCode={excalidrawLang as unknown as string}
								onChange={(els, app, files) =>
									handleCanvasChange(
										(els || []) as unknown[],
										(app || {}) as unknown as Record<string, unknown>,
										(files || {}) as Record<string, unknown>,
									)
								}
								onApiReady={(api) => onExcalidrawAPI(api as unknown as never)}
							/>
						</div>
						{!isUnlockReady && selectedWaId !== DEFAULT_DOCUMENT_WA_ID && (
							<div className="absolute inset-0 z-20 pointer-events-auto flex items-center justify-center bg-background/70 backdrop-blur-[0.125rem]">
								<LockIllustration className="h-full w-auto max-w-[56%] opacity-95" />
							</div>
						)}
						{loading ? (
							<div className="absolute inset-0 grid place-items-center pointer-events-auto z-10 cursor-wait bg-black/50">
								<div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
							</div>
						) : null}
					</div>
				</div>
			</div>
		</SidebarInset>
	);
}
