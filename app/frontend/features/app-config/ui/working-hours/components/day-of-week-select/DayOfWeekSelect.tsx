import { useMemo } from 'react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/select'
import { DAYS_OF_WEEK } from '../../lib'

type DayOfWeekSelectProps = {
	value: number
	onChange: (day: number) => void
	disabledDays?: number[]
}

export const DayOfWeekSelect = ({
	value,
	onChange,
	disabledDays,
}: DayOfWeekSelectProps) => {
	const disabledSet = useMemo(() => new Set(disabledDays ?? []), [disabledDays])
	return (
		<Select
			onValueChange={(val) => onChange(Number.parseInt(val, 10))}
			value={String(value)}
		>
			<SelectTrigger>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{DAYS_OF_WEEK.map((day) => (
					<SelectItem
						disabled={disabledSet.has(day.value) && day.value !== value}
						key={day.value}
						value={String(day.value)}
					>
						{day.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
