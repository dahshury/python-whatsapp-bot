import { useCallback } from 'react'

type UseGridDialogInteractionOptions = {
	onClose: () => void
	isFullscreen?: boolean
}

/**
 * Hook for handling dialog interactions with grid overlay editors
 * Prevents dialog from closing when interacting with overlay editors, date pickers, etc.
 */
export function useGridDialogInteraction({
	onClose,
	isFullscreen = false,
}: UseGridDialogInteractionOptions) {
	const handlePointerDownOutside = useCallback(
		(e: Event) => {
			const target = e.target as HTMLElement

			// Check for grid overlay editor
			if (target.closest('.glide-data-grid-overlay-editor')) {
				e.preventDefault()
				return
			}

			// Check for various date picker implementations
			if (
				target.closest('.tempus-dominus-widget') ||
				target.closest('.td-picker') ||
				target.closest('.td-overlay') ||
				target.closest('[data-td-target]') ||
				target.closest('[data-calendar]') ||
				target.closest('.react-datepicker') ||
				target.closest('.flatpickr-calendar')
			) {
				e.preventDefault()
				return
			}

			// Check for dropdown menus
			if (
				target.closest('.column-menu') ||
				target.closest('.formatting-menu') ||
				target.closest('#column-menu') ||
				target.closest('#formatting-menu') ||
				target.closest('[role="listbox"]') ||
				target.closest('[role="menu"]')
			) {
				e.preventDefault()
				return
			}

			// Check for tooltips and popovers
			if (
				target.closest('[role="tooltip"]') ||
				target.closest('[data-radix-popper-content-wrapper]') ||
				target.closest('.popover-content') ||
				target.closest('.click-outside-ignore')
			) {
				e.preventDefault()
				return
			}

			// Otherwise, allow closing
			onClose()
		},
		[onClose]
	)

	const handleEscapeKeyDown = useCallback(
		(e: KeyboardEvent) => {
			// Only handle Escape; allow Enter and other keys to propagate to nested editors
			if (e.key !== 'Escape') {
				return
			}

			// Check if fullscreen portal is active
			const fullscreenPortal = document.getElementById('grid-fullscreen-portal')
			if (fullscreenPortal && isFullscreen) {
				e.preventDefault()
				return
			}

			// Check if any overlay editor is active
			const overlayEditor = document.querySelector(
				'.glide-data-grid-overlay-editor'
			)
			if (overlayEditor) {
				e.preventDefault()
				return
			}

			// Check for active date pickers
			const datePicker = document.querySelector(
				'.tempus-dominus-widget, .td-picker, .react-datepicker, .flatpickr-calendar'
			)
			if (datePicker) {
				e.preventDefault()
				return
			}

			// Check for active phone cell editor popovers
			const phoneCellEditor = document.querySelector(
				'.glide-data-grid-overlay-editor'
			)
			if (phoneCellEditor) {
				e.preventDefault()
				return
			}

			// Otherwise allow escape to close dialog
			onClose()
		},
		[onClose, isFullscreen]
	)

	const handleInteractOutside = useCallback((e: Event) => {
		// Always prevent default to avoid unwanted interactions
		e.preventDefault()
	}, [])

	return {
		handlePointerDownOutside,
		handleEscapeKeyDown,
		handleInteractOutside,
	}
}
