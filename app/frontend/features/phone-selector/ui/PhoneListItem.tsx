'use client'

import { cn } from '@shared/libs/utils'
import { CheckCircle2, Clock } from 'lucide-react'
import type { IndexedPhoneOption } from '@/shared/libs/phone/indexed.types'
import { CommandItem } from '@/shared/ui/command'
import { Flag as FlagComponent } from '@/shared/ui/flag'

type PhoneListItemProps = {
	option: IndexedPhoneOption
	groupKey: 'selected' | 'recent' | 'all'
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
	const isSelectedGroup = groupKey === 'selected'
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
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<div
					className={cn(
						'flex min-w-0 flex-1 flex-col',
						isSelectedGroup ? 'space-y-1' : 'space-y-2'
					)}
				>
					<span
						className={cn(
							'truncate font-medium text-foreground leading-tight',
							isSelectedGroup ? 'text-xs' : 'text-sm'
						)}
					>
						{option.name || option.displayNumber || option.number}
					</span>
					<div className="flex items-center gap-1.5">
						{isRecentGroup && (
							<Clock className="size-3 text-muted-foreground" />
						)}
						<FlagComponent
							className="max-w-full scale-75 overflow-hidden opacity-60"
							country={optionCountry}
						/>
						<span
							className={cn(
								'truncate text-muted-foreground leading-tight',
								isSelectedGroup ? 'text-xs' : 'text-sm'
							)}
						>
							{option.displayNumber || option.number}
						</span>
					</div>
				</div>
				{selectedPhone === option.number && (
					<CheckCircle2
						className={cn(
							'shrink-0 text-primary',
							isSelectedGroup ? 'size-3.5' : 'size-4'
						)}
					/>
				)}
			</div>
		</CommandItem>
	)
}
