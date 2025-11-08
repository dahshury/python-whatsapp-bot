'use client'

import { i18n } from '@shared/libs/i18n'
import { Calendar, Check, Globe, Plus, UserCheck } from 'lucide-react'
import React from 'react'
import type { DateRange } from 'react-day-picker'
import type * as RPNInput from 'react-phone-number-input'
import { Button } from '@/shared/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/shared/ui/command'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Flag as FlagComponent } from '@/shared/ui/flag'
import { ThemedScrollbar } from '@/shared/ui/themed-scrollbar'
import type {
	DateRangeFilter,
	DateRangeFilterType,
} from '../hooks/useDateRangeFilter'
import type { RegistrationStatus } from '../hooks/useRegistrationFilter'
import { InlineDateRangePicker } from './InlineDateRangePicker'

type FiltersMenuProps = {
	countrySearch: string
	setCountrySearch: (value: string) => void
	countryOptions: ReadonlyArray<{
		value: RPNInput.Country
		label: string
		searchText?: string
		count?: number
	}>
	countryFilter?: RPNInput.Country
	handleCountryFilterSelect: (country: RPNInput.Country) => void
	getFilterByType: (type: DateRangeFilterType) => DateRangeFilter | undefined
	onDateRangeSelect: (
		type: DateRangeFilterType,
		range?: DateRange | undefined | null
	) => void
	registrationFilter?: RegistrationStatus
	handleRegistrationFilterSelect: (status: RegistrationStatus) => void
	isLocalized: boolean
	registrationStats?: { registered: number; unknown: number }
}

