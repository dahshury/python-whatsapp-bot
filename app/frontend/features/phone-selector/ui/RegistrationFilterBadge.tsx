'use client'

import { i18n } from '@shared/libs/i18n'
import { CheckCircle2, X } from 'lucide-react'
import type React from 'react'
import { Badge } from '@/shared/ui/badge'
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
} from '@/shared/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import type { RegistrationStatus } from '../hooks/useRegistrationFilter'

type RegistrationFilterBadgeProps = {
	registrationFilter: RegistrationStatus
	getRegistrationLabel: (status: RegistrationStatus) => string
	isRegistrationOpen: boolean
	setIsRegistrationOpen: (open: boolean) => void
	handleRegistrationFilterSelect: (status: RegistrationStatus) => void
	handleRemoveRegistrationFilter: (event: React.MouseEvent) => void
	isLocalized: boolean
	registrationStats?: { registered: number; unknown: number }
}

const REGISTRATION_OPTIONS: Array<{
	value: RegistrationStatus
	labelKey: string
}> = [
	{ value: 'registered', labelKey: 'phone_filter_registration_registered' },
	{ value: 'unknown', labelKey: 'phone_filter_registration_unknown' },
]

export function RegistrationFilterBadge({
	registrationFilter,
	getRegistrationLabel,
	isRegistrationOpen,
	setIsRegistrationOpen,
	handleRegistrationFilterSelect,
	handleRemoveRegistrationFilter,
	isLocalized,
	registrationStats,
}: RegistrationFilterBadgeProps) {
	const getCount = (status: RegistrationStatus): number => {
		if (!registrationStats) {
			return 0
		}
		return status === 'registered'
			? registrationStats.registered
			: registrationStats.unknown
	}

	return (
		<Popover onOpenChange={setIsRegistrationOpen} open={isRegistrationOpen}>
			<PopoverTrigger asChild>
				<Badge
					className="cursor-pointer gap-1 text-xs"
					onClick={(event) => {
						event.stopPropagation()
						setIsRegistrationOpen(true)
					}}
					variant="default"
				>
					<span>
						{getRegistrationLabel(registrationFilter)}
						{registrationStats && (
							<span className="ml-1 opacity-75">
								({getCount(registrationFilter)})
							</span>
						)}
					</span>
					<X className="size-3" onClick={handleRemoveRegistrationFilter} />
				</Badge>
			</PopoverTrigger>
			<PopoverContent className="w-48 p-0" dir="ltr">
				<Command dir="ltr" shouldFilter={false}>
					<CommandList dir="ltr">
						<CommandGroup dir="ltr">
							{REGISTRATION_OPTIONS.map((option) => (
								<CommandItem
									className="gap-2"
									key={option.value}
									onSelect={() => {
										handleRegistrationFilterSelect(option.value)
									}}
									value={option.value}
								>
									<span className="flex-1 text-sm">
										{i18n.getMessage(option.labelKey, isLocalized) ||
											getRegistrationLabel(option.value)}
									</span>
									{registrationStats && (
										<span className="text-muted-foreground text-xs">
											({getCount(option.value)})
										</span>
									)}
									{registrationFilter === option.value && (
										<CheckCircle2 className="ms-auto size-4 text-primary" />
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
