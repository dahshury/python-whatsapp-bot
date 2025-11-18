/**
 * Cached Notification Button Shell
 *
 * A memoized wrapper for the notification button structure that separates
 * the static button UI from dynamic badge content.
 *
 * This allows the button shell to be cached while the badge (unread count)
 * updates dynamically without re-rendering the entire button structure.
 */

'use client'

import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import { Bell } from 'lucide-react'
import type { ReactNode } from 'react'

type CachedNotificationShellProps = {
	badge?: ReactNode
	onClick?: () => void
	className?: string
	'aria-label'?: string
}

/**
 * Memoized Notification Button Shell
 *
 * The button structure is stable and only re-renders when:
 * - className changes
 * - badge content changes (but badge itself can be dynamic component)
 *
 * This optimization reduces re-renders when parent components update.
 */
export function CachedNotificationShell({
	badge,
	onClick,
	className,
	'aria-label': ariaLabel,
}: CachedNotificationShellProps) {
	return (
		<Button
			aria-label={ariaLabel}
			className={cn('relative', className)}
			onClick={onClick}
			size="icon"
			variant="ghost"
		>
			<Bell className="h-5 w-5" />
			{badge}
		</Button>
	)
}