export function FiltersMenu({
	countrySearch,
	setCountrySearch,
	countryOptions,
	countryFilter,
	handleCountryFilterSelect,
	getFilterByType,
	onDateRangeSelect,
	handleRegistrationFilterSelect,
	isLocalized,
	registrationStats,
	registrationFilter,
}: FiltersMenuProps) {
	const messagesFilter = getFilterByType('messages')
	const reservationsFilter = getFilterByType('reservations')
	const [messagesRange, setMessagesRange] = React.useState<
		DateRange | undefined
	>(messagesFilter?.range)
	const [reservationsRange, setReservationsRange] = React.useState<
		DateRange | undefined
	>(reservationsFilter?.range)
	const [isOpen, setIsOpen] = React.useState(false)

	// Sync state when external filter changes
	React.useEffect(() => {
		if (messagesFilter) {
			setMessagesRange(messagesFilter.range)
		} else {
			setMessagesRange(undefined)
		}
	}, [messagesFilter])

	React.useEffect(() => {
		if (reservationsFilter) {
			setReservationsRange(reservationsFilter.range)
		} else {
			setReservationsRange(undefined)
		}
	}, [reservationsFilter])

	const handleMessagesRangeChange = React.useCallback(
		(range: DateRange | undefined) => {
			setMessagesRange(range)
			onDateRangeSelect('messages', range)
		},
		[onDateRangeSelect]
	)

	const handleReservationsRangeChange = React.useCallback(
		(range: DateRange | undefined) => {
			setReservationsRange(range)
			onDateRangeSelect('reservations', range)
		},
		[onDateRangeSelect]
	)

	const handleCountrySelect = React.useCallback(
		(country: RPNInput.Country) => {
			handleCountryFilterSelect(country)
			setIsOpen(false) // Close the dropdown menu when country is selected
		},
		[handleCountryFilterSelect]
	)

	return (
		<DropdownMenu
			modal={false}
			onOpenChange={(open) => {
				setIsOpen(open)
				if (!open) {
					setCountrySearch('')
				}
			}}
			open={isOpen}
		>
			<DropdownMenuTrigger asChild>
				<Button className="h-6 w-6 shrink-0 p-0" size="icon" variant="outline">
					<Plus className="size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="w-56"
				side="right"
				sideOffset={8}
				style={{ zIndex: 'var(--z-filter-menu)' }}
			>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Globe className="mr-2 size-4" />
						<span>
							{i18n.getMessage('phone_filter_country', isLocalized) ||
								'Country'}
						</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent
						className="w-[18.75rem] p-0"
						style={{ zIndex: 'var(--z-submenu)' }}
					>
						<Command dir="ltr" shouldFilter={false}>
							<CommandInput
								dir="ltr"
								onValueChange={setCountrySearch}
								placeholder={
									i18n.getMessage(
										'phone_country_search_placeholder',
										isLocalized
									) || 'Search country...'
								}
								value={countrySearch}
							/>
							<CommandList dir="ltr">
								<ThemedScrollbar className="h-72" rtl={false}>
									<CommandEmpty>
										{i18n.getMessage('phone_no_country_found', isLocalized) ||
											'No country found.'}
									</CommandEmpty>
									<CommandGroup dir="ltr">
										{countryOptions
											.filter((option) => {
												const searchLower = countrySearch.toLowerCase()
												return (
													option.label.toLowerCase().includes(searchLower) ||
													option.searchText?.includes(searchLower)
												)
											})
											.map((option) => (
												<CommandItem
													className="gap-2"
													data-option-country={option.value}
													key={option.value}
													onSelect={() => {
														handleCountrySelect(option.value)
													}}
													value={option.value}
												>
													<FlagComponent
														country={option.value}
														title={option.label}
													/>
													<span className="flex-1 text-sm">{option.label}</span>
													{countryFilter === option.value && (
														<Check className="mr-2 size-4 text-primary" />
													)}
													{option.count !== undefined && option.count > 0 && (
														<span className="text-muted-foreground text-xs">
															({option.count})
														</span>
													)}
												</CommandItem>
											))}
									</CommandGroup>
								</ThemedScrollbar>
							</CommandList>
						</Command>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<UserCheck className="mr-2 size-4" />
						<span>
							{i18n.getMessage('phone_filter_registration', isLocalized) ||
								'Registration'}
						</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent
						className="w-48 p-0"
						style={{ zIndex: 'var(--z-submenu)' }}
					>
						<DropdownMenuItem
							onSelect={() => handleRegistrationFilterSelect('registered')}
						>
							<span className="flex-1">
								{i18n.getMessage(
									'phone_filter_registration_registered',
									isLocalized
								) || 'Registered'}
							</span>
							{registrationFilter === 'registered' && (
								<Check className="mr-2 size-4 text-primary" />
							)}
							{registrationStats && (
								<span className="text-muted-foreground text-xs">
									({registrationStats.registered})
								</span>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={() => handleRegistrationFilterSelect('unknown')}
						>
							<span className="flex-1">
								{i18n.getMessage(
									'phone_filter_registration_unknown',
									isLocalized
								) || 'Unknown'}
							</span>
							{registrationFilter === 'unknown' && (
								<Check className="mr-2 size-4 text-primary" />
							)}
							{registrationStats && (
								<span className="text-muted-foreground text-xs">
									({registrationStats.unknown})
								</span>
							)}
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Calendar className="mr-2 size-4" />
						<span>
							{i18n.getMessage('phone_filter_date_range', isLocalized) ||
								'Date Range'}
						</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent
						className="w-auto p-0"
						style={{ zIndex: 'var(--z-submenu)' }}
					>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<span>
									{i18n.getMessage('phone_filter_messages', isLocalized) ||
										'Messages'}
								</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent
								className="w-auto p-0"
								style={{ zIndex: 'var(--z-submenu-nested)' }}
							>
								<div className="min-w-[56rem] p-3">
									<InlineDateRangePicker
										{...(messagesRange ? { value: messagesRange } : {})}
										isLocalized={isLocalized}
										onRangeChangeAction={handleMessagesRangeChange}
									/>
								</div>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<span>
									{i18n.getMessage('phone_filter_reservations', isLocalized) ||
										'Reservations'}
								</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent
								className="w-auto p-0"
								style={{ zIndex: 'var(--z-submenu-nested)' }}
							>
								<div className="min-w-[56rem] p-3">
									<InlineDateRangePicker
										{...(reservationsRange ? { value: reservationsRange } : {})}
										isLocalized={isLocalized}
										onRangeChangeAction={handleReservationsRangeChange}
									/>
								</div>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
