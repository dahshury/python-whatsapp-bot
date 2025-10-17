"use client";

import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { useSearchParams } from "next/navigation";
// CalendarDrawer trigger is removed on this page (icon exists elsewhere)
//
import { useTheme } from "next-themes";
import { Suspense, useEffect, useState } from "react";
//
import type { IDataSource } from "@/shared/libs/data-grid";
//
// removed local DataProvider typing in favor of hook encapsulation
import { DEFAULT_DOCUMENT_WA_ID } from "@/shared/libs/documents";
import { useLanguage } from "@/shared/libs/state/language-context";
import { useThemeMode } from "@/shared/libs/ui/use-theme-mode";
//
import { SidebarInset } from "@/shared/ui/sidebar";
import { useDocumentCustomerRow } from "@/widgets/document-canvas/hooks/use-document-customer-row";
import { DocumentEditor } from "@/widgets/documents/document-editor";
import { DocumentsCustomerForm } from "@/widgets/documents/documents-customer-form";
import { useCustomerPersistence } from "@/widgets/documents/hooks/use-customer-persistence";
import { useDocumentSceneGuards } from "@/widgets/documents/hooks/use-document-scene-guards";
import { useDocumentsProviderEvents } from "@/widgets/documents/hooks/use-documents-provider-events";
import { useDocumentsUnlock } from "@/widgets/documents/hooks/use-documents-unlock";
import { useDocumentsWaId } from "@/widgets/documents/hooks/use-documents-waid";
import { useEditorCanvas } from "@/widgets/documents/hooks/use-editor-canvas";
import { useFullscreenContainer } from "@/widgets/documents/hooks/use-fullscreen-container";
import { useClearDocument } from "../../../widgets/documents/hooks/use-clear-document";

// removed DOCS_DEBUG and all console logging

function DocumentsPageContent() {
	const { resolvedTheme } = useTheme();
	const { locale, isLocalized } = useLanguage();
	const searchParams = useSearchParams();

	const { waId, setWaId } = useDocumentsWaId(DEFAULT_DOCUMENT_WA_ID, {
		searchParams,
	});
	// Scene provided by useEditorCanvas
	const [scene, setScene] = useState<{
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
	} | null>(null);

	const { fsContainerRef, isFullscreen, enterFullscreen, exitFullscreen } =
		useFullscreenContainer();
	const [isUnlocked, setIsUnlocked] = useState(false);

	const { pendingInitialLoadWaIdRef, ignorePersistUntilRef } =
		useDocumentSceneGuards(waId);

	// Compute theme mode via helper
	const themeMode = useThemeMode(resolvedTheme);

	// Customer row (single-row grid): name | age | phone
	const {
		customerColumns,
		customerDataSource,
		customerLoading,
		onDataProviderReady: onDataProviderReadyFromHook,
	} = useDocumentCustomerRow(waId);

	const { providerRef, handleProviderReady } = useDocumentsProviderEvents({
		onDataProviderReady: onDataProviderReadyFromHook,
	});

	// Unlock state from hook
	const { isUnlocked: isUnlockedHook } = useDocumentsUnlock(waId, {
		customerColumns,
		customerDataSource,
	});
	useEffect(() => {
		setIsUnlocked(isUnlockedHook);
	}, [isUnlockedHook]);

	// Compose autosave behind a single hook
	const {
		scene: sceneFromHook,
		onEditorApiReady,
		handleEditorChange,
		saveStatus,
		loading,
	} = useEditorCanvas({
		waId,
		theme: themeMode,
		isUnlocked,
	});
	useEffect(() => {
		if (sceneFromHook) {
			setScene(sceneFromHook);
		}
	}, [sceneFromHook]);

	// Hook to handle explicit persist triggers from the grid (name/phone/age)
	useCustomerPersistence({
		waId,
		customerColumns,
		customerDataSource: customerDataSource as IDataSource,
		getIgnorePersistUntilAction: () => ignorePersistUntilRef.current,
	});

	// Clear action extracted into a hook
	const handleClear = useClearDocument({
		customerColumns,
		customerDataSource: customerDataSource as IDataSource,
		setWaId,
		setScene: (s: unknown) =>
			setScene(
				(s as unknown as {
					elements?: unknown[];
					appState?: Record<string, unknown>;
					files?: Record<string, unknown>;
				}) || null
			),
		setIsUnlocked,
		providerRef,
		pendingInitialLoadWaIdRef,
	});

	return (
		<SidebarInset>
			<div className="flex flex-1 flex-col gap-3 px-4 pt-1 pb-4">
				{/* Header spacer (calendar icon exists elsewhere) */}
				<div className="flex items-center justify-end gap-2" />

				{/* Work area: grid + editor canvas */}
				<div
					className={`flex-1 rounded-lg border border-border/50 bg-card/50 p-2 ${
						isFullscreen ? "rounded-none border-0 p-0" : ""
					}`}
					ref={fsContainerRef}
				>
					<div
						className="flex min-h-0 flex-col gap-2"
						style={{ height: isFullscreen ? "100vh" : "calc(100vh - 6.5rem)" }}
					>
						{/* Top: customer form */}
						<div
							className="flex min-h-0 flex-col"
							style={{ flex: "2.3 2.3 0%" }}
						>
							<DocumentsCustomerForm
								dataSource={customerDataSource as unknown as IDataSource}
								loading={customerLoading}
								onClearAction={handleClear}
								onProviderReadyAction={handleProviderReady}
							/>
						</div>

						{/* Bottom: editor canvas */}
						<div
							className="flex min-h-0 flex-col"
							style={{ flex: "7.7 7.7 0%" }}
						>
							<DocumentEditor
								enterFullscreen={enterFullscreen}
								exitFullscreen={exitFullscreen}
								isFullscreen={isFullscreen}
								isLocalized={isLocalized}
								isUnlocked={isUnlocked}
								langCode={locale || "en"}
								loading={loading}
								onApiReady={onEditorApiReady}
								onChange={
									handleEditorChange as unknown as ExcalidrawProps["onChange"]
								}
								saveStatus={saveStatus}
								scene={scene}
								theme={themeMode}
								waId={waId}
							/>
						</div>
					</div>
				</div>
			</div>
		</SidebarInset>
	);
}

export default function DocumentsPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<DocumentsPageContent />
		</Suspense>
	);
}
