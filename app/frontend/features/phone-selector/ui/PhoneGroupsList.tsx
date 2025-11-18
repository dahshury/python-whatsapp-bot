'use client'

import { cn } from '@shared/libs/utils'
import React from 'react'
import type { IndexedPhoneOption } from '@/shared/libs/phone/indexed.types'
import type { PhoneGroup } from '@/shared/libs/phone/phone-groups'
import { CommandGroup, CommandSeparator } from '@/shared/ui/command'
import { PhoneGroupHeading } from './PhoneGroupHeading'
import { PhoneListItem } from './PhoneListItem'

type PhoneGroupsListProps = {
	filteredGroups: PhoneGroup<IndexedPhoneOption>[]
	selectedPhone: string
	onSelect: (phoneNumber: string) => void
	selectedHeading: string
	favoritesHeading: string
	recentHeading: string
	allHeading: string
	allTotalCount?: number
}

export function PhoneGroupsList({
	filteredGroups,
	selectedPhone,
	onSelect,
	selectedHeading,
	favoritesHeading,
	recentHeading,
	allHeading,
	allTotalCount,
}: PhoneGroupsListProps) {
	return (
		<>
			{filteredGroups.map((group, groupIndex) => {
				const isSelectedGroup = group.key === 'selected'
				const isLastSelectedGroup =
					isSelectedGroup &&
					(groupIndex === filteredGroups.length - 1 ||
						filteredGroups[groupIndex + 1]?.key !== 'selected')
				return (
					<React.Fragment key={group.key}>
						<CommandGroup
							className={cn(
								isSelectedGroup && 'border-primary/20 border-b bg-primary/5'
							)}
							dir="ltr"
							heading={
								<PhoneGroupHeading
									allHeading={allHeading}
									count={
										group.key === 'all' && allTotalCount
											? allTotalCount
											: group.items.length
									}
									favoritesHeading={favoritesHeading}
									groupKey={group.key}
									recentHeading={recentHeading}
									selectedHeading={selectedHeading}
								/>
							}
						>
							{group.items.map((option) => (
								<PhoneListItem
									groupKey={group.key}
									key={`${group.key}-${option.id || option.number}`}
									onSelect={onSelect}
									option={option}
									selectedPhone={selectedPhone}
								/>
							))}
						</CommandGroup>
						{isLastSelectedGroup && <CommandSeparator />}
					</React.Fragment>
				)
			})}
		</>
	)
}
