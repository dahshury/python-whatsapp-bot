'use client'

import { Button } from '@ui/button'
import { CalendarSkeleton } from '.'

export function CalendarErrorFallback({
	error,
	retry,
}: {
	error?: Error
	retry: () => void
}) {
	return (
		<div className="relative">
			<CalendarSkeleton />
			<div className="absolute inset-0 flex items-center justify-center bg-background/90">
				<div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center shadow-lg">
					<div className="mb-2 text-4xl">📅💥</div>
					<h3 className="font-semibold text-foreground text-lg">
						Calendar Loading Error
					</h3>
					<p className="max-w-sm text-muted-foreground text-sm">
						There was an issue loading the calendar. This is likely a temporary
						development server issue.
					</p>
					{process.env.NODE_ENV === 'development' && error && (
						<details className="rounded border border-destructive/30 bg-destructive/10 p-3 text-left text-xs">
							<summary className="cursor-pointer font-medium text-destructive">
								Error Details
							</summary>
							<pre className="mt-2 max-h-32 overflow-auto text-destructive/80">
								{error.message}
							</pre>
						</details>
					)}
					<div className="flex justify-center gap-2">
						<Button onClick={retry} size="sm" variant="outline">
							Retry
						</Button>
						<Button onClick={() => window.location.reload()} size="sm">
							Refresh
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
