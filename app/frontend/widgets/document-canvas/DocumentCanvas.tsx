"use client";

import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import dynamic from "next/dynamic";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeSceneSignature } from "@/shared/libs/documents/scene-utils";

type ExcalidrawAPI = ExcalidrawImperativeAPI;

const Excalidraw = dynamic<ExcalidrawProps>(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
	ssr: false,
});

// Note: We rely on Excalidraw's internal resize/scroll handling and a single
// ResizeObserver in useExcalidrawResize. No extra verification or refresh bursts.

function DocumentCanvasComponent({
	theme,
	langCode,
	onChange,
	onApiReady,
	viewModeEnabled,
	zenModeEnabled,
	uiOptions,
	scene,
	scrollable,
	forceLTR,
	hideToolbar,
	hideHelpIcon,
}: {
	theme: "light" | "dark";
	langCode: string;
	onChange?: ExcalidrawProps["onChange"];
	onApiReady: (api: ExcalidrawAPI) => void;
	viewModeEnabled?: boolean;
	zenModeEnabled?: boolean;
	uiOptions?: ExcalidrawProps["UIOptions"];
	scene?: {
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
	};
	scrollable?: boolean;
	forceLTR?: boolean;
	hideToolbar?: boolean;
	hideHelpIcon?: boolean;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const apiRef = useRef<ExcalidrawAPI | null>(null);
	const [mountReady, setMountReady] = useState(false);
	const lastAppliedSceneSigRef = useRef<string | null>(null);
	const didNotifyApiRef = useRef<boolean>(false);

	// Stable props to avoid unnecessary Excalidraw re-renders
	const noopOnChange = useCallback(() => {}, []);
	const mergedOnChange = (onChange || (noopOnChange as NonNullable<ExcalidrawProps["onChange"]>)) as NonNullable<
		ExcalidrawProps["onChange"]
	>;

	// Defer and coalesce onChange to the next animation frame to avoid scheduling
	// state updates during Excalidraw's own render/update cycle
	type OnChange = NonNullable<ExcalidrawProps["onChange"]>;
	type OnChangeArgs = Parameters<OnChange>;
	const userOnChangeRef = useRef<OnChange>(mergedOnChange);
	useEffect(() => {
		userOnChangeRef.current = mergedOnChange;
	}, [mergedOnChange]);
	const lastElementsRef = useRef<OnChangeArgs[0] | null>(null);
	const lastAppStateRef = useRef<OnChangeArgs[1] | null>(null);
	const lastFilesRef = useRef<OnChangeArgs[2] | null>(null);
	const rafOnChangeRef = useRef<number | null>(null);
	const deferredOnChange = useCallback<OnChange>((elements, appState, files) => {
		lastElementsRef.current = elements;
		lastAppStateRef.current = appState;
		lastFilesRef.current = files;
		if (rafOnChangeRef.current != null) return;
		// Coalesce to a single rAF; do light work inside startTransition
		rafOnChangeRef.current = requestAnimationFrame(() => {
			rafOnChangeRef.current = null;
			startTransition(() => {
				try {
					const els = (lastElementsRef.current || elements) as OnChangeArgs[0];
					const app = (lastAppStateRef.current || appState) as OnChangeArgs[1];
					const bin = (lastFilesRef.current || files) as OnChangeArgs[2];
					userOnChangeRef.current?.(els, app, bin);
				} catch {}
			});
		});
	}, []);
	useEffect(() => {
		return () => {
			if (rafOnChangeRef.current != null) {
				try {
					cancelAnimationFrame(rafOnChangeRef.current);
				} catch {}
				rafOnChangeRef.current = null;
			}
		};
	}, []);

	// Don't pass initialData to avoid setState during mount; set via onApiReady instead
	const initialData = useMemo(() => ({}), []);

	// Wait until container has a non-zero size to mount Excalidraw (single gate)
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect?.();
		if (rect && rect.width > 2 && rect.height > 2) {
			setMountReady(true);
			return;
		}
		let resolved = false;
		const ro = new ResizeObserver((entries) => {
			try {
				const target = entries[0]?.target as HTMLElement | undefined;
				const r = target?.getBoundingClientRect?.();
				if (r && r.width > 2 && r.height > 2) {
					if (!resolved) {
						resolved = true;
						setMountReady(true);
						try {
							ro.disconnect();
						} catch {}
					}
				}
			} catch {}
		});
		try {
			ro.observe(el as Element);
		} catch {}
		return () => {
			try {
				ro.disconnect();
			} catch {}
		};
	}, []);

	// Excalidraw handles resize/scroll internally; no manual refresh needed

	// Removed global pointer/touch listeners to avoid wide event overhead (Finding #2)

	// Removed manual DOM verification and refresh bursts. Rely on ResizeObserver.

	// Removed extra stabilization refreshes and global listeners.

	// Theme changes are applied via updateScene in a separate effect

	// Apply external scene updates when provided, avoiding redundant updates
	useEffect(() => {
		try {
			if (!apiRef.current || !scene) return;
			const nextSig = computeSceneSignature(
				(scene.elements as unknown[]) || [],
				(scene.appState as Record<string, unknown>) || {},
				(scene.files as Record<string, unknown>) || {}
			);
			// removed console logging
			if (nextSig && nextSig === (lastAppliedSceneSigRef.current || null)) return;
			// Cast to any to avoid coupling to Excalidraw internal element types
			const doUpdate = () => {
				try {
					// Preserve viewModeEnabled and zenModeEnabled when updating scene
					const sceneToApply = {
						...scene,
						appState: {
							...(scene.appState || {}),
							viewModeEnabled: Boolean(viewModeEnabled),
							zenModeEnabled: Boolean(zenModeEnabled),
						},
					};
					// Defer update to avoid flushSync inside lifecycle
					Promise.resolve().then(() => {
						try {
							requestAnimationFrame(() => {
								try {
									(
										apiRef.current as unknown as {
											updateScene: (s: Record<string, unknown>) => void;
										}
									).updateScene(sceneToApply as Record<string, unknown>);
									// Ensure binary files are applied via official API
									try {
										const files = (scene.files || {}) as Record<string, unknown>;
										const vals = Object.values(files);
										if (vals.length > 0) {
											(
												apiRef.current as unknown as {
													addFiles?: (f: unknown[]) => void;
												}
											).addFiles?.(vals as unknown[]);
										}
									} catch {}
								} catch {}
							});
						} catch {}
					});
					lastAppliedSceneSigRef.current = nextSig;
					// removed console logging
				} catch {}
			};
			try {
				if (typeof requestAnimationFrame === "function") {
					requestAnimationFrame(() => {
						try {
							requestAnimationFrame(() => setTimeout(doUpdate, 0));
						} catch {
							setTimeout(doUpdate, 0);
						}
					});
				} else {
					setTimeout(doUpdate, 0);
				}
			} catch {
				setTimeout(doUpdate, 0);
			}
		} catch {}
	}, [scene, viewModeEnabled, zenModeEnabled]);

	// Removed imperative forcing of theme/view/zen; controlled via component props

	// Removed global LTR enforcement; rely on container-level dir only

	return (
		<div
			ref={containerRef}
			className={`excali-theme-scope w-full h-full${hideToolbar ? " excal-preview-hide-ui" : ""}${hideHelpIcon ? " excal-hide-help" : ""}`}
			style={{
				// Prevent scroll chaining into the canvas on touch devices so
				// the page can scroll back when keyboard toggles
				overflow: scrollable ? "auto" : "hidden",
				overscrollBehavior: "contain",
				touchAction: "manipulation",
				// NOTE: contain and willChange removed because they create a new containing block
				// that breaks position:fixed elements (like the eraser cursor shadow)
			}}
			dir={forceLTR ? "ltr" : undefined}
		>
			{hideToolbar ? (
				<style>
					{
						".excal-preview-hide-ui .App-toolbar{display:none!important;}\n.excal-preview-hide-ui .App-toolbar-content{display:none!important;}\n.excal-preview-hide-ui .main-menu-trigger{display:none!important;}"
					}
				</style>
			) : null}
			{hideHelpIcon ? <style>{".excal-hide-help .help-icon{display:none!important;}"}</style> : <style>{""}</style>}
			{mountReady && (
				<Excalidraw
					theme={theme}
					langCode={langCode as unknown as string}
					onChange={deferredOnChange}
					{...(uiOptions ? { UIOptions: uiOptions } : {})}
					initialData={initialData}
					excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
						apiRef.current = api;
						if (!didNotifyApiRef.current) {
							didNotifyApiRef.current = true;
							// Directly notify parent when API is ready; props control view/zen/theme
							try {
								onApiReady(api);
							} catch {}
						}
					}}
					viewModeEnabled={Boolean(viewModeEnabled)}
					zenModeEnabled={Boolean(zenModeEnabled)}
				/>
			)}
		</div>
	);
}

export const DocumentCanvas = memo(DocumentCanvasComponent);

// Keep Excalidraw sized on container/viewport changes
// Removed useExcalidrawResize hook and .refresh usage; rely on Excalidraw's internals
