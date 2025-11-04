'use client'

import { Lock } from 'lucide-react'
import type { FC } from 'react'

export const DocumentLockOverlay: FC<{ message?: string }> = ({ message }) => (
	<div className="absolute inset-0 z-[6] flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
		<div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2 text-muted-foreground text-sm shadow">
			<Lock className="size-4 opacity-70" />
			<span>{message || 'Locked'}</span>
		</div>
	</div>
)
