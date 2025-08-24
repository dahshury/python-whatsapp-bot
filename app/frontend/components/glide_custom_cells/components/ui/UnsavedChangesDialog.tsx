import { createPortal } from "react-dom";
import { Z_INDEX } from "@/lib/z-index";

interface UnsavedChangesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDiscard: () => void;
	onSaveAndClose: () => void;
	isSaving?: boolean;
	title?: string;
	description?: string;
	discardLabel?: string;
	cancelLabel?: string;
	saveLabel?: string;
	savingLabel?: string;
}

export function UnsavedChangesDialog({
	open,
	onOpenChange,
	onDiscard,
	onSaveAndClose,
	isSaving = false,
	title = "Unsaved Changes",
	description = "You have unsaved changes. Would you like to save your changes before closing?",
	discardLabel = "Discard Changes",
	cancelLabel = "Cancel",
	saveLabel = "Save & Close",
	savingLabel = "Saving...",
}: UnsavedChangesDialogProps) {
	if (!open || typeof document === "undefined") return null;

	const dialogContent = (
		<>
			{/* Backdrop - Above modals and date pickers */}
			<div
				className="fixed inset-0 bg-black/80 backdrop-blur-sm unsaved-changes-backdrop"
				style={{
					zIndex: Z_INDEX.CONFIRMATION_BACKDROP,
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
				}}
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						onOpenChange(false);
					}
				}}
			/>

			{/* Dialog Content - Above backdrop */}
			<div
				className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md unsaved-changes-content"
				style={{
					zIndex: Z_INDEX.CONFIRMATION_CONTENT,
					position: "fixed",
					left: "50%",
					top: "50%",
					transform: "translate(-50%, -50%)",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<div
					className="bg-background rounded-lg shadow-xl border p-6"
					style={{ position: "relative" }}
				>
					{/* Header */}
					<div className="mb-4">
						<h2 className="text-lg font-semibold mb-2">{title}</h2>
						<p className="text-sm text-muted-foreground">{description}</p>
					</div>

					{/* Footer/Actions */}
					<div className="flex gap-2 justify-end">
						<button
							onClick={onDiscard}
							className="px-4 py-2 text-sm border border-border rounded-md bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
							disabled={isSaving}
						>
							{discardLabel}
						</button>
						<button
							onClick={() => onOpenChange(false)}
							className="px-4 py-2 text-sm border border-border rounded-md bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
							disabled={isSaving}
						>
							{cancelLabel}
						</button>
						<button
							onClick={onSaveAndClose}
							disabled={isSaving}
							className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{isSaving && (
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							)}
							{isSaving ? savingLabel : saveLabel}
						</button>
					</div>
				</div>
			</div>
		</>
	);

	// Portal to document.body to escape any stacking context issues
	return createPortal(dialogContent, document.body);
}
