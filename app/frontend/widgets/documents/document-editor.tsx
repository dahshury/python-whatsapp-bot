"use client";

import type {
	ExcalidrawImperativeAPI,
	ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import { Maximize2, Minimize2, Plus } from "lucide-react";
import type { FC } from "react";
import { ensureDocumentInitialized } from "@/shared/libs/documents";
import { i18n } from "@/shared/libs/i18n";
import { Z_INDEX } from "@/shared/libs/ui/z-index";
import { Button } from "@/shared/ui/button";
import { DocumentCanvas } from "@/widgets/document-canvas/document-canvas";
import { DocumentLockOverlay } from "@/widgets/documents/document-lock-overlay";
import { DocumentSavingIndicator } from "@/widgets/documents/document-saving-indicator";

type SceneLike = {
	elements?: unknown[];
	appState?: Record<string, unknown>;
	files?: Record<string, unknown>;
} | null;
// saving status for footer indicator
type SaveStatus =
	| { status: "idle" }
	| { status: "dirty" }
	| { status: "saving" }
	| { status: "saved"; at: number }
	| { status: "error"; message?: string };

export const DocumentEditor: FC<{
	theme: "light" | "dark";
	langCode: string;
	onChange: ExcalidrawProps["onChange"];
	onApiReady: (api: ExcalidrawImperativeAPI) => void;
	scene?: SceneLike;
	isUnlocked: boolean;
	loading?: boolean;
	isFullscreen: boolean;
	enterFullscreen: () => void;
	exitFullscreen: () => void;
	isLocalized: boolean;
	saveStatus: SaveStatus;
	waId?: string;
}> = ({
	theme,
	langCode,
	onChange,
	onApiReady,
	scene,
	isUnlocked,
	loading,
	isFullscreen,
	enterFullscreen,
	exitFullscreen,
	isLocalized,
	saveStatus,
	waId,
}) => {
	const showLockOverlay = Boolean(loading || !isUnlocked);
	const handleInitialize = async () => {
		try {
			const target = typeof waId === "string" && waId ? waId : undefined;
			if (target) {
				await ensureDocumentInitialized(target);
			}
		} catch {
			// Intentional: safely ignore errors during document initialization
		}
	};

	const renderContent = () => {
		if (showLockOverlay) {
			return (
				<DocumentCanvas
					langCode={langCode}
					onApiReady={onApiReady}
					onChange={onChange}
					theme={theme}
					{...(scene ? { scene } : {})}
					footerContent={
						<div
							style={{
								marginLeft: "0.5rem",
								position: "relative",
								zIndex: Z_INDEX.FULLSCREEN_CONTENT,
							}}
						>
							<DocumentSavingIndicator
								loading={!!loading}
								status={saveStatus}
							/>
						</div>
					}
					forceLTR={true}
					hideHelpIcon={true}
					scrollable={false}
					viewModeEnabled={false}
					zenModeEnabled={false}
				/>
			);
		}

		if (scene != null) {
			return (
				<DocumentCanvas
					langCode={langCode}
					onApiReady={onApiReady}
					onChange={onChange}
					theme={theme}
					{...(scene ? { scene } : {})}
					footerContent={
						<div
							style={{
								marginLeft: "0.5rem",
								position: "relative",
								zIndex: Z_INDEX.FULLSCREEN_CONTENT,
							}}
						>
							<DocumentSavingIndicator
								loading={!!loading}
								status={saveStatus}
							/>
						</div>
					}
					forceLTR={true}
					hideHelpIcon={true}
					scrollable={false}
					viewModeEnabled={false}
					zenModeEnabled={false}
				/>
			);
		}

		return (
			<div className="flex flex-1 items-center justify-center p-6">
				<div className="mx-auto max-w-md text-center">
					<div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/60">
						<Plus className="size-5" />
					</div>
					<div className="font-medium text-base">
						{i18n.getMessage("doc_empty_title", isLocalized)}
					</div>
					<div className="mt-1 text-muted-foreground text-sm">
						{i18n.getMessage("doc_empty_desc", isLocalized)}
					</div>
					<div className="mt-4">
						<Button onClick={handleInitialize}>
							<Plus className="mr-2 size-4" />
							{i18n.getMessage("doc_empty_action", isLocalized)}
						</Button>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div
			className={`relative min-h-0 flex-1 ${
				isFullscreen
					? "rounded-none border-0"
					: "rounded-md border border-border/50"
			} flex flex-col overflow-hidden bg-card/40`}
		>
			{renderContent()}

			{(loading || !isUnlocked) && (
				<DocumentLockOverlay
					message={
						isUnlocked
							? i18n.getMessage("document_loading", isLocalized)
							: i18n.getMessage("document_unlock_prompt", isLocalized)
					}
				/>
			)}

			<div className="absolute right-2 bottom-2 z-[5]">
				<div className="rounded-md border border-border bg-card/90 px-1.5 py-1 text-foreground shadow-sm backdrop-blur">
					{isFullscreen ? (
						<button
							aria-label="Exit fullscreen"
							className="excalidraw-fullscreen-button"
							onClick={exitFullscreen}
							type="button"
						>
							<Minimize2 className="size-4" />
						</button>
					) : (
						<button
							aria-label="Enter fullscreen"
							className="excalidraw-fullscreen-button"
							onClick={enterFullscreen}
							type="button"
						>
							<Maximize2 className="size-4" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
