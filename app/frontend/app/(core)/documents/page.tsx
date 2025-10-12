"use client";

import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
// CalendarDrawer trigger is removed on this page (icon exists elsewhere)
import { Lock, Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveCustomerDocument } from "@/shared/libs/api";
import type { IDataSource } from "@/shared/libs/data-grid";
import { FullscreenProvider } from "@/shared/libs/data-grid";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import { DEFAULT_DOCUMENT_WA_ID, ensureDocumentInitialized, toSceneFromDoc } from "@/shared/libs/documents";
import { computeSceneSignature } from "@/shared/libs/documents/scene-utils";
import { i18n } from "@/shared/libs/i18n";
import { useLanguage } from "@/shared/libs/state/language-context";
import { toastService } from "@/shared/libs/toast";
import { SidebarInset } from "@/shared/ui/sidebar";
import { DocumentCanvas } from "@/widgets/document-canvas/DocumentCanvas";
import { useDocumentCustomerRow } from "@/widgets/document-canvas/hooks/use-document-customer-row";
import { useDocumentScene } from "@/widgets/document-canvas/hooks/use-document-scene";
import { DocumentSavingIndicator } from "@/widgets/documents/DocumentSavingIndicator";
import { DocumentLockOverlay } from "../../../widgets/documents/DocumentLockOverlay";

