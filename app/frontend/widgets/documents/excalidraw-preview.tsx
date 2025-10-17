"use client";

import type {
	AppState,
	ExcalidrawImperativeAPI,
	ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import { Pencil, X } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useRef, useState } from "react";
import { cn } from "@/shared/libs/utils";
import { Button } from "@/shared/ui/button";

// Dynamic import for Excalidraw to avoid SSR issues
const Excalidraw = dynamic<ExcalidrawProps>(
	async () => (await import("@excalidraw/excalidraw")).Excalidraw,
	{ ssr: false }
);

type ExcalidrawPreviewEditorProps = {
	value: unknown;
	onChange: (value: unknown) => void;
	theme?: "light" | "dark";
	className?: string;
	previewHeight?: number;
	editorHeight?: number;
};

export function ExcalidrawPreviewEditor({
	value,
	onChange,
	theme = "light",
	className,
	previewHeight = 200,
	editorHeight = 400,
}: ExcalidrawPreviewEditorProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [previewSvg, setPreviewSvg] = useState<string | null>(null);
	const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
	const [mounted, setMounted] = useState(false);

	const generatePreviewSvg = useCallback(
		async (sceneData: unknown) => {
			try {
				const scene = sceneData as {
					data?: {
						scene?: {
							elements?: unknown[];
							appState?: unknown;
							files?: unknown;
						};
					};
				};
				const sceneObject = scene.data?.scene;
				if (!sceneObject) {
					return;
				}

				const mod = await import("@excalidraw/excalidraw");
				const svg = await (
					mod as unknown as {
						exportToSvg: (opts: {
							elements: readonly unknown[];
							appState: Partial<AppState> & {
								width?: number;
								height?: number;
							};
							files: Record<string, unknown>;
						}) => Promise<SVGSVGElement>;
					}
				).exportToSvg({
					elements: (sceneObject.elements || []) as readonly unknown[],
					appState: {
						...(sceneObject.appState || {}),
						width: 300,
						height: 200,
						viewBackgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
					},
					files: (sceneObject.files || {}) as Record<string, unknown>,
				});

				const serializer = new XMLSerializer();
				const svgString = serializer.serializeToString(svg);
				const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
				setPreviewSvg(dataUrl);
			} catch {
				// SVG generation failed, continue without preview
			}
		},
		[theme]
	);

	React.useEffect(() => {
		setMounted(true);
		// Generate preview SVG if value exists
		if (value && typeof value === "object" && "data" in value) {
			generatePreviewSvg(value).catch(() => {
				// Error handled in generatePreviewSvg
			});
		}
	}, [value, generatePreviewSvg]);

	const handleExcalidrawChange = useCallback(
		(elements: unknown, appState: unknown, files: unknown) => {
			const updatedValue = {
				data: {
					scene: { elements, appState, files },
				},
			};
			onChange(updatedValue);
			// Generate preview for display
			generatePreviewSvg(updatedValue).catch(() => {
				// Error handled in generatePreviewSvg
			});
		},
		[onChange, generatePreviewSvg]
	);

	const handleClose = useCallback(() => {
		setIsEditing(false);
	}, []);

	if (!mounted) {
		return <div className="h-32 rounded-md bg-muted/50" />;
	}

	if (isEditing) {
		return (
			<div
				className={cn(
					"relative w-full rounded-md border border-border",
					className
				)}
			>
				{/* Close button */}
				<button
					aria-label="Close editor"
					className="absolute top-2 right-2 z-50 rounded-md p-2 transition-colors hover:bg-muted"
					onClick={handleClose}
					type="button"
				>
					<X className="h-5 w-5" />
				</button>

				{/* Excalidraw Editor */}
				<div style={{ height: `${editorHeight}px`, width: "100%" }}>
					<Excalidraw
						excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
							apiRef.current = api;
						}}
						initialData={() => {
							if (value && typeof value === "object" && "data" in value) {
								const sceneData = (
									value as {
										data?: { scene?: unknown };
									}
								).data?.scene;
								if (sceneData) {
									return sceneData as Record<string, unknown>;
								}
							}
							return null;
						}}
						onChange={(elements, appState, files) => {
							handleExcalidrawChange(elements, appState, files);
						}}
						UIOptions={{
							canvasActions: {
								toggleTheme: false,
								export: false,
								saveAsImage: false,
								clearCanvas: false,
								loadScene: false,
								saveToActiveFile: false,
							},
						}}
						viewModeEnabled={false}
						zenModeEnabled={false}
					>
						<style>
							{
								".excalidraw .App-toolbar, .excalidraw .App-toolbar-content, .excalidraw .layer-ui__wrapper, .excalidraw .help-icon, .excalidraw .zen-mode-transition.App-menu_bottom, .excalidraw .library-menu { display: none !important; }"
							}
						</style>
					</Excalidraw>
				</div>
			</div>
		);
	}

	// Preview mode
	return (
		<button
			aria-label="Click to edit sketch"
			className={cn(
				"group relative w-full overflow-hidden rounded-md border border-border bg-muted/50 transition-colors hover:bg-muted/70",
				"cursor-pointer text-left",
				className
			)}
			onClick={() => {
				setIsEditing(true);
			}}
			style={{ height: `${previewHeight}px` }}
			type="button"
		>
			{/* Edit overlay on hover */}
			<div className="absolute inset-0 z-40 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
				<Button
					className="opacity-0 transition-opacity group-hover:opacity-100"
					onClick={(e) => {
						e.stopPropagation();
						setIsEditing(true);
					}}
					size="sm"
					type="button"
					variant="secondary"
				>
					<Pencil className="mr-2 h-4 w-4" />
					Edit
				</Button>
			</div>

			{/* Preview content */}
			{previewSvg ? (
				<picture>
					<source srcSet={previewSvg} type="image/svg+xml" />
					<div
						className="h-full w-full bg-center bg-no-repeat p-2"
						style={{
							backgroundImage: `url(${previewSvg})`,
							backgroundSize: "contain",
							pointerEvents: "none",
						}}
						title="Sketch preview"
					/>
				</picture>
			) : (
				<div className="flex h-full w-full items-center justify-center text-muted-foreground">
					<div className="text-center">
						<Pencil className="mx-auto mb-2 h-8 w-8 opacity-50" />
						<p className="text-sm">Click to add a sketch</p>
					</div>
				</div>
			)}
		</button>
	);
}
