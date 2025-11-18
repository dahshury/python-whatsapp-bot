'use client'

import { cn } from '@shared/libs/utils'
import { CheckCircle2, Clock, Star } from 'lucide-react'
import type { IndexedPhoneOption } from '@/shared/libs/phone/indexed.types'
import { CommandItem } from '@/shared/ui/command'
import { Flag as FlagComponent } from '@/shared/ui/flag'

type PhoneListItemProps = {
	option: IndexedPhoneOption
	groupKey: 'selected' | 'favorites' | 'recent' | 'all'
	selectedPhone: string
	onSelect: (phoneNumber: string) => void
}

export function PhoneListItem({
	option,
	groupKey,
	selectedPhone,
	onSelect,
}: PhoneListItemProps) {
	const uniqueKey = option.id || option.number
	const optionCountry =
		(option as unknown as { __country?: string }).__country ||
		(option as unknown as { country?: string }).country ||
		''
	const isRecentGroup = groupKey === 'recent'
	const isFavoritesGroup = groupKey === 'favorites'
	const isSelectedGroup = groupKey === 'selected'
	const rawName = typeof option.name === 'string' ? option.name.trim() : ''
	const hasName = rawName.length > 0
	const displayNumber = option.displayNumber || option.number
	const itemClassName = cn(
		'gap-2 px-2.5',
		isSelectedGroup ? 'py-1.5' : 'py-2.5',
		isSelectedGroup &&
			'border-l-2 border-l-primary bg-primary/5 hover:bg-primary/10 data-[selected=true]:bg-primary/10'
	)

	return (
		<CommandItem
			className={itemClassName}
			data-option-number={option.number}
			key={`${groupKey}-${uniqueKey}`}
			onSelect={() => onSelect(option.number)}
			value={option.number}
		>
			<div className="flex w-full items-stretch gap-2">
				{isRecentGroup || isFavoritesGroup ? (
					<div className="flex shrink-0 items-center justify-center self-stretch px-1.5">
						{isFavoritesGroup ? (
							<Star
								className={cn(
									'text-amber-500',
									isSelectedGroup ? 'size-3.5' : 'size-4'
								)}
								fill="currentColor"
							/>
						) : (
							<Clock
								className={cn(
									'text-muted-foreground',
									isSelectedGroup ? 'size-3.5' : 'size-4'
								)}
							/>
						)}
					</div>
				) : (
					<div className="flex shrink-0 items-center justify-center self-stretch">
						<FlagComponent
							className="h-full w-10 min-w-[2.5rem] overflow-hidden rounded-sm"
							country={optionCountry}
							showBackground={false}
						/>
					</div>
				)}
				<div
					className={cn(
						'flex min-w-0 flex-1',
						hasName ? 'flex-col justify-center gap-1' : 'items-center'
					)}
				>
					{hasName ? (
						<>
							<span
								className={cn(
									'truncate font-medium text-foreground leading-tight',
									isSelectedGroup ? 'text-xs' : 'text-sm'
								)}
							>
								{rawName}
							</span>
							<div className="flex items-center gap-1.5">
								{(isRecentGroup || isFavoritesGroup) && (
									<FlagComponent
										className="h-4 w-6 overflow-hidden rounded-sm opacity-70"
										country={optionCountry}
									/>
								)}
								<span
									className={cn(
										'truncate text-muted-foreground leading-tight',
										isSelectedGroup ? 'text-xs' : 'text-sm'
									)}
								>
									{displayNumber}
								</span>
							</div>
						</>
					) : (
						<div className="flex w-full items-center gap-1.5">
							{(isRecentGroup || isFavoritesGroup) && (
								<FlagComponent
									className="h-4 w-6 overflow-hidden rounded-sm opacity-70"
									country={optionCountry}
								/>
							)}
							<span
								className={cn(
									'truncate font-medium text-foreground leading-tight',
									isSelectedGroup ? 'text-xs' : 'text-sm'
								)}
							>
								{displayNumber}
							</span>
						</div>
					)}
				</div>
				{selectedPhone === option.number && (
					<CheckCircle2
						className={cn(
							'shrink-0 self-center text-primary',
							isSelectedGroup ? 'size-3.5' : 'size-4'
						)}
					/>
				)}
			</div>
		</CommandItem>
	)
}