function DocumentsPageContent() {
	const { resolvedTheme } = useTheme();
	const { locale, isLocalized } = useLanguage();
	const searchParams = useSearchParams();

	const [waId, setWaId] = useState<string>(DEFAULT_DOCUMENT_WA_ID);
	const [scene, setScene] = useState<{
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
	} | null>(null);

	// Live scene for real-time viewer mirror (updates on every editor change)
	const [liveScene, setLiveScene] = useState<{
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
	} | null>(null);

	const providerRef = useRef<DataProvider | null>(null);
	const fsContainerRef = useRef<HTMLDivElement | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isUnlocked, setIsUnlocked] = useState(false);

	// Ref to track viewer's current camera state for saving
	const viewerCameraRef = useRef<Record<string, unknown>>({});
	// Ref to track last viewer camera signature to avoid redundant saves
	const lastViewerCameraSigRef = useRef<string>("");

	// Track which waId we're expecting to load initially
	// After initial load for that waId, editor becomes write-only to prevent remounting during edits
	const pendingInitialLoadWaIdRef = useRef<string | null>(waId);

	// Signatures to avoid redundant scene re-applies that can cause flicker
	const editorSigRef = useRef<string | null>(null);
	const viewerSigRef = useRef<string | null>(null);

	// Debounce and guard controls for persistence to avoid duplicate PUTs on programmatic loads/switches
	const persistTimerRef = useRef<number | null>(null);
	const ignorePersistUntilRef = useRef<number>(0);

	// Initialize waId - start with default (blank) on fresh page load
	// User can explicitly select a customer from calendar/phone picker
	useEffect(() => {
		pendingInitialLoadWaIdRef.current = DEFAULT_DOCUMENT_WA_ID;
		setWaId(DEFAULT_DOCUMENT_WA_ID);
	}, []);

	// Check for waId in URL parameters and load that customer's document
	useEffect(() => {
		const urlWaId = searchParams.get("waId");
		if (urlWaId && urlWaId !== DEFAULT_DOCUMENT_WA_ID) {
			// Guard: briefly suppress persist while switching customers
			ignorePersistUntilRef.current = Date.now() + 900;
			if (persistTimerRef.current) {
				clearTimeout(persistTimerRef.current);
				persistTimerRef.current = null;
			}
			// Mark this waId as pending initial load
			pendingInitialLoadWaIdRef.current = urlWaId;
			// Reset viewer camera tracking for new document
			lastViewerCameraSigRef.current = "";
			viewerCameraRef.current = {};
			// Initialize the customer's document with template on first selection
			void ensureDocumentInitialized(urlWaId);
			setWaId(urlWaId);
		}
	}, [searchParams]);

	// Customer row (single-row grid): name | age | phone
	const {
		customerColumns,
		customerDataSource,
		customerLoading,
		validationErrors,
		onDataProviderReady: onDataProviderReadyFromHook,
	} = useDocumentCustomerRow(waId);

	// Listen for external document updates - ONLY apply to editor during initial load
	// After initial load, editor becomes write-only to prevent remounting during edits/auto-save
	// Top viewer always mirrors bottom editor via handleCanvasChange
	useEffect(() => {
		const onExternal = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string;
					document?: Record<string, unknown> | null;
				};
				if (String(detail?.wa_id || "") !== String(waId)) return;

				const s = toSceneFromDoc(detail?.document || null);
				const sig = computeSceneSignature(
					(s?.elements as unknown[]) || [],
					(s?.appState as Record<string, unknown>) || {},
					(s?.files as Record<string, unknown>) || {}
				);

				// Only update editor during initial load for this specific waId
				const isPendingInitialLoad = pendingInitialLoadWaIdRef.current === waId;
				const hasElements = Array.isArray(s.elements) && s.elements.length > 0;

				if (isPendingInitialLoad && sig && sig !== editorSigRef.current) {
					// Only mark as loaded if we received actual content, not an empty document
					if (hasElements || waId === DEFAULT_DOCUMENT_WA_ID) {
						console.log(
							`[Documents] 📥 Initial load from WebSocket for waId=${waId}, updating both cameras (elements=${s.elements?.length || 0})`
						);
						editorSigRef.current = sig;
						setScene(s);
						viewerSigRef.current = sig;
						// Load viewer's saved camera or use empty state
						const viewerCamera = s.viewerAppState || {};
						viewerCameraRef.current = viewerCamera;

						// Initialize viewer camera signature from loaded data
						const zoomValue = (viewerCamera.zoom as { value?: number })?.value ?? 1;
						const scrollX = (viewerCamera.scrollX as number) ?? 0;
						const scrollY = (viewerCamera.scrollY as number) ?? 0;
						const camera = {
							zoom: Math.round(zoomValue * 1000) / 1000,
							scrollX: Math.round(scrollX),
							scrollY: Math.round(scrollY),
						};
						lastViewerCameraSigRef.current = JSON.stringify(camera);
						console.log(
							`[Documents] 📷 Initialized viewer camera sig=${lastViewerCameraSigRef.current.slice(0, 30)}...`
						);

						setLiveScene({
							elements: s.elements || [],
							appState: viewerCamera,
							files: s.files || {},
						});
						// Mark this specific waId as loaded only if we got content
						pendingInitialLoadWaIdRef.current = null;
					} else {
						console.log(
							`[Documents] ⏭️ Ignoring empty document for waId=${waId} (waiting for template copy, elements=${s.elements?.length || 0})`
						);
					}
				} else if (!isPendingInitialLoad) {
					console.log(
						`[Documents] ⏭️ Ignoring WebSocket update for waId=${waId} (editor write-only after initial load)`
					);
				}
			} catch {}
		};
		const onApplied = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string;
					scene?: Record<string, unknown> | null;
				};
				if (String(detail?.wa_id || "") !== String(waId)) return;
				const s = (detail?.scene || null) as {
					elements?: unknown[];
					appState?: Record<string, unknown>;
					files?: Record<string, unknown>;
					viewerAppState?: Record<string, unknown>;
				} | null;
				if (s) {
					const sig = computeSceneSignature(
						(s?.elements as unknown[]) || [],
						(s?.appState as Record<string, unknown>) || {},
						(s?.files as Record<string, unknown>) || {}
					);

					// Only update editor during initial load for this specific waId
					const isPendingInitialLoad = pendingInitialLoadWaIdRef.current === waId;
					const hasElements = Array.isArray(s.elements) && s.elements.length > 0;

					if (isPendingInitialLoad && sig && sig !== editorSigRef.current) {
						// Only mark as loaded if we received actual content, not an empty document
						if (hasElements || waId === DEFAULT_DOCUMENT_WA_ID) {
							console.log(
								`[Documents] 📥 Initial scene applied from hook for waId=${waId}, updating both cameras (elements=${s.elements?.length || 0})`
							);
							editorSigRef.current = sig;
							setScene(s);
							viewerSigRef.current = sig;
							// Load viewer's saved camera or use empty state
							const viewerCamera = s.viewerAppState || {};
							viewerCameraRef.current = viewerCamera;

							// Initialize viewer camera signature from loaded data
							const zoomValue = (viewerCamera.zoom as { value?: number })?.value ?? 1;
							const scrollX = (viewerCamera.scrollX as number) ?? 0;
							const scrollY = (viewerCamera.scrollY as number) ?? 0;
							const camera = {
								zoom: Math.round(zoomValue * 1000) / 1000,
								scrollX: Math.round(scrollX),
								scrollY: Math.round(scrollY),
							};
							lastViewerCameraSigRef.current = JSON.stringify(camera);
							console.log(
								`[Documents] 📷 Initialized viewer camera sig (sceneApplied)=${lastViewerCameraSigRef.current.slice(0, 30)}...`
							);

							setLiveScene({
								elements: s.elements || [],
								appState: viewerCamera,
								files: s.files || {},
							});
							// Mark this specific waId as loaded only if we got content
							pendingInitialLoadWaIdRef.current = null;
						} else {
							console.log(
								`[Documents] ⏭️ Ignoring empty sceneApplied for waId=${waId} (waiting for template copy, elements=${s.elements?.length || 0})`
							);
						}
					} else if (!isPendingInitialLoad) {
						console.log(`[Documents] ⏭️ Ignoring sceneApplied for waId=${waId} (editor write-only after initial load)`);
					}
				}
			} catch {}
		};
		window.addEventListener("documents:external-update", onExternal as unknown as EventListener);
		window.addEventListener("documents:sceneApplied", onApplied as unknown as EventListener);
		return () => {
			try {
				window.removeEventListener("documents:external-update", onExternal as unknown as EventListener);
			} catch {}
			try {
				window.removeEventListener("documents:sceneApplied", onApplied as unknown as EventListener);
			} catch {}
		};
	}, [waId]);

	// Handle customer selection from grid phone or drawer calendar
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as { waId?: string };
				const next = String(detail?.waId || "");
				if (!next) return;
				// Guard: briefly suppress persist while switching customers
				ignorePersistUntilRef.current = Date.now() + 900;
				if (persistTimerRef.current) {
					clearTimeout(persistTimerRef.current);
					persistTimerRef.current = null;
				}
				// Mark this waId as pending initial load
				console.log(`[Documents] 🔄 Switching to new document waId=${next}, marking as pending initial load`);
				pendingInitialLoadWaIdRef.current = next;
				// Reset viewer camera tracking for new document
				lastViewerCameraSigRef.current = "";
				viewerCameraRef.current = {};
				// Initialize the customer's document with template on first selection
				console.log(`[Documents] 🔁 ensureDocumentInitialized called from selection: waId=${next}`);
				void ensureDocumentInitialized(next);
				setWaId(next);
				// Document load is handled by useDocumentScene hook automatically when waId changes
			} catch {}
		};
		window.addEventListener("doc:user-select", handler as EventListener);
		return () => window.removeEventListener("doc:user-select", handler as EventListener);
	}, []);

	// Detect unlock: requires non-empty valid name and phone (age optional)
	const recomputeUnlock = useCallback(async () => {
		try {
			// Skip check if no customer selected (blank document)
			if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
				if (isUnlocked) {
					console.log("[Documents] 🔓 No customer selected, locking canvas");
					setIsUnlocked(false);
				}
				return;
			}

			const ds = customerDataSource as IDataSource;
			// find columns by id
			const nameCol = customerColumns.findIndex((c) => c.id === "name");
			const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

			console.log(`[Documents] 🔓 Checking unlock: waId=${waId}, nameCol=${nameCol}, phoneCol=${phoneCol}`);

			const [nameVal, phoneVal] = await Promise.all([ds.getCellData(nameCol, 0), ds.getCellData(phoneCol, 0)]);

			const nameOk = typeof nameVal === "string" && nameVal.trim().length > 0;
			const phoneOk = typeof phoneVal === "string" && phoneVal.trim().startsWith("+");
			const waIdOk = waId && waId !== DEFAULT_DOCUMENT_WA_ID;
			const shouldUnlock = Boolean(nameOk && phoneOk && waIdOk);

			console.log(
				`[Documents] 🔓 Unlock check: name="${nameVal}" (${nameOk ? "✅" : "❌"}), phone="${phoneVal}" (${phoneOk ? "✅" : "❌"}), waId="${waId}" (${waIdOk ? "✅" : "❌"}) → ${shouldUnlock ? "UNLOCKED 🔓" : "LOCKED 🔒"}`
			);

			setIsUnlocked(shouldUnlock);
		} catch (err) {
			console.error("[Documents] ❌ Error computing unlock:", err);
			setIsUnlocked(false);
		}
	}, [customerColumns, customerDataSource, waId, isUnlocked]);

	// Listen for customer data loaded event and recompute unlock
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as { waId?: string };
				const eventWaId = String(detail?.waId || "");
				console.log(
					`[Documents] 📥 doc:customer-loaded event: eventWaId=${eventWaId}, currentWaId=${waId}, match=${eventWaId === waId}`
				);
				if (eventWaId === waId) {
					console.log("[Documents] ✅ Customer loaded, triggering unlock check");
					void recomputeUnlock();
				}
			} catch {}
		};
		window.addEventListener("doc:customer-loaded", handler as EventListener);
		return () => window.removeEventListener("doc:customer-loaded", handler as EventListener);
	}, [waId, recomputeUnlock]);

	// Saving and autosave controllers bound to current waId and lock state
	const {
		handleCanvasChange: originalHandleCanvasChange,
		onExcalidrawAPI,
		saveStatus,
		loading,
	} = useDocumentScene(waId, {
		enabled: true,
		isUnlocked,
	});

	// Callback for viewer canvas changes (to track viewer camera)
	const handleViewerCanvasChange = useCallback(
		(_elements: unknown[], appState: Record<string, unknown>, _files: Record<string, unknown>) => {
			// Compute stable signature for viewer camera (only zoom/scroll values)
			// Round to avoid floating-point precision issues
			const zoomValue = (appState.zoom as { value?: number })?.value ?? 1;
			const scrollX = (appState.scrollX as number) ?? 0;
			const scrollY = (appState.scrollY as number) ?? 0;

			const camera = {
				zoom: Math.round(zoomValue * 1000) / 1000,
				scrollX: Math.round(scrollX),
				scrollY: Math.round(scrollY),
			};
			const newSig = JSON.stringify(camera);

			// Only trigger autosave if camera signature actually changed
			if (newSig === lastViewerCameraSigRef.current) {
				return; // No change, skip
			}

			console.log(
				`[Documents] 📷 Viewer camera changed: old=${lastViewerCameraSigRef.current.slice(0, 30)}... new=${newSig.slice(0, 30)}...`
			);

			// Update refs
			viewerCameraRef.current = appState;
			lastViewerCameraSigRef.current = newSig;

			// Trigger autosave with current editor state + new viewer camera
			// This ensures viewer camera changes are persisted per-user
			try {
				const currentScene = sceneRef.current;
				if (currentScene?.elements && isUnlocked) {
					// Extract editor's camera from current scene
					const editorCamera = currentScene.appState
						? {
								zoom: currentScene.appState.zoom,
								scrollX: currentScene.appState.scrollX,
								scrollY: currentScene.appState.scrollY,
							}
						: undefined;

					// Pass current editor state with updated viewer camera to trigger autosave
					originalHandleCanvasChange(
						currentScene.elements as unknown[],
						currentScene.appState || {},
						currentScene.files || {},
						viewerCameraRef.current,
						editorCamera
					);
				}
			} catch (err) {
				console.error("[Documents] Error triggering save for viewer camera:", err);
			}
		},
		[originalHandleCanvasChange, isUnlocked]
	);

	// Wrap handleCanvasChange to update live viewer scene in real-time
	// Only mirror elements and files, not viewport/panning (appState)
	const handleCanvasChange = useCallback(
		(elements: unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
			// Update live scene with elements and files only
			// Preserve viewer's independent viewport by not updating appState
			setLiveScene((prev) => ({
				elements,
				appState: prev?.appState || {}, // Keep viewer's viewport
				files,
			}));

			// Extract editor's camera state for explicit tracking
			const editorCamera = {
				zoom: appState.zoom,
				scrollX: appState.scrollX,
				scrollY: appState.scrollY,
			};

			// Call original handler for autosave logic with both cameras
			// Pass viewerCameraRef.current as the viewer's independent camera
			// Pass editorCamera as the editor's camera for explicit persistence
			originalHandleCanvasChange(elements, appState, files, viewerCameraRef.current, editorCamera);
		},
		[originalHandleCanvasChange]
	);

	// Keep latest scene in ref for API-ready application
	const sceneRef = useRef(scene);
	useEffect(() => {
		sceneRef.current = scene;
	}, [scene]);

	// Apply current scene when API becomes ready to avoid a blank first render before external update
	const onApiReadyWithApply = useCallback(
		(api: ExcalidrawImperativeAPI) => {
			try {
				onExcalidrawAPI(api);
				const current = sceneRef.current;
				if (current) {
					// Defer to microtask + rAF to avoid flushSync during render
					Promise.resolve().then(() => {
						try {
							requestAnimationFrame(() => {
								try {
									(
										api as unknown as {
											updateScene?: (s: Record<string, unknown>) => void;
										}
									)?.updateScene?.({
										...current,
										appState: {
											...(current.appState || {}),
											viewModeEnabled: false,
											zenModeEnabled: false,
											theme: resolvedTheme === "dark" ? "dark" : "light",
										},
									});
									console.log("[Documents] ✅ Applied scene on API ready");
								} catch {}
							});
						} catch {}
					});
				}
			} catch {}
		},
		[onExcalidrawAPI, resolvedTheme]
	);

	// Persist name/age immediately on commit with toast (skip when default doc)
	const prevByWaRef = useRef<Map<string, { name: string; age: number | null }>>(new Map());
	const persistInFlightRef = useRef<{
		waId: string;
		name: string;
		age: number | null;
	} | null>(null);

	const persistRow = useCallback(
		async (triggeredBy?: "name" | "age" | "phone") => {
			try {
				if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) return;
				const ds = customerDataSource as IDataSource;
				const nameCol = customerColumns.findIndex((c) => c.id === "name");
				const ageCol = customerColumns.findIndex((c) => c.id === "age");
				const [nameVal, ageVal] = await Promise.all([ds.getCellData(nameCol, 0), ds.getCellData(ageCol, 0)]);
				const name = (nameVal as string) || "";
				const age = (ageVal as number | null) ?? null;

				console.log(
					`[Documents] 💾 persistRow called: triggeredBy=${triggeredBy}, waId=${waId}, name=${name}, age=${age}`
				);

				// If this was a phone-only edit, show a notification but avoid PUT (API doesn't accept phone here)
				if (triggeredBy === "phone") {
					console.log("[Documents] 📞 Phone-only edit, showing toast without PUT");
					toastService.success(i18n.getMessage("saved", isLocalized));
					return;
				}

				const prev = prevByWaRef.current.get(waId);
				const changed = !prev || prev.name !== name || prev.age !== age;

				console.log(`[Documents] 🔍 Change check: prev=${JSON.stringify(prev)}, changed=${changed}`);

				if (!changed) {
					// Nothing changed; still show a small success if user committed
					console.log("[Documents] ✅ No changes detected, showing success toast");
					toastService.success(
						triggeredBy === "age" ? i18n.getMessage("age_recorded", isLocalized) : i18n.getMessage("saved", isLocalized)
					);
					return;
				}

				// In-flight guard: prevent duplicate PUTs for identical payload
				const currentSig = { waId, name, age } as const;
				const inflight = persistInFlightRef.current;
				if (
					inflight &&
					inflight.waId === currentSig.waId &&
					inflight.name === currentSig.name &&
					inflight.age === currentSig.age
				) {
					console.log("[Documents] 🔄 Identical request in-flight, skipping");
					return;
				}

				console.log(`[Documents] 🚀 Sending PUT request: waId=${waId}, name=${name}, age=${age}`);
				persistInFlightRef.current = { waId, name, age };
				await toastService.promise(saveCustomerDocument({ waId, name, age }), {
					loading: i18n.getMessage("saving", isLocalized),
					success: () => i18n.getMessage(triggeredBy === "age" ? "age_recorded" : "saved", isLocalized),
					error: () => i18n.getMessage("save_failed", isLocalized),
				});
				console.log(`[Documents] ✅ PUT completed successfully for waId=${waId}`);
				// Update last persisted snapshot
				prevByWaRef.current.set(waId, { name, age });
				persistInFlightRef.current = null;
			} catch {}
		},
		[customerColumns, customerDataSource, waId, isLocalized]
	);

	// Wire provider events: fetch initial row (hook) and detect commits
	const handleProviderReady = useCallback(
		async (provider: unknown) => {
			try {
				console.log("[Documents] 📋 Grid provider ready, loading customer data");
				providerRef.current = provider as DataProvider;
				// Prefill row with name/age for current waId
				await onDataProviderReadyFromHook(provider);
				console.log("[Documents] 📋 Customer data loaded, checking unlock status");
				await recomputeUnlock();
				// Attach commit-like hook
				try {
					(
						providerRef.current as unknown as {
							setOnCellDataLoaded?: (cb: (c: number, r: number) => void) => void;
						}
					)?.setOnCellDataLoaded?.(((colIdx: number, rowIdx: number) => {
						try {
							const column = (providerRef.current as DataProvider).getColumnDefinition(colIdx);
							if (!column) return;
							if (rowIdx !== 0) return; // single-row grid
							// Update unlock state after any change (no persistence here; UI edits persist via doc:persist)
							// Guard: ignore provider-applied loads for a brief window after waId change
							if ((globalThis as unknown as { __docIgnoreProviderLoad?: number }).__docIgnoreProviderLoad) {
								console.log("[Documents] ⏭️ Ignoring cell change (guard active)");
								return;
							}
							console.log(`[Documents] 📝 Cell changed: col=${colIdx}, triggering unlock check`);
							void recomputeUnlock();
							// Removed: persistRow on provider data loaded to avoid duplicate PUTs
						} catch {}
					}) as unknown as (c: number, r: number) => void);
				} catch {}
			} catch {}
		},
		[onDataProviderReadyFromHook, recomputeUnlock]
	);

	// Listen for explicit persist triggers from the grid (name/phone/age edited)
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as { field?: string };
				const f = String(detail?.field || "");

				console.log(`[Documents] 📥 Received doc:persist event: field=${f}`);

				// Ignore transient provider-applied changes immediately after switching user
				if (Date.now() < ignorePersistUntilRef.current) {
					console.log("[Documents] ⏭️ Ignoring persist (user switch guard)");
					return;
				}

				// Ignore programmatic grid writes that set a suppression flag
				try {
					const suppressUntil = (globalThis as unknown as { __docSuppressPersistUntil?: number })
						.__docSuppressPersistUntil;
					if (typeof suppressUntil === "number" && Date.now() < suppressUntil) {
						console.log("[Documents] 🔇 Ignoring persist (suppression flag)");
						return;
					}
				} catch {}

				if (f === "age" || f === "name" || f === "phone") {
					console.log(`[Documents] ⏲️ Debouncing persist for field=${f}`);
					if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
					persistTimerRef.current = window.setTimeout(() => {
						try {
							// Preserve which field triggered the persist for accurate toast messaging
							void persistRow(f as unknown as "name" | "age" | "phone");
						} catch {}
					}, 280);
				}
			} catch {}
		};
		window.addEventListener("doc:persist", handler as EventListener);
		return () => window.removeEventListener("doc:persist", handler as EventListener);
	}, [persistRow]);

	// Clear action (UI-only): reset grid row and scene, lock until new input
	const handleClear = useCallback(async () => {
		try {
			const ds = customerDataSource as IDataSource;
			const nameCol = customerColumns.findIndex((c) => c.id === "name");
			const ageCol = customerColumns.findIndex((c) => c.id === "age");
			const phoneCol = customerColumns.findIndex((c) => c.id === "phone");
			// Clear editing state through provider to ensure grid immediately reflects
			try {
				providerRef.current?.setOnCellDataLoaded?.(() => {});
			} catch {}
			await ds.setCellData(nameCol, 0, "");
			await ds.setCellData(ageCol, 0, null);
			await ds.setCellData(phoneCol, 0, "");
			// Set guard to ignore provider-applied loads for the next tick
			try {
				(globalThis as unknown as { __docIgnoreProviderLoad?: number }).__docIgnoreProviderLoad = Date.now() + 500;
				setTimeout(() => {
					try {
						delete (globalThis as unknown as { __docIgnoreProviderLoad?: number }).__docIgnoreProviderLoad;
					} catch {}
				}, 600);
			} catch {}
			// Reset to default document and mark as pending initial load
			console.log("[Documents] 🗑️ Clearing document, resetting to default");
			pendingInitialLoadWaIdRef.current = DEFAULT_DOCUMENT_WA_ID;
			// Reset viewer camera tracking when clearing
			lastViewerCameraSigRef.current = "";
			viewerCameraRef.current = {};
			setWaId(DEFAULT_DOCUMENT_WA_ID);
			setScene(toSceneFromDoc(null));
			setLiveScene(null); // Clear live viewer scene
			setIsUnlocked(false);
		} catch {}
	}, [customerColumns, customerDataSource]);

	// Fullscreen handling for the whole work area (grid + both canvases)
	useEffect(() => {
		const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
		document.addEventListener("fullscreenchange", onFs);
		return () => document.removeEventListener("fullscreenchange", onFs);
	}, []);
	const enterFullscreen = useCallback(() => {
		try {
			const el = fsContainerRef.current;
			if (!el) return;
			if (document.fullscreenElement) return;
			void el.requestFullscreen?.();
		} catch {}
	}, []);
	const exitFullscreen = useCallback(() => {
		try {
			if (!document.fullscreenElement) return;
			void document.exitFullscreen?.();
		} catch {}
	}, []);

	const themeMode = useMemo<"light" | "dark">(() => {
		return (resolvedTheme === "dark" ? "dark" : "light") as "light" | "dark";
	}, [resolvedTheme]);

	// Defer Grid import to client to avoid SSR window references inside the library
	const ClientGrid = useMemo(
		() =>
			dynamic(() => import("@/shared/libs/data-grid/components/Grid"), {
				ssr: false,
			}),
		[]
	);

	return (
		<SidebarInset>
			<div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-1">
				{/* Header spacer (calendar icon exists elsewhere) */}
				<div className="flex items-center justify-end gap-2" />

				{/* Work area: grid + canvases */}
				<div
					ref={fsContainerRef}
					className={`flex-1 rounded-lg border border-border/50 bg-card/50 p-2 ${isFullscreen ? "p-0 rounded-none border-0" : ""}`}
				>
					<div
						className="flex flex-col gap-2 min-h-0"
						style={{ height: isFullscreen ? "100vh" : "calc(100vh - 6.5rem)" }}
					>
						{/* Top: customer grid */}
						<div className="rounded-md border border-border/50 bg-background/60 p-1 w-full flex-shrink-0">
							<FullscreenProvider>
								<ClientGrid
									showThemeToggle={false}
									dataSource={customerDataSource as unknown as IDataSource}
									onDataProviderReady={handleProviderReady}
									validationErrors={validationErrors}
									onAddRowOverride={handleClear}
									fullWidth={true}
									hideAppendRowPlaceholder={true}
									rowMarkers="none"
									disableTrailingRow={true}
									loading={customerLoading}
									className="min-h-[64px] w-full"
									documentsGrid={true}
								/>
							</FullscreenProvider>
						</div>

						{/* Below: dual canvases */}
						<div className="flex-1 flex flex-col gap-2 min-h-0">
							{/* Viewer (top, ~150px) - real-time mirror of editor with independent camera */}
							<div className="relative rounded-md border border-border/50 bg-card/40 overflow-hidden viewer-canvas-container h-[150px] flex-shrink-0">
								<style>
									{`
										.viewer-canvas-container .excalidraw-modal,
										.viewer-canvas-container .welcome-screen-center,
										.viewer-canvas-container .zen-mode-transition,
										.viewer-canvas-container button[title*="Exit"],
										.viewer-canvas-container button[aria-label*="Exit"],
										.viewer-canvas-container button[title*="exit"],
										.viewer-canvas-container button[aria-label*="exit"],
										.viewer-canvas-container .zen-mode-transition-container,
										.viewer-canvas-container .disable-zen-mode,
										.viewer-canvas-container [class*="zen-mode"],
										.viewer-canvas-container [class*="fullscreen"] {
											display: none !important;
										}
										/* Allow panning/zooming but keep it read-only */
										.viewer-canvas-container .excalidraw {
											cursor: grab !important;
										}
										.viewer-canvas-container .excalidraw:active {
											cursor: grabbing !important;
										}
									`}
								</style>
								<DocumentCanvas
									theme={themeMode}
									langCode={locale || "en"}
									onChange={handleViewerCanvasChange as unknown as ExcalidrawProps["onChange"]}
									onApiReady={() => {}}
									{...(liveScene ? { scene: liveScene } : {})}
									viewModeEnabled={true}
									zenModeEnabled={true}
									scrollable={false}
									forceLTR={true}
									hideToolbar={true}
									hideHelpIcon={true}
									uiOptions={{
										canvasActions: {
											toggleTheme: false,
											export: false,
											saveAsImage: false,
											clearCanvas: false,
											loadScene: false,
											saveToActiveFile: false,
										},
									}}
								/>
								{/* Saving indicator overlay */}
								<div className="pointer-events-none absolute right-2 top-2 z-[5]">
									<DocumentSavingIndicator status={saveStatus} loading={loading} />
								</div>
								{/* Lock overlay when not unlocked (viewer - no message) */}
								{(loading || !isUnlocked) && (
									<div className="absolute inset-0 z-[4] flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
										<div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2 text-sm text-muted-foreground shadow">
											<Lock className="size-4 opacity-70" />
										</div>
									</div>
								)}
							</div>

							{/* Editor (bottom, flex-fill) */}
							<div
								className={`relative flex-1 min-h-0 ${isFullscreen ? "rounded-none border-0" : "rounded-md border border-border/50"} bg-card/40 overflow-hidden flex flex-col`}
							>
								<DocumentCanvas
									theme={themeMode}
									langCode={locale || "en"}
									onChange={handleCanvasChange as unknown as ExcalidrawProps["onChange"]}
									onApiReady={onApiReadyWithApply}
									{...(scene ? { scene } : {})}
									viewModeEnabled={false}
									zenModeEnabled={false}
									scrollable={false}
									forceLTR={true}
									hideHelpIcon={true}
								/>

								{/* Lock overlay when not unlocked; show loading when busy */}
								{(loading || !isUnlocked) && (
									<DocumentLockOverlay
										message={
											!isUnlocked
												? i18n.getMessage("document_unlock_prompt", isLocalized)
												: i18n.getMessage("document_loading", isLocalized)
										}
									/>
								)}
								{/* Fullscreen toggle button (theme-aware container) */}
								<div className="absolute bottom-2 right-2 z-[5]">
									<div className="rounded-md border border-border bg-card/90 text-foreground shadow-sm backdrop-blur px-1.5 py-1">
										{isFullscreen ? (
											<button
												type="button"
												className="excalidraw-fullscreen-button"
												onClick={exitFullscreen}
												aria-label="Exit fullscreen"
											>
												<Minimize2 className="size-4" />
											</button>
										) : (
											<button
												type="button"
												className="excalidraw-fullscreen-button"
												onClick={enterFullscreen}
												aria-label="Enter fullscreen"
											>
												<Maximize2 className="size-4" />
											</button>
										)}
									</div>
								</div>
							</div>
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
