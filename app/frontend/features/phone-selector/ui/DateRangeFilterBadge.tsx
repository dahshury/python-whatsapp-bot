'use client'

import { Calendar, MessageCircle, X } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import type { DateRangeFilter } from '../hooks/useDateRangeFilter'

type DateRangeFilterBadgeProps = {
	dateRangeFilter: DateRangeFilter
	formatDateRangeLabel: (filter: DateRangeFilter) => string
	onRemove: () => void
}

export function DateRangeFilterBadge({
	dateRangeFilter,
	formatDateRangeLabel,
	onRemove,
}: DateRangeFilterBadgeProps) {
	const Icon = dateRangeFilter.type === 'messages' ? MessageCircle : Calendar

	return (
		<Badge className="cursor-pointer gap-1 text-xs" variant="default">
			<Icon className="size-3" />
			<span>{formatDateRangeLabel(dateRangeFilter)}</span>
			<X
				className="size-3"
				onClick={(event) => {
					event.stopPropagation()
					onRemove()
				}}
			/>
		</Badge>
	)
}
