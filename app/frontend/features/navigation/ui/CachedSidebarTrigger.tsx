/**
 * Cached Sidebar Trigger Shell
 *
 * A cached wrapper for the sidebar toggle button that provides
 * static button structure without dynamic dependencies.
 */

'use cache'

import { Button } from '@ui/button'
import type { ReactNode } from 'react'

type CachedSidebarTriggerProps = {
	children?: ReactNode
	className?: string
	onClick?: () => void
	'aria-label'?: string
	'data-sidebar'?: string
}

/**
 * Cached Sidebar Trigger Shell
 *
 * The button structure is cached and only re-renders when
 * className or aria-label changes.
 */
export function CachedSidebarTrigger({
	children,
	className,
	onClick,
	'aria-label': ariaLabel,
	'data-sidebar': dataSidebar,
}: CachedSidebarTriggerProps) {
	return (
		<Button
			aria-label={ariaLabel}
			className={className}
			data-sidebar={dataSidebar}
			onClick={onClick}
			size="icon"
			variant="ghost"
		>
			{children}
		</Button>
	)
}
