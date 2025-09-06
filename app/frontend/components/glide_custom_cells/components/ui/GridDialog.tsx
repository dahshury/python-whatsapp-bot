"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Z_INDEX } from "@/lib/z-index";
import { useGridDialogInteraction } from "../hooks/useGridDialogInteraction";
import { GridLoadingState } from "./GridLoadingState";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

interface GridDialogProps {
	/** Whether the dialog is open */
	open: boolean;
	/** Callback when dialog open state changes */
	onOpenChange: (open: boolean) => void;
	/** Dialog title */
	title: string;
	/** Optional dialog description */
	description?: string;
	/** The grid content to render */
	children: React.ReactNode;
	/** Whether the grid is ready/loaded */
	isGridReady?: boolean;
	/** Whether the grid is in fullscreen mode */
	isFullscreen?: boolean;
	/** Whether there are unsaved changes */
	hasUnsavedChanges?: boolean;
	/** Callback for saving changes */
	onSaveChanges?: () => Promise<boolean>;
	/** Whether save is in progress */
	isSaving?: boolean;
	/** Dialog footer content (save/cancel buttons) */
	footerContent?: React.ReactNode;
	/** Dialog header extra content */
	headerExtra?: React.ReactNode;
	/** Custom class name */
	className?: string;
	/** Dialog size preset */
	size?: "sm" | "md" | "lg" | "xl" | "full";
	/** Whether to show the close button */
	showCloseButton?: boolean;
	/** Loading state options */
	loadingOptions?: {
		showSkeleton?: boolean;
		skeletonRows?: number;
		skeletonColumns?: number;
		loadingText?: string;
	};
	/** Unsaved changes dialog labels */
	unsavedChangesLabels?: {
		title?: string;
		description?: string;
		discardLabel?: string;
		cancelLabel?: string;
		saveLabel?: string;
		savingLabel?: string;
	};
	/** Whether content is RTL */
	isRTL?: boolean;
	isLocalized?: boolean;
	/** Z-index for the dialog */
	zIndex?: number;
}

const sizeClasses = {
	sm: "max-w-2xl",
	md: "max-w-4xl",
	lg: "max-w-6xl",
	xl: "max-w-7xl",
	full: "max-w-[95vw]",
};

/**
 * Generic dialog component for grid editors
 * Handles loading states, unsaved changes, and proper interaction handling
 */
