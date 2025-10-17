"use client";

import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { useTheme } from "next-themes";
import { isValidElement, useState } from "react";
import { TEMPLATE_USER_WA_ID } from "@/shared/libs/documents";
import { useLanguage } from "@/shared/libs/state/language-context";
import { useThemeMode } from "@/shared/libs/ui/use-theme-mode";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/ui/sheet";
import { DocumentEditor } from "@/widgets/documents/document-editor";
import { useEditorCanvas } from "@/widgets/documents/hooks/use-editor-canvas";
import { useFullscreenContainer } from "@/widgets/documents/hooks/use-fullscreen-container";

type SceneLike = {
	elements?: unknown[];
	appState?: Record<string, unknown>;
	files?: Record<string, unknown>;
} | null;

type DefaultDocumentDrawerProps = {
	className?: string;
	trigger?: React.ReactNode;
	title?: string;
};

/**
 * DefaultDocumentDrawer allows editing the template document that will be
 * copied to all new users when they first open their document.
 */
export function DefaultDocumentDrawer({
	className,
	trigger,
	title = "Default Document Template",
}: DefaultDocumentDrawerProps) {
	const [open, setOpen] = useState(false);
	const contentId = "default-document-drawer";
	const { resolvedTheme } = useTheme();
	const { locale, isLocalized } = useLanguage();
	const themeMode = useThemeMode(resolvedTheme);

	return (
		<Sheet onOpenChange={setOpen} open={open}>
			{trigger ? (
				isValidElement(trigger) ? (
					<SheetTrigger aria-controls={contentId} asChild>
						{trigger}
					</SheetTrigger>
				) : (
					<SheetTrigger aria-controls={contentId} asChild>
						<Button variant="outline">Edit Template</Button>
					</SheetTrigger>
				)
			) : (
				<SheetTrigger aria-controls={contentId} asChild>
					<Button variant="outline">Edit Template</Button>
				</SheetTrigger>
			)}
			<SheetContent
				className={cn(
					"flex w-[95vw] max-w-none flex-col overflow-hidden p-0 sm:max-w-none",
					className
				)}
				id={contentId}
				side="right"
			>
				<SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3 pr-12">
					<SheetTitle>{title}</SheetTitle>
				</SheetHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
					{open ? (
						<TemplateDocumentCanvases
							isLocalized={Boolean(isLocalized)}
							langCode={locale || "en"}
							theme={themeMode}
						/>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}

function TemplateDocumentCanvases({
	theme,
	langCode,
	isLocalized,
}: {
	theme: "light" | "dark";
	langCode: string;
	isLocalized: boolean;
}) {
	const { fsContainerRef, isFullscreen, enterFullscreen, exitFullscreen } =
		useFullscreenContainer();
	const {
		scene,
		onEditorApiReady,
		handleEditorChange,
		saveStatus,
		// loading,
	} = useEditorCanvas({
		waId: TEMPLATE_USER_WA_ID,
		theme,
		isUnlocked: true,
	});

	return (
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
				{/* Editor canvas (flex-fill) */}
				<div
					className="flex min-h-0 flex-1 flex-col"
					style={{ minHeight: "450px" }}
				>
					<DocumentEditor
						enterFullscreen={enterFullscreen}
						exitFullscreen={exitFullscreen}
						isFullscreen={isFullscreen}
						isLocalized={isLocalized}
						isUnlocked={true}
						langCode={langCode}
						loading={false}
						onApiReady={onEditorApiReady}
						onChange={handleEditorChange}
						saveStatus={saveStatus}
						scene={scene as SceneLike}
						theme={theme}
					/>
				</div>
			</div>
		</div>
	);
}
