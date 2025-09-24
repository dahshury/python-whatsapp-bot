// Using custom portal-based dialog for proper centering on viewport

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Z_INDEX } from "@/lib/z-index";

interface UnsavedChangesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isLocalized: boolean;
	onDiscard: () => void;
	onSaveAndClose: () => void;
	isSaving: boolean;
	canSave: boolean;
}

export function UnsavedChangesDialog({
	open,
	onOpenChange,
	isLocalized,
	onDiscard,
	onSaveAndClose,
	isSaving,
	canSave,
}: UnsavedChangesDialogProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);

		// Handle escape key
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape" && open) {
				onOpenChange(false);
			}
		};

		if (open) {
			document.addEventListener("keydown", handleEscape);
			// Prevent body scroll when dialog is open
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [open, onOpenChange]);

	if (!mounted) return null;

	const dialogContent = (
		<>
			{/* Backdrop */}
			<button
				className="fixed inset-0 bg-black/80 backdrop-blur-sm"
				style={{
					zIndex: Z_INDEX.CONFIRMATION_OVERLAY_BACKDROP,
					pointerEvents: "auto",
				}}
				onClick={() => onOpenChange(false)}
				type="button"
				aria-label={isLocalized ? "إغلاق الحوار" : "Close dialog"}
			/>

			{/* Dialog Content */}
			<div
				className="fixed inset-0 flex items-center justify-center p-4"
				style={{
					zIndex: Z_INDEX.CONFIRMATION_OVERLAY_CONTENT,
					pointerEvents: "auto",
				}}
			>
				<dialog
					className="bg-background border shadow-lg rounded-lg p-6 w-full max-w-md mx-auto animate-in fade-in-0 zoom-in-95 duration-200"
					open
					aria-labelledby="unsaved-changes-title"
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							e.stopPropagation();
						}
					}}
				>
					<div className="space-y-4">
						<div className="text-left">
							<h2
								id={`unsaved-changes-title-${typeof window !== "undefined" ? Math.random().toString(36).slice(2) : "ssr"}`}
								className="text-lg font-semibold"
							>
								{isLocalized ? "تغييرات غير محفوظة" : "Unsaved Changes"}
							</h2>
							<p className="text-sm text-muted-foreground mt-2">
								{isLocalized
									? "لديك تغييرات غير محفوظة. هل تريد حفظ التغييرات قبل الإغلاق؟"
									: "You have unsaved changes. Would you like to save your changes before closing?"}
							</p>
						</div>
						<div className="flex items-center justify-between gap-2">
							<div className="flex">
								<Button variant="outline" onClick={() => onOpenChange(false)}>
									{isLocalized ? "إلغاء" : "Cancel"}
								</Button>
							</div>
							<div className="flex gap-2">
								<Button variant="outline" onClick={onDiscard}>
									{isLocalized ? "تجاهل التغييرات" : "Discard Changes"}
								</Button>
								<Button
									onClick={onSaveAndClose}
									disabled={isSaving || !canSave}
								>
									{isSaving ? (
										<>
											<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
											{isLocalized ? "جاري الحفظ..." : "Saving..."}
										</>
									) : isLocalized ? (
										"حفظ والإغلاق"
									) : (
										"Save & Close"
									)}
								</Button>
							</div>
						</div>
					</div>
				</dialog>
			</div>
		</>
	);

	return open ? createPortal(dialogContent, document.body) : null;
}
