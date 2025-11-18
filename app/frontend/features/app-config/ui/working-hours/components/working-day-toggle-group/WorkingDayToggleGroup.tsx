import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { DAYS_OF_WEEK } from '../../lib'

type WorkingDayToggleGroupProps = {
	value: number[]
	onChange: (days: number[]) => void
}

export const WorkingDayToggleGroup = ({
	value,
	onChange,
}: WorkingDayToggleGroupProps) => {
	const safeValue = Array.isArray(value) ? value : []
	const selectedValues = safeValue.map(String)

	return (
		<ToggleGroup
			onValueChange={(newValues) => {
				const days = newValues.map((val) => Number.parseInt(val, 10)).sort()
				onChange(days)
			}}
			size="lg"
			spacing={0}
			type="multiple"
			value={selectedValues}
			variant="outline"
		>
			{DAYS_OF_WEEK.map((day) => (
				<ToggleGroupItem
					aria-label={`Toggle ${day.label}`}
					key={day.value}
					value={String(day.value)}
				>
					{day.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}
