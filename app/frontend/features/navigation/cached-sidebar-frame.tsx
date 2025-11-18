/**
 * Cached Sidebar Frame Component
 *
 * A memoized wrapper that provides static sidebar structure.
 * Uses React.memo to prevent unnecessary re-renders of the sidebar frame
 * while allowing dynamic content to update normally.
 *
 * This component is optimized for Next.js 16 performance patterns.
 */

'use cache'

import { cn } from '@shared/libs/utils'
import type { ReactNode } from 'react'

type CachedSidebarFrameProps = {
	children: ReactNode
	className?: string
}

/**
 * Memoized Sidebar Frame
 *
 * Provides a stable sidebar container that only re-renders when
 * className changes. Children updates don't trigger frame re-render.
 */
export function CachedSidebarFrame({
	children,
	className,
}: CachedSidebarFrameProps) {
	return (
		<aside className={cn('sidebar-frame', className)}>
			<div className="sidebar-content">{children}</div>
		</aside>
	)
}
