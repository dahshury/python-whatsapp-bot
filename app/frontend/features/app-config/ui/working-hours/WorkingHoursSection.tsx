'use client'

import { type UseFormReturn, useFieldArray } from 'react-hook-form'
import { cn } from '@/shared/libs/utils'
import type { AppConfigFormValues } from '../../model'
import { CustomCalendarRangesSection } from './sections/custom-ranges'
import { DaySpecificHoursSection } from './sections/day-specific-hours'
import { WorkingDaysCard } from './sections/working-days-card'

type WorkingHoursSectionProps = {
	form: UseFormReturn<AppConfigFormValues>
	className?: string
}

export const WorkingHoursSection = ({
	form,
	className,
}: WorkingHoursSectionProps) => {
	const { control } = form

	const daySpecificHoursArray = useFieldArray({
		control,
		name: 'daySpecificWorkingHours',
	})

	const customRangeArray = useFieldArray({
		control,
		name: 'customCalendarRanges',
	})

	return (
		<div className={cn('w-full space-y-4', className)}>
			<WorkingDaysCard form={form} />
			<DaySpecificHoursSection
				daySpecificHoursArray={daySpecificHoursArray}
				form={form}
			/>
			<CustomCalendarRangesSection
				customRangeArray={customRangeArray}
				form={form}
			/>
		</div>
	)
}
