"use client";

import type {
	ExcalidrawImperativeAPI,
	ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import dynamic from "next/dynamic";
import {
	memo,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { unstable_batchedUpdates } from "react-dom";

const LibraryManager = dynamic(
	() =>
		import("@/widgets/document-canvas/library-manager.client").then(
			(m) => m.LibraryManager
		),
	{ ssr: false }
);

type ExcalidrawAPI = ExcalidrawImperativeAPI;

const Excalidraw = dynamic<ExcalidrawProps>(
	async () => (await import("@excalidraw/excalidraw")).Excalidraw,
	{
		ssr: false,
	}
);

// Note: We rely on Excalidraw's internal resize/scroll handling and a single
// ResizeObserver in useExcalidrawResize. No extra verification or refresh bursts.

function applySceneUpdate(options: {
	api: unknown;
	sceneToApply: Record<string, unknown>;
	scene: { files?: Record<string, unknown> };
	nextSig: string;
	lastFileIdsRef: { current: Set<string> };
	lastAppliedSceneSigRef: { current: string | null };
}): void {
	const {
		api,
		sceneToApply,
		scene,
		nextSig,
		lastFileIdsRef,
		lastAppliedSceneSigRef,
	} = options;

	if (typeof requestAnimationFrame === "function") {
		requestAnimationFrame(() => {
			try {
				(
					api as unknown as {
						updateScene: (s: Record<string, unknown>) => void;
					}
				).updateScene(sceneToApply as Record<string, unknown>);
				// Ensure binary files are applied via official API (diff new files only)
				try {
					const files = (scene.files || {}) as Record<string, unknown>;
					const allIds = Object.keys(files);
					const prev = lastFileIdsRef.current;
					const newIds = allIds.filter((id) => !prev.has(id));
					if (newIds.length > 0) {
						const newFiles = newIds
							.map((id) => files[id])
							.filter(Boolean) as unknown[];
						(
							api as unknown as {
								addFiles?: (f: unknown[]) => void;
							}
						).addFiles?.(newFiles);
					}
					lastFileIdsRef.current = new Set(allIds);
				} catch {
					// Intentional: files may fail to apply
				}
				lastAppliedSceneSigRef.current = nextSig;
			} catch {
				// Intentional: scene update may fail
			}
		});
	} else {
		(
			api as unknown as {
				updateScene: (s: Record<string, unknown>) => void;
			}
		).updateScene(sceneToApply as Record<string, unknown>);
		try {
			const files = (scene.files || {}) as Record<string, unknown>;
			const allIds = Object.keys(files);
			const prev = lastFileIdsRef.current;
			const newIds = allIds.filter((id) => !prev.has(id));
			if (newIds.length > 0) {
				const newFiles = newIds
					.map((id) => files[id])
					.filter(Boolean) as unknown[];
				(
					api as unknown as {
						addFiles?: (f: unknown[]) => void;
					}
				).addFiles?.(newFiles);
			}
			lastFileIdsRef.current = new Set(allIds);
		} catch {
			// Intentional: files may fail to apply
		}
		lastAppliedSceneSigRef.current = nextSig;
	}
}

function computeSceneSignature(
	scene: { elements?: unknown[]; files?: Record<string, unknown> },
	getSceneVersionRef: { current: null | ((els: readonly unknown[]) => number) }
): string {
	try {
		const fn = getSceneVersionRef.current;
		if (fn) {
			const version = fn(
				((scene.elements as unknown[]) || []) as readonly unknown[]
			);
			const filesCount = Object.keys(
				(scene.files || {}) as Record<string, unknown>
			).length;
			return `${version}|files:${filesCount}`;
		}
	} catch {
		// Intentional: scene version calculation may fail
	}
	return "";
}

function buildScenePayload(
	scene: {
		appState?: Record<string, unknown>;
		elements?: unknown[];
		files?: Record<string, unknown>;
	},
	viewModeEnabled: boolean,
	zenModeEnabled: boolean
): Record<string, unknown> {
	return {
		...scene,
		appState: {
			...(scene.appState || {}),
			viewModeEnabled: Boolean(viewModeEnabled),
			zenModeEnabled: Boolean(zenModeEnabled),
		},
		// prevent history/store capture for viewer mirroring
		...(viewModeEnabled ? { captureUpdate: 2 } : {}),
	};
}

function DocumentCanvasComponent({
	theme,
	langCode,
	onChange,
	onScrollChange,
	onApiReady,
	viewModeEnabled,
	zenModeEnabled,
	uiOptions,
	scene,
	initialDataSource,
	initialSceneSig,
	scrollable,
	forceLTR,
	hideToolbar,
	hideHelpIcon,
	children,
	footerContent,
}: {
	theme: "light" | "dark";
	langCode: string;
	onChange?: ExcalidrawProps["onChange"];
	onScrollChange?: ExcalidrawProps["onScrollChange"];
	onApiReady: (api: ExcalidrawAPI) => void;
	viewModeEnabled?: boolean;
	zenModeEnabled?: boolean;
	uiOptions?: ExcalidrawProps["UIOptions"];
	scene?: {
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
	};
	initialDataSource?: Promise<Record<string, unknown> | null> | null;
	initialSceneSig?: string | null;
	scrollable?: boolean;
	forceLTR?: boolean;
	hideToolbar?: boolean;
	hideHelpIcon?: boolean;
	children?: ReactNode;
	footerContent?: ReactNode;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const apiRef = useRef<ExcalidrawAPI | null>(null);
	const [excalApi, setExcalApi] = useState<ExcalidrawAPI | null>(null);
	const [mountReady, setMountReady] = useState(false);
	const lastAppliedSceneSigRef = useRef<string | null>(null);
	const didNotifyApiRef = useRef<boolean>(false);
	const [slots, setSlots] = useState<null | {
		Footer?: React.ComponentType<Record<string, unknown>>;
	}>(null);

	// Lightweight scene version helper (loaded once client-side)
	const getSceneVersionRef = useRef<
		null | ((els: readonly unknown[]) => number)
	>(null);
	useEffect(() => {
		let active = true;
		(async () => {
			try {
				const mod = (await import("@excalidraw/excalidraw")) as unknown as {
					getSceneVersion?: (e: readonly unknown[]) => number;
					hashElementsVersion?: (e: readonly unknown[]) => number;
				};
				const fn =
					typeof mod.getSceneVersion === "function"
						? mod.getSceneVersion
						: (mod.hashElementsVersion as
								| ((e: readonly unknown[]) => number)
								| undefined);
				if (active && typeof fn === "function") {
					getSceneVersionRef.current = fn;
				}
			} catch {
				// Intentional: safe guard for dynamic import
			}
		})();
		return () => {
			active = false;
		};
	}, []);
	const lastFileIdsRef = useRef<Set<string>>(new Set());

	// Stable props to avoid unnecessary Excalidraw re-renders
	const noopOnChange = useCallback((): void => {
		// intentional noop
	}, []);
	const mergedOnChange = (onChange ||
		(noopOnChange as NonNullable<ExcalidrawProps["onChange"]>)) as NonNullable<
		ExcalidrawProps["onChange"]
	>;

	// Defer and coalesce onChange to the next animation frame to avoid scheduling
	// additional React transitions during Excalidraw's own update cycle
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
	const deferredOnChange = useCallback<OnChange>(
		(elements, appState, files) => {
			lastElementsRef.current = elements;
			lastAppStateRef.current = appState;
			lastFilesRef.current = files;
			if (rafOnChangeRef.current != null) {
				return;
			}
			// Coalesce to a single rAF and call the handler directly
			rafOnChangeRef.current = requestAnimationFrame(() => {
				rafOnChangeRef.current = null;
				try {
					const els = (lastElementsRef.current || elements) as OnChangeArgs[0];
					const app = (lastAppStateRef.current || appState) as OnChangeArgs[1];
					const bin = (lastFilesRef.current || files) as OnChangeArgs[2];
					unstable_batchedUpdates(() => {
						userOnChangeRef.current?.(els, app, bin);
					});
				} catch {
					// Intentional: onChange callback may fail
				}
			});
		},
		[]
	);
	useEffect(
		() => () => {
			if (rafOnChangeRef.current != null) {
				try {
					cancelAnimationFrame(rafOnChangeRef.current);
				} catch {
					// Intentional: cancel may fail
				}
				rafOnChangeRef.current = null;
			}
		},
		[]
	);

	// Seed last-applied signature from initial scene to avoid duplicate re-apply
	useEffect(() => {
		try {
			if (initialSceneSig) {
				lastAppliedSceneSigRef.current = initialSceneSig;
			}
		} catch {
			// Intentional: scene signature initialization may fail
		}
	}, [initialSceneSig]);

	// Notify parent and set local API state after commit to avoid scheduling
	// React state updates during Excalidraw's render/update cycle
	useEffect(() => {
		if (didNotifyApiRef.current) {
			return;
		}
		const api = apiRef.current;
		if (!api) {
			return;
		}
		setExcalApi(api);
		didNotifyApiRef.current = true;
		try {
			onApiReady(api);
		} catch {
			// Intentional: onApiReady callback may fail
		}
		// Prevent double-notify if React StrictMode mounts twice
		return () => {
			didNotifyApiRef.current = true;
		};
	}, [onApiReady]);

	// When provided, pass Promise-based initialData to Excalidraw to mount with content
	const initialData = useMemo(
		() => initialDataSource || ({} as Record<string, unknown>),
		[initialDataSource]
	);

	// Wait until container has a non-zero size to mount Excalidraw (single gate)
	useEffect(() => {
		const el = containerRef.current;
		if (!el) {
			return;
		}
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
				if (r && r.width > 2 && r.height > 2 && !resolved) {
					resolved = true;
					setMountReady(true);
					try {
						ro.disconnect();
					} catch {
						// Intentional: disconnect may fail
					}
				}
			} catch {
				// Intentional: observer callback may fail
			}
		});
		try {
			ro.observe(el as Element);
		} catch {
			// Intentional: observe may fail
		}
		return () => {
			try {
				ro.disconnect();
			} catch {
				// Intentional: disconnect may fail
			}
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
			if (!(apiRef.current && scene)) {
				return;
			}
			// Build lightweight signature: version + file-count
			const nextSig = computeSceneSignature(scene, getSceneVersionRef);
			// removed console logging
			if (nextSig && nextSig === (lastAppliedSceneSigRef.current || null)) {
				return;
			}
			// Build scene payload once
			const sceneToApply = buildScenePayload(
				scene,
				viewModeEnabled ?? false,
				zenModeEnabled ?? false
			);
			// Apply with a single requestAnimationFrame
			applySceneUpdate({
				api: apiRef.current,
				sceneToApply,
				scene,
				nextSig,
				lastFileIdsRef,
				lastAppliedSceneSigRef,
			});
		} catch {
			// Intentional: scene application may fail
		}
	}, [scene, viewModeEnabled, zenModeEnabled]);

	// Removed imperative forcing of theme/view/zen; controlled via component props

	// Removed global LTR enforcement; rely on container-level dir only

	// Ensure library installs return to this tab (set window.name once)
	useEffect(() => {
		try {
			if (typeof window !== "undefined" && !window.name) {
				window.name = "host-app";
			}
		} catch {
			// Intentional: window.name may fail
		}
	}, []);

	// Lazy-load Excalidraw slots (Footer, Sidebar, etc.) on client only
	useEffect(() => {
		let active = true;
		(async () => {
			try {
				const mod = (await import("@excalidraw/excalidraw")) as unknown as {
					Footer?: React.ComponentType<Record<string, unknown>>;
				};
				if (!active) {
					return;
				}
				if (mod.Footer) {
					setSlots({ Footer: mod.Footer });
				} else {
					setSlots({});
				}
			} catch {
				// Intentional: lazy loading may fail
			}
		})();
		return () => {
			active = false;
		};
	}, []);

	// (LibraryManager moved to top-level to satisfy lint rules)

	return (
		<div
			className={`excali-theme-scope w-full h-full${hideToolbar ? "excal-preview-hide-ui" : ""}${
				hideHelpIcon ? "excal-hide-help" : ""
			}`}
			dir={forceLTR ? "ltr" : undefined}
			ref={containerRef}
			style={{
				// Prevent scroll chaining into the canvas on touch devices so
				// the page can scroll back when keyboard toggles
				overflow: scrollable ? "auto" : "hidden",
				overscrollBehavior: "contain",
				touchAction: "manipulation",
				// NOTE: contain and willChange removed because they create a new containing block
				// that breaks position:fixed elements (like the eraser cursor shadow)
			}}
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
			) : (
				<style>{""}</style>
			)}
			{mountReady && (
				<Excalidraw
					langCode={langCode as unknown as string}
					onChange={deferredOnChange}
					theme={theme}
					{...(onScrollChange ? { onScrollChange } : {})}
					{...(uiOptions ? { UIOptions: uiOptions } : {})}
					excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
						// Store API ref and schedule a post-commit notification once
						apiRef.current = api;
						if (!didNotifyApiRef.current) {
							didNotifyApiRef.current = true;
							try {
								setExcalApi(api);
							} catch {
								// Intentional: setExcalApi may fail
							}
							try {
								onApiReady(api);
							} catch {
								// Intentional: onApiReady may fail
							}
						}
					}}
					// Return URL for libraries.excalidraw.com installs
					initialData={initialData}
					libraryReturnUrl={
						typeof window !== "undefined"
							? `${window.location.origin}${window.location.pathname}`
							: ""
					}
					viewModeEnabled={Boolean(viewModeEnabled)}
					zenModeEnabled={Boolean(zenModeEnabled)}
				>
					{/* Inject footer slot content if available */}
					{slots?.Footer && footerContent
						? (() => {
								const FooterComp = slots.Footer as React.ComponentType<
									Record<string, unknown>
								>;
								return <FooterComp>{footerContent}</FooterComp>;
							})()
						: null}
					{children}
				</Excalidraw>
			)}
			{excalApi ? <LibraryManager api={excalApi} /> : null}
		</div>
	);
}

export const DocumentCanvas = memo(DocumentCanvasComponent);

// Keep Excalidraw sized on container/viewport changes
// Removed useExcalidrawResize hook and .refresh usage; rely on Excalidraw's internals
