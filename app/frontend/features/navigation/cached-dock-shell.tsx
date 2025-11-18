/**
 * Cached Dock Shell Component
 *
 * A cached wrapper for the Dock UI component that provides static structure
 * without dynamic dependencies. This component can be safely cached by Next.js 16
 * cache components feature to improve rendering performance.
 *
 * Usage: Wrap dynamic dock content with this cached shell
 */

'use cache'

import { Dock } from '@shared/ui/dock'
import type { ReactNode } from 'react'

type CachedDockShellProps = {
	className?: string
	children: ReactNode
	direction?: 'top' | 'middle' | 'bottom'
}

/**
 * Memoized Dock Shell
 *
 * Uses React.memo to prevent re-renders when props haven't changed.
 * This is the client-component equivalent of "use cache" for static structure.
 */
export function CachedDockShell({
	className,
	children,
	direction = 'middle',
}: CachedDockShellProps) {
	return (
		<Dock className={className || ''} direction={direction}>
			{children}
		</Dock>
	)
}