export function GridDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	isGridReady = true,
	isFullscreen = false,
	hasUnsavedChanges = false,
	onSaveChanges,
	isSaving = false,
	footerContent,
	headerExtra,
	className = "",
	size = "lg",
	showCloseButton = true,
	loadingOptions = {},
	unsavedChangesLabels = {},
	isRTL,
	isLocalized,
	zIndex = Z_INDEX.DIALOG_BACKDROP,
}: GridDialogProps) {
	const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
		useState(false);
	const [pendingCloseAction, setPendingCloseAction] = useState<
		(() => void) | null
	>(null);
	const portalId = React.useId();

	const _isRTL = (isRTL ?? isLocalized === true) === true;

	const {
		handlePointerDownOutside,
		handleEscapeKeyDown,
		handleInteractOutside: _handleInteractOutside,
	} = useGridDialogInteraction({
		onClose: () => handleCloseAttempt(() => onOpenChange(false)),
		isFullscreen,
	});

	const handleCloseAttempt = useCallback(
		(closeAction: () => void) => {
			if (hasUnsavedChanges) {
				setPendingCloseAction(() => closeAction);
				setShowUnsavedChangesDialog(true);
			} else {
				closeAction();
			}
		},
		[hasUnsavedChanges],
	);

	const handleDiscardChanges = useCallback(() => {
		setShowUnsavedChangesDialog(false);
		if (pendingCloseAction) {
			pendingCloseAction();
			setPendingCloseAction(null);
		}
	}, [pendingCloseAction]);

	const handleSaveAndClose = useCallback(async () => {
		setShowUnsavedChangesDialog(false);
		if (onSaveChanges) {
			const success = await onSaveChanges();
			if (success && pendingCloseAction) {
				pendingCloseAction();
				setPendingCloseAction(null);
			}
		}
	}, [pendingCloseAction, onSaveChanges]);

	// Prevent body scroll when dialog is open
	useEffect(() => {
		if (open) {
			const originalStyle = document.body.style.overflow;
			document.body.style.overflow = "hidden";
			// Add body class for CSS targeting when dialog is open
			document.body.classList.add("has-dialog-backdrop");
			return () => {
				document.body.style.overflow = originalStyle;
				document.body.classList.remove("has-dialog-backdrop");
			};
		}
	}, [open]);

	if (!open) return null;

	return (
		<>
			{/* Backdrop */}
			<button
				type="button"
				className="fixed inset-0 bg-black/80 backdrop-blur-sm dialog-backdrop"
				style={{ zIndex }}
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						handleCloseAttempt(() => onOpenChange(false));
					}
				}}
				aria-label="Close dialog"
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						e.preventDefault();
						handleCloseAttempt(() => onOpenChange(false));
					}
				}}
			/>

			{/* Dialog */}
			<div
				role="dialog"
				className={`fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 ${sizeClasses[size]} w-full ${className}`}
				style={{
					zIndex: Z_INDEX.DIALOG_CONTENT,
					maxHeight: "90vh",
				}}
				onPointerDown={
					handlePointerDownOutside as unknown as React.PointerEventHandler
				}
				onKeyDown={handleEscapeKeyDown as unknown as React.KeyboardEventHandler}
				onClick={(e) => e.stopPropagation()}
			>
				<div
					className="bg-background rounded-lg shadow-xl flex flex-col h-full"
					style={{
						backgroundColor: "var(--gdg-bg-cell, hsl(var(--card)))",
						border: "1px solid var(--gdg-border-color, hsl(var(--border)))",
					}}
				>
					{/* Header */}
					<div
						className={`px-6 py-4 border-b flex items-start justify-between ${_isRTL ? "flex-row-reverse" : ""}`}
						style={{
							borderColor: "var(--gdg-border-color, hsl(var(--border)))",
						}}
					>
						<div
							className={`flex flex-col gap-1 ${_isRTL ? "text-right" : "text-left"}`}
						>
							<h2 className="text-lg font-semibold">{title}</h2>
							{description && (
								<p className="text-sm text-muted-foreground">{description}</p>
							)}
						</div>

						<div
							className={`flex items-center gap-2 ${_isRTL ? "flex-row-reverse" : ""}`}
						>
							{headerExtra}
							{showCloseButton && (
								<button
									type="button"
									onClick={() => handleCloseAttempt(() => onOpenChange(false))}
									className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
									style={{
										marginLeft: _isRTL ? 0 : "8px",
										marginRight: _isRTL ? "8px" : 0,
									}}
								>
									<svg
										width="15"
										height="15"
										viewBox="0 0 15 15"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
										role="img"
										aria-label="Close"
									>
										<path
											d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
											fill="currentColor"
											fillRule="evenodd"
											clipRule="evenodd"
										/>
									</svg>
									<span className="sr-only">Close</span>
								</button>
							)}
						</div>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-hidden p-6 relative">
						{!isGridReady && (
							<div className="absolute inset-0 z-10 bg-background p-4">
								<GridLoadingState
									showSkeleton={loadingOptions.showSkeleton}
									skeletonRows={loadingOptions.skeletonRows}
									skeletonColumns={loadingOptions.skeletonColumns}
									loadingText={loadingOptions.loadingText}
									height="100%"
								/>
							</div>
						)}
						<div
							style={{
								opacity: isGridReady ? 1 : 0,
								pointerEvents: isGridReady ? "auto" : "none",
								height: "100%",
								position: "relative",
							}}
						>
							{children}
							{/* Grid Portal Container - for menus to render inside dialog */}
							<div
								id={portalId}
								className="grid-dialog-portal"
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									pointerEvents: "auto",
									zIndex: Z_INDEX.DIALOG_CONTENT + 100, // Above dialog content
								}}
							/>
						</div>
					</div>

					{/* Footer */}
					{footerContent && (
						<div
							className={`px-6 py-4 border-t ${_isRTL ? "text-right" : "text-left"}`}
							style={{
								borderColor: "var(--gdg-border-color, hsl(var(--border)))",
							}}
						>
							{footerContent}
						</div>
					)}
				</div>
			</div>

			{/* Unsaved Changes Dialog */}
			<UnsavedChangesDialog
				open={showUnsavedChangesDialog}
				onOpenChange={setShowUnsavedChangesDialog}
				onDiscard={handleDiscardChanges}
				onSaveAndClose={handleSaveAndClose}
				isSaving={isSaving}
				{...unsavedChangesLabels}
			/>
		</>
	);
}

export default GridDialog;
