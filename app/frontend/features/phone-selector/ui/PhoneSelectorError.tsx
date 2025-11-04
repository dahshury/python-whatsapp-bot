'use client'

import { i18n } from '@shared/libs/i18n'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type PhoneSelectorErrorProps = {
	hasError: boolean
	onRetry?: (() => void) | undefined
	isLocalized: boolean
}

export function PhoneSelectorError({
	hasError,
	onRetry,
	isLocalized,
}: PhoneSelectorErrorProps) {
	if (!hasError) {
		return null
	}

	return (
		<div className="flex flex-col items-center gap-3 p-4 text-center">
			<AlertCircle className="size-8 text-destructive" />
			<div>
				<p className="font-medium text-sm">
					{i18n.getMessage('phone_failed_to_load_title', isLocalized) ||
						'Failed to load'}
				</p>
				<p className="text-muted-foreground text-xs">
					{i18n.getMessage('phone_failed_to_load_description', isLocalized) ||
						'Could not fetch data'}
				</p>
			</div>
			{onRetry && (
				<Button
					className="w-full"
					onClick={onRetry}
					size="sm"
					variant="outline"
				>
					<RefreshCw className="mr-2 size-3" />
					{i18n.getMessage('phone_retry_button', isLocalized) || 'Retry'}
				</Button>
			)}
		</div>
	)
}
