// Using custom portal-based dialog for proper centering on viewport

import { Z_INDEX } from '@shared/libs/ui/z-index'
import { Button } from '@ui/button'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { i18n } from '@/shared/libs/i18n'
import { Spinner } from '@/shared/ui/spinner'

type UnsavedChangesDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	isLocalized: boolean
	onDiscard: () => void
	onSaveAndClose: () => void
	isSaving: boolean
	canSave: boolean
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
	const titleId = useId()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)

		// Handle escape key
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && open) {
				onOpenChange(false)
			}
		}

		if (open) {
			document.addEventListener('keydown', handleEscape)
			// Prevent body scroll when dialog is open
			document.body.style.overflow = 'hidden'
		}

		return () => {
			document.removeEventListener('keydown', handleEscape)
			document.body.style.overflow = 'unset'
		}
	}, [open, onOpenChange])

	if (!mounted) {
		return null
	}

	const dialogContent = (
		<>
			{/* Backdrop */}
			<button
				aria-label={i18n.getMessage('close_dialog', isLocalized)}
				className="fixed inset-0 bg-black/80 backdrop-blur-sm"
				onClick={() => onOpenChange(false)}
				style={{
					zIndex: Z_INDEX.CONFIRMATION_OVERLAY_BACKDROP,
					pointerEvents: 'auto',
				}}
				type="button"
			/>

			{/* Dialog Content */}
			<div
				className="fixed inset-0 flex items-center justify-center p-4"
				style={{
					zIndex: Z_INDEX.CONFIRMATION_OVERLAY_CONTENT,
					pointerEvents: 'auto',
				}}
			>
				<dialog
					aria-labelledby={titleId}
					className="fade-in-0 zoom-in-95 mx-auto w-full max-w-md animate-in rounded-lg border bg-background p-6 shadow-lg duration-200"
					open
				>
					<div className="space-y-3 text-center">
						<div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
							<AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
						</div>
						<h2 className="font-semibold text-lg" id={titleId}>
							{i18n.getMessage('unsaved_changes', isLocalized)}
						</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							{i18n.getMessage('unsaved_changes_prompt', isLocalized)}
						</p>
					</div>
					<div className="mt-4 flex items-center justify-between gap-2">
						<div className="flex">
							<Button onClick={() => onOpenChange(false)} variant="outline">
								{i18n.getMessage('cancel', isLocalized)}
							</Button>
						</div>
						<div className="flex gap-2">
							<Button onClick={onDiscard} variant="outline">
								{i18n.getMessage('discard_changes', isLocalized)}
							</Button>
							<Button disabled={isSaving || !canSave} onClick={onSaveAndClose}>
								{isSaving ? (
									<>
										<Spinner className="h-4 w-4" />
										{i18n.getMessage('saving', isLocalized)}
									</>
								) : (
									i18n.getMessage('save_and_close', isLocalized)
								)}
							</Button>
						</div>
					</div>
				</dialog>
			</div>
		</>
	)

	return open ? createPortal(dialogContent, document.body) : null
}
