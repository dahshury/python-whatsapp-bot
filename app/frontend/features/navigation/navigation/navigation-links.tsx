'use client'

import { i18n } from '@shared/libs/i18n'
import { cn } from '@shared/libs/utils'
import { buttonVariants } from '@ui/button'
import { BarChart3, Calendar, FileText } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { memo } from 'react'
import type { NavigationLinksProps } from '@/features/navigation/types'
import { DockIcon } from '@/shared/ui/dock'
import { PrefetchLink } from '@/shared/ui/prefetch-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

export const NavigationLinks = memo(
	({ isLocalized = false, className = '' }: NavigationLinksProps) => {
		const pathname = usePathname()
		const isDashboardActive = pathname?.startsWith('/dashboard') ?? false
		const isDocumentsActive = pathname?.startsWith('/documents') ?? false
		return (
			<>
				{/* Order: Calendar (handled separately), then Documents, then Dashboard */}
				<DockIcon>
					<Tooltip>
						<TooltipTrigger asChild>
							<PrefetchLink
								aria-label={i18n.getMessage('documents', isLocalized)}
								className={cn(
									buttonVariants({
										variant: isDocumentsActive ? 'default' : 'ghost',
										size: 'icon',
									}),
									'size-9 rounded-full transition-all duration-200 sm:size-10',
									isDocumentsActive && 'shadow-lg',
									className
								)}
								data-active={isDocumentsActive}
								data-slot="sidebar-menu-button"
								href="/documents"
							>
								<FileText className="size-4 sm:size-5" />
							</PrefetchLink>
						</TooltipTrigger>
						<TooltipContent>
							<p>{i18n.getMessage('documents', isLocalized)}</p>
						</TooltipContent>
					</Tooltip>
				</DockIcon>

				<DockIcon>
					<Tooltip>
						<TooltipTrigger asChild>
							<PrefetchLink
								aria-label={i18n.getMessage('dashboard_title', isLocalized)}
								className={cn(
									buttonVariants({
										variant: isDashboardActive ? 'default' : 'ghost',
										size: 'icon',
									}),
									'size-9 rounded-full transition-all duration-200 sm:size-10',
									isDashboardActive && 'shadow-lg',
									className
								)}
								data-active={isDashboardActive}
								data-slot="sidebar-menu-button"
								href="/dashboard"
							>
								<BarChart3 className="size-4 sm:size-5" />
							</PrefetchLink>
						</TooltipTrigger>
						<TooltipContent>
							<p>{i18n.getMessage('dashboard_title', isLocalized)}</p>
						</TooltipContent>
					</Tooltip>
				</DockIcon>
			</>
		)
	}
)

export const CalendarLink = memo(
	({
		isLocalized = false,
		className = '',
	}: Pick<NavigationLinksProps, 'isLocalized' | 'className'>) => (
		<DockIcon>
			<PrefetchLink
				aria-label={i18n.getMessage('calendar', isLocalized)}
				className={cn(
					buttonVariants({
						variant: 'ghost',
						size: 'icon',
					}),
					'size-9 rounded-full transition-all duration-200',
					className
				)}
				href="/"
				prefetch={false}
			>
				<Calendar className="size-4" />
			</PrefetchLink>
		</DockIcon>
	)
)
