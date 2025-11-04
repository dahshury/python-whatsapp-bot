'use client'

import { ArrowLeft, Compass, Home, NotebookText } from 'lucide-react'
import Link from 'next/link'
import { type ComponentType, useEffect } from 'react'

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

type ResourceLink = {
	label: string
	description: string
	href: string
	icon: ComponentType<{ className?: string }>
}

export type NotFoundPageProps = {
	/** Primary destination when user wants to abandon the 404 */
	homeHref?: string
	/** Dashboard shortcut for secondary CTA */
	dashboardHref?: string
	/** Optional documentation link */
	documentationHref?: string
	className?: string
}

export function NotFoundPage({
	homeHref = '/',
	dashboardHref = '/dashboard',
	documentationHref = '/docs',
	className,
}: NotFoundPageProps) {
	const { setShowShell } = useAppShellVisibility()
	const { isLocalized } = useLanguage()

	useEffect(() => {
		setShowShell(false)
		return () => {
			setShowShell(true)
		}
	}, [setShowShell])

	const resources: ResourceLink[] = [
		{
			label: i18n.getMessage('not_found_resource_home_label', isLocalized),
			description: i18n.getMessage(
				'not_found_resource_home_description',
				isLocalized
			),
			href: homeHref,
			icon: Home,
		},
		{
			label: i18n.getMessage('not_found_resource_dashboard_label', isLocalized),
			description: i18n.getMessage(
				'not_found_resource_dashboard_description',
				isLocalized
			),
			href: dashboardHref,
			icon: Compass,
		},
		{
			label: i18n.getMessage('not_found_resource_docs_label', isLocalized),
			description: i18n.getMessage(
				'not_found_resource_docs_description',
				isLocalized
			),
			href: documentationHref,
			icon: NotebookText,
		},
	]

	return (
		<section
			className={cn(
				'relative mx-auto flex min-h-[var(--doc-dvh,100dvh)] w-full max-w-4xl flex-1 items-center justify-center px-6 py-16',
				className
			)}
		>
			<Empty className="w-full border border-border/60 border-dashed bg-background/80 p-8 shadow-sm backdrop-blur">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Compass aria-hidden="true" className="size-6" />
					</EmptyMedia>
					<EmptyTitle>
						{i18n.getMessage('not_found_title', isLocalized)}
					</EmptyTitle>
					<EmptyDescription>
						{i18n.getMessage('not_found_description', isLocalized)}
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<div className="grid w-full gap-4 md:grid-cols-3">
						{resources.map(({ label, description, href, icon: Icon }) => (
							<Link
								className="group flex flex-col gap-2 rounded-lg border border-border/60 bg-card/80 p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
								href={href}
								key={label}
							>
								<span className="flex items-center gap-2 font-medium text-sm">
									<Icon aria-hidden="true" className="size-4 text-primary" />
									{label}
								</span>
								<span className="text-muted-foreground text-xs">
									{description}
								</span>
							</Link>
						))}
					</div>
					<div className="flex w-full flex-col gap-2 sm:flex-row">
						<Button asChild className="flex-1">
							<Link href={homeHref}>
								<Home aria-hidden="true" className="mr-2 size-4" />
								{i18n.getMessage('not_found_button_return_home', isLocalized)}
							</Link>
						</Button>
						<Button asChild className="flex-1" variant="outline">
							<Link href={dashboardHref}>
								<Compass aria-hidden="true" className="mr-2 size-4" />
								{i18n.getMessage(
									'not_found_button_explore_dashboard',
									isLocalized
								)}
							</Link>
						</Button>
					</div>
				</EmptyContent>
				<Button
					asChild
					className="mt-6 text-muted-foreground text-sm"
					variant="ghost"
				>
					<Link href={homeHref}>
						<ArrowLeft aria-hidden="true" className="mr-2 size-4" />
						{i18n.getMessage('not_found_button_back_home', isLocalized)}
					</Link>
				</Button>
			</Empty>
		</section>
	)
}

export default NotFoundPage
