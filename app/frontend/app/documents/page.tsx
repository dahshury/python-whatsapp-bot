"use client";

import dynamic from "next/dynamic";
import { LockIllustration } from "@/components/lock-illustration";
import "@excalidraw/excalidraw/index.css";
import { Maximize2, Minimize2 } from "lucide-react";
import { useTheme as useNextThemes } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocumentCanvas } from "@/components/documents/DocumentCanvas";
import { FullscreenProvider } from "@/components/glide_custom_cells/components/contexts/FullscreenContext";
import { InMemoryDataSource } from "@/components/glide_custom_cells/components/core/data-sources/InMemoryDataSource";
import { createGlideTheme } from "@/components/glide_custom_cells/components/utils/streamlitGlideTheme";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/components/ui/sidebar";
import { useDocumentCustomerRow } from "@/hooks/useDocumentCustomerRow";
import type { ExcalidrawAPI } from "@/hooks/useDocumentScene";
import { useDocumentScene } from "@/hooks/useDocumentScene";
import { DEFAULT_DOCUMENT_WA_ID } from "@/lib/default-document";
import { computeSceneSignature } from "@/lib/documents/scene-utils";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";

const Grid = dynamic(() => import("@/components/grids/DocumentsGrid"), {
	ssr: false,
});

export default function DocumentsPage() {
	const { isLocalized, locale } = useLanguage();
	const { selectedDocumentWaId } = useSidebarChatStore();
	const selectedWaId = selectedDocumentWaId || "";
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
			enabled: true,
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

	// Use dynamic viewport height so the layout doesn't jump when virtual
	// keyboards appear on tablets/phones. Fallback to 100dvh when supported.
	const excalApiRef = useRef<ExcalidrawAPI | null>(null);
	const fsContainerRef = useRef<HTMLDivElement | null>(null);
	const [previewScene, setPreviewScene] = useState<{
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
	} | null>(null);
	const previewSigRef = useRef<string | null>(null);
	const sanitizePreviewAppState = useCallback(
		(app: Record<string, unknown> | null | undefined) => {
			const a = (app || {}) as Record<string, unknown>;
			const out: Record<string, unknown> = {};
			if (typeof a.viewBackgroundColor !== "undefined")
				out.viewBackgroundColor = a.viewBackgroundColor;
			if (typeof a.gridSize !== "undefined")
				out.gridSize = a.gridSize as unknown;
			return out;
		},
		[],
	);
	const scheduleExcalRefresh = useCallback(() => {
		try {
			const api = excalApiRef.current as unknown as {
				refresh?: () => void;
			} | null;
			requestAnimationFrame(() => api?.refresh?.());
			setTimeout(() => api?.refresh?.(), 160);
		} catch {}
	}, []);

	// Fullscreen toggle state & handlers
	const [isFullscreen, setIsFullscreen] = useState(false);
	const enterFullscreen = useCallback(() => {
		try {
			type FullscreenElement = Element & {
				webkitRequestFullscreen?: () => Promise<void> | void;
			};
			const el = fsContainerRef.current as unknown as FullscreenElement | null;
			if (!el) return;
			const req =
				el.requestFullscreen?.bind(el) || el.webkitRequestFullscreen?.bind(el);
			if (typeof req === "function") {
				void req();
			}
		} catch {}
	}, []);
	const exitFullscreen = useCallback(() => {
		try {
			const doc = document as Document & {
				webkitExitFullscreen?: () => Promise<void> | void;
			};
			const exit =
				document.exitFullscreen?.bind(document) ||
				doc.webkitExitFullscreen?.bind(document);
			if (typeof exit === "function") void exit();
		} catch {}
	}, []);
	useEffect(() => {
		const onFsChange = () => {
			try {
				const active = Boolean(document.fullscreenElement);
				setIsFullscreen(active);
				scheduleExcalRefresh();
				setTimeout(scheduleExcalRefresh, 200);
			} catch {}
		};
		document.addEventListener("fullscreenchange", onFsChange as EventListener);
		try {
			(
				document as unknown as {
					addEventListener?: (t: string, cb: EventListener) => void;
				}
			).addEventListener?.(
				"webkitfullscreenchange",
				onFsChange as EventListener,
			);
		} catch {}
		return () => {
			document.removeEventListener(
				"fullscreenchange",
				onFsChange as EventListener,
			);
			try {
				(
					document as unknown as {
						removeEventListener?: (t: string, cb: EventListener) => void;
					}
				).removeEventListener?.(
					"webkitfullscreenchange",
					onFsChange as EventListener,
				);
			} catch {}
		};
	}, [scheduleExcalRefresh]);

	// Keep preview in sync when a scene is applied (load or switch)
	useEffect(() => {
		const onSceneApplied = (ev: Event) => {
			try {
				const { wa_id, scene } = (ev as CustomEvent).detail as {
					wa_id?: string;
					scene?: {
						elements?: unknown[];
						appState?: Record<string, unknown>;
						files?: Record<string, unknown>;
					};
				};
				if (!wa_id || wa_id !== selectedWaId) return;
				const sanitized = {
					elements: (scene?.elements || []) as unknown[],
					appState: sanitizePreviewAppState(
						(scene?.appState || {}) as Record<string, unknown>,
					),
					files: (scene?.files || {}) as Record<string, unknown>,
				};
				const sig = computeSceneSignature(
					sanitized.elements || [],
					sanitized.appState || {},
					sanitized.files || {},
				);
				if (sig !== (previewSigRef.current || null)) {
					previewSigRef.current = sig;
					setPreviewScene(sanitized);
				}
			} catch {}
		};
		window.addEventListener(
			"documents:sceneApplied",
			onSceneApplied as EventListener,
		);
		return () =>
			window.removeEventListener(
				"documents:sceneApplied",
				onSceneApplied as EventListener,
			);
	}, [sanitizePreviewAppState, selectedWaId]);

	// Reset preview when switching documents to avoid stale content
	useEffect(() => {
		previewSigRef.current = null;
		setPreviewScene(null);
		void selectedWaId;
	}, [selectedWaId]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		let didInitRemount = false;
		const updateDocDvh = () => {
			try {
				const vh = Math.max(
					0,
					Math.floor(window.visualViewport?.height || window.innerHeight || 0),
				);
				document.documentElement.style.setProperty("--doc-dvh", `${vh}px`);
				if (!didInitRemount) {
					didInitRemount = true;
					// Light refresh to help any canvas settle after first layout
					scheduleExcalRefresh();
				}
			} catch {}
		};

		updateDocDvh();
		window.addEventListener("resize", updateDocDvh);
		try {
			window.visualViewport?.addEventListener?.("resize", updateDocDvh);
		} catch {}
		return () => {
			window.removeEventListener("resize", updateDocDvh);
			try {
				window.visualViewport?.removeEventListener?.("resize", updateDocDvh);
			} catch {}
		};
	}, [scheduleExcalRefresh]);

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
	// Documents header is now always visible; collapsible behavior removed

	// Deprecated remount key (kept for future use)

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
		<SidebarInset
			dir="ltr"
			style={{
				minHeight: "var(--doc-dvh, 100dvh)",
				height: "var(--doc-dvh, 100dvh)",
			}}
		>
			{/* Header is provided globally by PersistentDockHeader; avoid duplicate here */}
			<div
				className="flex flex-col gap-1.5 sm:gap-2 px-2 sm:px-4 pt-1 pb-2 sm:pb-4 flex-1 min-h-0"
				style={{ overscrollBehaviorY: "contain" }}
			>
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

				<div className="flex-1 min-h-0 relative" ref={fsContainerRef}>
					<div
						className={`absolute inset-0 grid grid-rows-[minmax(0,0.8fr)_minmax(0,4.2fr)] sm:grid-rows-[minmax(0,1fr)_minmax(0,5fr)] gap-1.5 sm:gap-2 ${isFullscreen ? "z-[9999] bg-background" : ""}`}
					>
						{/* Read-only preview (top, ~20% of bottom height) */}
						<div
							className="border rounded-md overflow-hidden bg-background relative"
							aria-busy={loading}
						>
							<div
								className={`w-full h-full transition-opacity ${!isUnlockReady && selectedWaId !== DEFAULT_DOCUMENT_WA_ID ? "opacity-20" : "opacity-100"}`}
							>
								<DocumentCanvas
									key={`preview-${selectedWaId || "none"}`}
									theme={excalidrawTheme as "light" | "dark"}
									langCode={excalidrawLang as unknown as string}
									forceLTR={true}
									viewModeEnabled={true}
									zenModeEnabled={true}
									scrollable={false}
									hideToolbar={true}
									scene={
										previewScene || { elements: [], appState: {}, files: {} }
									}
									onApiReady={() => {}}
								/>
							</div>
							{!isUnlockReady && selectedWaId !== DEFAULT_DOCUMENT_WA_ID && (
								<div className="absolute inset-0 z-20 pointer-events-auto bg-background/80 backdrop-blur-[0.125rem]" />
							)}
						</div>

						{/* Editable canvas (bottom) */}
						<div
							className="border rounded-md overflow-hidden bg-background relative"
							aria-busy={loading}
						>
							<div
								className={`w-full h-full transition-opacity ${loading || (!isUnlockReady && selectedWaId !== DEFAULT_DOCUMENT_WA_ID) ? "opacity-30 pointer-events-none" : "opacity-100"}`}
							>
								<DocumentCanvas
									key={`editor-${selectedWaId || "none"}`}
									theme={excalidrawTheme as "light" | "dark"}
									langCode={excalidrawLang as unknown as string}
									forceLTR={true}
									hideHelpIcon={true}
									onChange={(els, app, files) => {
										const next = {
											elements: (els || []) as unknown[],
											appState: sanitizePreviewAppState(
												(app || {}) as unknown as Record<string, unknown>,
											),
											files: (files || {}) as Record<string, unknown>,
										};
										const sig = computeSceneSignature(
											next.elements || [],
											next.appState || {},
											next.files || {},
										);
										if (sig !== (previewSigRef.current || null)) {
											previewSigRef.current = sig;
											setPreviewScene(next);
										}
										handleCanvasChange(
											(els || []) as unknown[],
											(app || {}) as unknown as Record<string, unknown>,
											(files || {}) as Record<string, unknown>,
										);
									}}
									onApiReady={(api) => {
										try {
											excalApiRef.current = api as unknown as ExcalidrawAPI;
											const els =
												(excalApiRef.current.getSceneElementsIncludingDeleted?.() ||
													[]) as unknown[];
											const app = (excalApiRef.current.getAppState?.() ||
												{}) as Record<string, unknown>;
											const files = (excalApiRef.current.getFiles?.() ||
												{}) as Record<string, unknown>;
											const initial = {
												elements: els,
												appState: sanitizePreviewAppState(
													app as Record<string, unknown>,
												),
												files,
											};
											const sig = computeSceneSignature(
												els || [],
												initial.appState || {},
												files || {},
											);
											previewSigRef.current = sig;
											setPreviewScene(initial);
										} catch {}
										onExcalidrawAPI(api as unknown as never);
									}}
								/>
							</div>
							{!isUnlockReady && selectedWaId !== DEFAULT_DOCUMENT_WA_ID && (
								<div className="absolute inset-0 z-20 pointer-events-auto flex items-center justify-center bg-background/70 backdrop-blur-[0.125rem]">
									<LockIllustration className="h-full w-auto max-w-[80%] sm:max-w-[56%] opacity-95" />
								</div>
							)}
							{loading ? (
								<div className="absolute inset-0 grid place-items-center pointer-events-auto z-10 cursor-wait bg-black/50">
									<div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
								</div>
							) : null}
						</div>
						{/* Fullscreen toggle floating inside canvas area (bottom-right) */}
						<Button
							variant="secondary"
							size="icon"
							className="absolute bottom-2 right-2 z-[100] h-8 w-8 shadow"
							style={{
								bottom: "max(0.5rem, env(safe-area-inset-bottom))",
								right: "max(0.5rem, env(safe-area-inset-right))",
							}}
							aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
							onClick={isFullscreen ? exitFullscreen : enterFullscreen}
						>
							{!isFullscreen ? (
								<Maximize2 className="h-4 w-4" />
							) : (
								<Minimize2 className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>
			</div>
		</SidebarInset>
	);
}
