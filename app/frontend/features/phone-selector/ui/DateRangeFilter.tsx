'use client'

import { Calendar, MessageCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { DateRangeFilter as DateRangeFilterType } from '../hooks/useDateRangeFilter'
import { FilterButtonGroup } from './FilterButtonGroup'

type DateRangeFilterProps = {
	dateRangeFilter: DateRangeFilterType
	formatDateRangeLabel: (filter: DateRangeFilterType) => string
	onRemove: () => void
}

export function DateRangeFilter({
	dateRangeFilter,
	formatDateRangeLabel,
	onRemove,
}: DateRangeFilterProps) {
	const Icon = dateRangeFilter.type === 'messages' ? MessageCircle : Calendar

	return (
		<FilterButtonGroup
			filterButton={
				<Button
					className="h-[18px] gap-1 px-1.5 text-xs"
					size="sm"
					variant="outline"
				>
					<Icon className="size-3" />
					<span>{formatDateRangeLabel(dateRangeFilter)}</span>
				</Button>
			}
			onRemove={(event) => {
				event.stopPropagation()
				onRemove()
			}}
		/>
	)
}
