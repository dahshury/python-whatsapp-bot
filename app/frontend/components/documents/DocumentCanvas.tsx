"use client";

import type {
	ExcalidrawImperativeAPI,
	ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { computeSceneSignature } from "@/lib/documents/scene-utils";

type ExcalidrawAPI = ExcalidrawImperativeAPI;

const Excalidraw = dynamic<ExcalidrawProps>(
	async () => (await import("@excalidraw/excalidraw")).Excalidraw,
	{
		ssr: false,
	},
);

export function DocumentCanvas({
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

	// Wait until container has a non-zero size to mount Excalidraw to avoid 0px canvas
	useEffect(() => {
		let raf = 0;
		let attempts = 0;
		const tick = () => {
			attempts += 1;
			try {
				const rect = containerRef.current?.getBoundingClientRect?.();
				if (rect && rect.width > 2 && rect.height > 2) {
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
	}, []);

	// Keep canvas sized when container/viewport changes
	useExcalidrawResize(containerRef, apiRef);

	// Extra stabilization refreshes around context menu and page visibility
	useEffect(() => {
		let scheduled = false;
		const scheduleRefreshBurst = () => {
			if (scheduled) return;
			scheduled = true;
			try {
				const doRefresh = () => apiRef.current?.refresh?.();
				requestAnimationFrame(() => {
					doRefresh();
					setTimeout(doRefresh, 80);
					setTimeout(doRefresh, 160);
					setTimeout(() => {
						doRefresh();
						scheduled = false;
					}, 320);
				});
			} catch {
				scheduled = false;
			}
		};

		const onContextMenu = () => scheduleRefreshBurst();
		const onVisibility = () => {
			if (!document.hidden) scheduleRefreshBurst();
		};

		document.addEventListener("contextmenu", onContextMenu, true);
		document.addEventListener("visibilitychange", onVisibility);

		// Catch pointer interactions near edges and scrolling in ancestors
		const onPointerUp = () => scheduleRefreshBurst();
		const onScroll = () => scheduleRefreshBurst();
		window.addEventListener("pointerup", onPointerUp, true);
		window.addEventListener("scroll", onScroll, true);

		// Observe DOM changes inside the container that may affect layout (e.g., menu flip)
		const target = containerRef.current as HTMLElement | null;
		let observer: MutationObserver | null = null;
		try {
			if (target) {
				observer = new MutationObserver(() => scheduleRefreshBurst());
				observer.observe(target, {
					attributes: true,
					childList: true,
					subtree: true,
					attributeFilter: ["style", "class", "data-placement"],
				});
			}
		} catch {}
		return () => {
			document.removeEventListener("contextmenu", onContextMenu, true);
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("pointerup", onPointerUp, true);
			window.removeEventListener("scroll", onScroll, true);
			try {
				observer?.disconnect();
			} catch {}
		};
	}, []);

	// Apply external scene updates when provided, avoiding redundant updates
	useEffect(() => {
		try {
			if (!apiRef.current || !scene) return;
			const nextSig = computeSceneSignature(
				(scene.elements as unknown[]) || [],
				(scene.appState as Record<string, unknown>) || {},
				(scene.files as Record<string, unknown>) || {},
			);
			if (nextSig && nextSig === (lastAppliedSceneSigRef.current || null))
				return;
			// Cast to any to avoid coupling to Excalidraw internal element types
			(
				apiRef.current as unknown as {
					updateScene: (s: Record<string, unknown>) => void;
				}
			).updateScene(scene as Record<string, unknown>);
			lastAppliedSceneSigRef.current = nextSig;
		} catch {}
	}, [scene]);

	// Force LTR direction for Excalidraw even when using RTL languages
	useEffect(() => {
		if (!forceLTR) return () => {};
		try {
			const root = document.documentElement;
			if (prevDirRef.current === null)
				prevDirRef.current = root.getAttribute("dir");
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
			{hideHelpIcon ? (
				<style>{".excal-hide-help .help-icon{display:none!important;}"}</style>
			) : null}
			{mountReady && (
				<Excalidraw
					theme={theme}
					langCode={langCode as unknown as string}
					onChange={
						(onChange || ((): void => {})) as NonNullable<
							ExcalidrawProps["onChange"]
						>
					}
					{...(uiOptions ? { UIOptions: uiOptions } : {})}
					initialData={{
						appState: {
							viewModeEnabled: Boolean(viewModeEnabled),
							zenModeEnabled: Boolean(zenModeEnabled),
						},
					}}
					viewModeEnabled={Boolean(viewModeEnabled)}
					zenModeEnabled={Boolean(zenModeEnabled)}
					excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
						apiRef.current = api;
						try {
							// Initial refresh to compute correct canvas size
							const apiLike = apiRef.current as unknown as {
								refresh?: () => void;
							} | null;
							requestAnimationFrame(() => apiLike?.refresh?.());
							setTimeout(() => apiLike?.refresh?.(), 120);
							setTimeout(() => apiLike?.refresh?.(), 300);
							setTimeout(() => apiLike?.refresh?.(), 600);
						} catch {}
						if (!didNotifyApiRef.current) {
							didNotifyApiRef.current = true;
							onApiReady(api);
						}
					}}
				/>
			)}
		</div>
	);
}

// Keep Excalidraw sized on container/viewport changes
export function useExcalidrawResize(
	container: React.RefObject<HTMLElement | null>,
	apiRef: React.RefObject<ExcalidrawAPI | null>,
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
