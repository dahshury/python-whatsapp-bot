/**
 * Cached Legend Button Shell
 *
 * A cached wrapper for the calendar legend button that separates
 * static button structure from dynamic content (vacation periods, etc.).
 * This allows the button shell to be cached while dynamic content updates.
 */

'use cache'

import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/libs/utils'

type CachedLegendButtonProps = {
	children?: ReactNode
	className?: string
	'aria-label'?: string
}

/**
 * Cached Legend Button Shell
 *
 * The button structure is cached and only re-renders when
 * className or aria-label changes. Dynamic content (children)
 * can update without triggering re-render of the shell.
 */
export function CachedLegendButton({
	children,
	className,
	'aria-label': ariaLabel,
}: CachedLegendButtonProps) {
	return (
		<button
			aria-label={ariaLabel}
			className={cn(
				'h-6 rounded-md border border-border/50 bg-muted/50 px-2 transition-colors hover:bg-muted',
				'flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground',
				'calendar-legend-trigger',
				className
			)}
			type="button"
		>
			<Info className="h-3 w-3 text-muted-foreground/80" />
			{children}
		</button>
	)
}
