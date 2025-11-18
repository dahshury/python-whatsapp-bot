'use client'

import type * as React from 'react'
import { Toaster } from 'sonner'

export function ToastHost(): React.JSX.Element {
	return (
		<Toaster
			gap={8}
			position="bottom-right"
			style={{ zIndex: 'var(--z-toaster)' }}
			toastOptions={{
				className: 'sonner-toast',
				descriptionClassName: 'sonner-description',
				style: {
					background: 'transparent',
					border: 'none',
					// @ts-expect-error custom css var forwarded to CSS
					'--toaster-z': 'var(--z-toaster)',
				},
				classNames: {
					toast: 'sonner-toast group',
					title: 'sonner-title',
					description: 'sonner-description',
					actionButton: 'sonner-action',
					cancelButton: 'sonner-cancel',
					closeButton: 'sonner-close',
					error: 'sonner-error',
					success: 'sonner-success',
					warning: 'sonner-warning',
					info: 'sonner-info',
				},
			}}
		/>
	)
}
