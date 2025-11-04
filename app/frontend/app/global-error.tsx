'use client'

import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import { i18n } from '@/shared/libs/i18n'
import { useLanguage } from '@/shared/libs/state/language-context'
import { useAppShellVisibility } from '@/shared/ui/app-shell-visibility'

type GlobalErrorProps = {
	error: Error & { digest?: string }
	reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
	const { setShowShell } = useAppShellVisibility()
	const { isLocalized } = useLanguage()

	useEffect(() => {
		setShowShell(false)
		return () => {
			setShowShell(true)
		}
	}, [setShowShell])

	return (
		<section
			className={cn(
				'relative mx-auto flex min-h-[var(--doc-dvh,100dvh)] w-full max-w-4xl flex-1 items-center justify-center px-6 py-16'
			)}
		>
			<Empty className="w-full border border-border/60 border-dashed bg-background/80 p-8 shadow-sm backdrop-blur">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<AlertTriangle
							aria-hidden="true"
							className="size-6 text-destructive"
						/>
					</EmptyMedia>
					<EmptyTitle>
						{i18n.getMessage('global_error_title', isLocalized)}
					</EmptyTitle>
					<EmptyDescription>
						{i18n.getMessage('global_error_description', isLocalized)}
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					{error.digest ? (
						<p className="rounded-md border border-border/60 bg-card px-3 py-2 text-muted-foreground text-xs">
							{i18n.getMessage('global_error_reference', isLocalized)}{' '}
							<span className="font-medium text-foreground">
								{error.digest}
							</span>
						</p>
					) : null}
					<div className="flex w-full flex-col gap-2 sm:flex-row">
						<Button className="flex-1" onClick={reset} type="button">
							<RotateCcw aria-hidden="true" className="mr-2 size-4" />
							{i18n.getMessage('global_error_button_try_again', isLocalized)}
						</Button>
						<Button asChild className="flex-1" variant="outline">
							<Link href="/">
								<ArrowLeft aria-hidden="true" className="mr-2 size-4" />
								{i18n.getMessage(
									'global_error_button_return_home',
									isLocalized
								)}
							</Link>
						</Button>
					</div>
				</EmptyContent>
			</Empty>
		</section>
	)
}
