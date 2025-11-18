'use client'

import { i18n } from '@shared/libs/i18n'
import { cn } from '@shared/libs/utils'
import { CheckCircle2 } from 'lucide-react'
import React from 'react'
import { Button } from '@/shared/ui/button'
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/shared/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import type { StatusFilterValue } from '../hooks/useStatusFilter'
import { FilterButtonGroup } from './FilterButtonGroup'

type StatusFilterProps = {
	statusFilter: StatusFilterValue
	getStatusLabel: (status: StatusFilterValue) => string
	isStatusOpen: boolean
	setIsStatusOpen: (open: boolean) => void
	handleStatusFilterSelect: (status: StatusFilterValue) => void
	handleRemoveStatusFilter: (event: React.MouseEvent) => void
	isLocalized: boolean
	statusStats?: { registered: number; unknown: number; blocked: number }
}

type StatusSection = {
	key: string
	labelKey: string
	fallbackLabel: string
	options: Array<{
		value: StatusFilterValue
		labelKey: string
	}>
}

const STATUS_SECTIONS: StatusSection[] = [
	{
		key: 'status',
		labelKey: 'phone_filter_status_section_status',
		fallbackLabel: 'Status',
		options: [
			{ value: 'registered', labelKey: 'phone_filter_status_registered' },
			{ value: 'unknown', labelKey: 'phone_filter_status_unknown' },
		],
	},
	{
		key: 'moderation',
		labelKey: 'phone_filter_status_section_moderation',
		fallbackLabel: 'Moderation',
		options: [{ value: 'blocked', labelKey: 'phone_filter_status_blocked' }],
	},
]

export function StatusFilter({
	statusFilter,
	getStatusLabel,
	isStatusOpen,
	setIsStatusOpen,
	handleStatusFilterSelect,
	handleRemoveStatusFilter,
	isLocalized,
	statusStats,
}: StatusFilterProps) {
	const getCount = (status: StatusFilterValue): number => {
		if (!statusStats) {
			return 0
		}
		if (status === 'registered') {
			return statusStats.registered
		}
		if (status === 'blocked') {
			return statusStats.blocked
		}
		return statusStats.unknown
	}

	return (
		<Popover onOpenChange={setIsStatusOpen} open={isStatusOpen}>
			<FilterButtonGroup
				filterButton={
					<PopoverTrigger asChild>
						<Button
							className="h-[18px] gap-1 px-1.5 text-xs"
							onClick={(event) => {
								event.stopPropagation()
								setIsStatusOpen(true)
							}}
							size="sm"
							variant="outline"
						>
							<span>
								{getStatusLabel(statusFilter)}
								{statusStats && (
									<span className="ml-1 opacity-75">
										({getCount(statusFilter)})
									</span>
								)}
							</span>
						</Button>
					</PopoverTrigger>
				}
				onRemove={handleRemoveStatusFilter}
			/>
			<PopoverContent
				className={cn('w-52 p-0', 'click-outside-ignore')}
				dir="ltr"
			>
				<Command dir="ltr" shouldFilter={false}>
					<CommandList dir="ltr">
						{STATUS_SECTIONS.map((section, index) => (
							<React.Fragment key={section.key}>
								{index > 0 && <CommandSeparator />}
								<CommandGroup
									dir="ltr"
									heading={
										i18n.getMessage(section.labelKey, isLocalized) ||
										section.fallbackLabel
									}
								>
									{section.options.map((option) => (
										<CommandItem
											className="gap-2"
											key={option.value}
											onSelect={() => {
												handleStatusFilterSelect(option.value)
											}}
											value={option.value}
										>
											<span className="flex-1 text-sm">
												{i18n.getMessage(option.labelKey, isLocalized) ||
													getStatusLabel(option.value)}
											</span>
											{statusStats && (
												<span className="text-muted-foreground text-xs">
													({getCount(option.value)})
												</span>
											)}
											{statusFilter === option.value && (
												<CheckCircle2 className="ms-auto size-4 text-primary" />
											)}
										</CommandItem>
									))}
								</CommandGroup>
							</React.Fragment>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
