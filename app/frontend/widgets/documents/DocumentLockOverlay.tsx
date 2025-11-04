'use client'

import { Lock } from 'lucide-react'
import type { FC } from 'react'
import { cn } from '@/shared/libs/utils'
import { Spinner } from '@/shared/ui/spinner'

type DocumentLockOverlayProps = {
	active: boolean
	loading?: boolean
	message?: string
}

export const DocumentLockOverlay: FC<DocumentLockOverlayProps> = ({
	active,
	loading = false,
	message,
}) => {
	const overlayMessage =
		message === undefined ? (loading ? 'Loading...' : 'Locked') : message
	const IconComponent = loading ? Spinner : Lock

	return (
		<div
			aria-hidden={!active}
			className={cn(
				'absolute inset-0 z-[4] flex items-center justify-center bg-background/70 backdrop-blur-sm transition-opacity duration-200 ease-out',
				active
					? 'pointer-events-auto opacity-100'
					: 'pointer-events-none opacity-0'
			)}
		>
			<div
				className={cn(
					'inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2 text-muted-foreground text-sm shadow transition-all duration-200 ease-out',
					active ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
				)}
			>
				<IconComponent
					className={cn(
						'size-4 opacity-80',
						loading ? 'text-muted-foreground' : ''
					)}
					focusable={false}
				/>
				{overlayMessage ? <span>{overlayMessage}</span> : null}
			</div>
		</div>
	)
}
