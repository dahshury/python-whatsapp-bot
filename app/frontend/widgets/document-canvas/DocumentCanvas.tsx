"use client";

import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import dynamic from "next/dynamic";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeSceneSignature } from "@/shared/libs/documents/scene-utils";

type ExcalidrawAPI = ExcalidrawImperativeAPI;

const Excalidraw = dynamic<ExcalidrawProps>(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
	ssr: false,
});

// Gate extra refresh/stabilization bursts behind an env flag (disabled by default)
const ENABLE_EXTRAREFRESH = typeof process !== "undefined" && process.env.NEXT_PUBLIC_DOCS_EXCALI_EXTRA_REFRESH === "1";

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
	const prevDirRef = useRef<string | null>(null);
	const pointerActiveRef = useRef<boolean>(false);

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
		try {
			// Use startTransition to mark this update as non-urgent and avoid warning
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
		} catch {
			setTimeout(() => {
				startTransition(() => {
					try {
						const els = (lastElementsRef.current || elements) as OnChangeArgs[0];
						const app = (lastAppStateRef.current || appState) as OnChangeArgs[1];
						const bin = (lastFilesRef.current || files) as OnChangeArgs[2];
						userOnChangeRef.current?.(els, app, bin);
					} catch {}
				});
			}, 0);
		}
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

	// Wait until container has a non-zero size AND theme class matches to mount Excalidraw
	useEffect(() => {
		let raf = 0;
		let attempts = 0;
		const tick = () => {
			attempts += 1;
			try {
				const rect = containerRef.current?.getBoundingClientRect?.();
				let themeMatches = true;
				try {
					const wantsDark = theme === "dark";
					const hasDark = document.documentElement.classList.contains("dark");
					themeMatches = wantsDark === hasDark;
				} catch {}
				if (rect && rect.width > 2 && rect.height > 2 && themeMatches) {
					setMountReady(true);
					return;
				}
			} catch {}
			if (attempts < 60) {
				raf = requestAnimationFrame(tick);
			} else {
				// Fallback: proceed anyway and let refresh() correct the size later
				setMountReady(true);
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [theme]);

	// Keep canvas sized when container/viewport changes
	useExcalidrawResize(containerRef, apiRef);

	// Track active pointer/touch gestures to avoid racing our refresh bursts with internal updates
	useEffect(() => {
		let touchCount = 0;
		const onDown = () => {
			pointerActiveRef.current = true;
		};
		const onUp = () => {
			setTimeout(() => {
				if (touchCount === 0) {
					pointerActiveRef.current = false;
				}
			}, 120);
		};
		const onTouchStart = (e: TouchEvent) => {
			touchCount = e.touches.length;
			if (touchCount > 0) {
				pointerActiveRef.current = true;
			}
		};
		const onTouchEnd = (e: TouchEvent) => {
			touchCount = e.touches.length;
			setTimeout(() => {
				if (touchCount === 0) {
					pointerActiveRef.current = false;
				}
			}, 120);
		};
		const onTouchCancel = () => {
			touchCount = 0;
			setTimeout(() => {
				pointerActiveRef.current = false;
			}, 120);
		};
		window.addEventListener("pointerdown", onDown, true);
		window.addEventListener("pointerup", onUp, true);
		window.addEventListener("touchstart", onTouchStart, {
			passive: true,
			capture: true,
		});
		window.addEventListener("touchend", onTouchEnd, {
			passive: true,
			capture: true,
		});
		window.addEventListener("touchcancel", onTouchCancel, {
			passive: true,
			capture: true,
		});
		return () => {
			window.removeEventListener("pointerdown", onDown, true);
			window.removeEventListener("pointerup", onUp, true);
			window.removeEventListener("touchstart", onTouchStart as EventListener, true);
			window.removeEventListener("touchend", onTouchEnd as EventListener, true);
			window.removeEventListener("touchcancel", onTouchCancel, true);
		};
	}, []);

	// Verify canvas fills container (disabled by default; rely on ResizeObserver sizing)
	useEffect(() => {
		if (!ENABLE_EXTRAREFRESH) return;
		if (!mountReady) return;
		let timer: number | null = null;
		const verifyAndFix = () => {
			try {
				const root = containerRef.current?.querySelector(".excalidraw .canvas-container") as HTMLElement | null;
				const canvas = containerRef.current?.querySelector(
					"canvas.excalidraw__canvas.interactive"
				) as HTMLCanvasElement | null;
				if (!root || !canvas) return false;
				const cw = Math.floor(root.clientWidth || 0);
				const ch = Math.floor(root.clientHeight || 0);
				if (cw <= 1 || ch <= 1) return false;
				const rect = canvas.getBoundingClientRect();
				const sw = Math.floor(rect.width || 0);
				const sh = Math.floor(rect.height || 0);
				if (Math.abs(cw - sw) > 1 || Math.abs(ch - sh) > 1) {
					try {
						requestAnimationFrame(() => apiRef.current?.refresh?.());
					} catch {
						apiRef.current?.refresh?.();
					}
					return true;
				}
			} catch {}
			return false;
		};
		const runBurst = () => {
			try {
				const needsMore = verifyAndFix();
				if (needsMore) timer = window.setTimeout(runBurst, 120);
			} catch {}
		};
		setTimeout(() => {
			if (verifyAndFix()) runBurst();
		}, 16);
		return () => {
			if (timer) window.clearTimeout(timer);
		};
	}, [mountReady]);

	// Extra stabilization refreshes (disabled by default; enable only for rare cases)
	useEffect(() => {
		if (!ENABLE_EXTRAREFRESH) return;
		let scheduled = false;
		const scheduleRefresh = () => {
			if (scheduled) return;
			scheduled = true;
			try {
				requestAnimationFrame(() => {
					if (!pointerActiveRef.current) apiRef.current?.refresh?.();
					scheduled = false;
				});
			} catch {
				scheduled = false;
			}
		};
		const onContextMenu = () => scheduleRefresh();
		const onVisibility = () => {
			if (!document.hidden) scheduleRefresh();
		};
		document.addEventListener("contextmenu", onContextMenu, true);
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			document.removeEventListener("contextmenu", onContextMenu, true);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, []);

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
			try {
				console.log(
					`[DocumentCanvas] 🔄 external scene prop: elements=${Array.isArray(scene.elements) ? (scene.elements as unknown[]).length : 0}, sig=${(nextSig || "").slice(0, 8)}`
				);
			} catch {}
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
					try {
						console.log(
							`[DocumentCanvas] ✅ applied scene: elements=${Array.isArray(scene.elements) ? (scene.elements as unknown[]).length : 0}, sig=${(nextSig || "").slice(0, 8)}`
						);
					} catch {}
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

	// Force theme and view/zen modes so external scene updates can't re-enable editing
	useEffect(() => {
		try {
			if (!apiRef.current) return;
			const apiLike = apiRef.current as unknown as {
				updateScene?: (s: Record<string, unknown>) => void;
			} | null;
			requestAnimationFrame(() => {
				apiLike?.updateScene?.({
					appState: {
						theme,
						viewModeEnabled: Boolean(viewModeEnabled),
						zenModeEnabled: Boolean(zenModeEnabled),
					},
				});
			});
		} catch {}
	}, [theme, viewModeEnabled, zenModeEnabled]);

	// Force LTR direction for Excalidraw even when using RTL languages
	useEffect(() => {
		if (!forceLTR) return () => {};
		try {
			const root = document.documentElement;
			if (prevDirRef.current === null) prevDirRef.current = root.getAttribute("dir");
			root.setAttribute("dir", "ltr");
			const observer = new MutationObserver(() => {
				try {
					const curr = root.getAttribute("dir") || "";
					if (curr.toLowerCase() !== "ltr") root.setAttribute("dir", "ltr");
				} catch {}
			});
			observer.observe(root, { attributes: true, attributeFilter: ["dir"] });
			return () => {
				try {
					observer.disconnect();
					if (prevDirRef.current === null || prevDirRef.current === undefined) {
						root.removeAttribute("dir");
					} else {
						root.setAttribute("dir", String(prevDirRef.current));
					}
				} catch {}
			};
		} catch {
			return () => {};
		}
	}, [forceLTR]);

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
							// Apply initial theme/view/zen state via updateScene to avoid mount-time setState
							Promise.resolve().then(() => {
								try {
									requestAnimationFrame(() => {
										try {
											(
												api as unknown as {
													updateScene?: (s: Record<string, unknown>) => void;
												}
											)?.updateScene?.({
												appState: {
													viewModeEnabled: Boolean(viewModeEnabled),
													zenModeEnabled: Boolean(zenModeEnabled),
													theme,
												},
											});
										} catch {}
										// Now notify parent onApiReady after initial state is applied
										setTimeout(() => {
											try {
												onApiReady(api);
											} catch {}
										}, 0);
									});
								} catch {
									setTimeout(() => onApiReady(api), 0);
								}
							});
						}
					}}
				/>
			)}
		</div>
	);
}

export const DocumentCanvas = memo(DocumentCanvasComponent);

// Keep Excalidraw sized on container/viewport changes
export function useExcalidrawResize(
	container: React.RefObject<HTMLElement | null>,
	apiRef: React.RefObject<ExcalidrawAPI | null>
) {
	useEffect(() => {
		if (!container?.current) return;
		let scheduled = false;
		const refresh = () => {
			if (scheduled) return;
			scheduled = true;
			requestAnimationFrame(() => {
				try {
					apiRef.current?.refresh?.();
				} finally {
					scheduled = false;
				}
			});
		};
		const ro = new ResizeObserver(() => refresh());
		try {
			ro.observe(container.current as Element);
		} catch {}
		const onWin = () => refresh();
		window.addEventListener("resize", onWin);
		try {
			window.visualViewport?.addEventListener?.("resize", onWin);
		} catch {}
		return () => {
			try {
				ro.disconnect();
			} catch {}
			window.removeEventListener("resize", onWin);
			try {
				window.visualViewport?.removeEventListener?.("resize", onWin);
			} catch {}
		};
	}, [container, apiRef]);
}
