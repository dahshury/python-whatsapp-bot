'use client'

import { motion } from 'framer-motion'
import { useId, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { transformTimeSlots } from '@/features/dashboard/services'
import { buildTimeSlotsChartConfig } from '@/features/dashboard/services/chart-config-builders'
import type { TimeSlotData } from '@/features/dashboard/types'
import { BAR_TOP_RADIUS } from '@/features/dashboard/utils/chart-constants'
import { i18n } from '@/shared/libs/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/shared/ui/chart'
import { getBarFillOpacity } from './chart-utils'

// Add wrappers to avoid @types/recharts v1 typings conflict with Recharts v3
const XAxisComp = XAxis as unknown as React.ComponentType<
	Record<string, unknown>
>
const YAxisComp = YAxis as unknown as React.ComponentType<
	Record<string, unknown>
>

type TimeSlotsChartProps = {
	timeSlots: TimeSlotData[]
	isLocalized: boolean
}

export function TimeSlotsChart({
	timeSlots,
	isLocalized,
}: TimeSlotsChartProps) {
	const patternId = useId()
	const [activeIndex, setActiveIndex] = useState<number | null>(null)
	const config = buildTimeSlotsChartConfig(isLocalized)
	const transformedTimeSlots = transformTimeSlots(timeSlots, isLocalized)

	return (
		<motion.div initial={false}>
			<Card className="h-full">
				<CardHeader>
					<CardTitle>
						{i18n.getMessage('chart_popular_time_slots', isLocalized)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer className="h-[21.875rem] w-full" config={config}>
						<BarChart
							data={transformedTimeSlots}
							onMouseLeave={() => setActiveIndex(null)}
						>
							<rect
								fill={`url(#${patternId})`}
								height="85%"
								width="100%"
								x="0"
								y="0"
							/>
							<defs>
								<pattern
									height="10"
									id={patternId}
									patternUnits="userSpaceOnUse"
									width="10"
									x="0"
									y="0"
								>
									<circle
										className="text-muted dark:text-muted/40"
										cx="2"
										cy="2"
										fill="currentColor"
										r="1"
									/>
								</pattern>
							</defs>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxisComp
								angle={-45}
								dataKey="time"
								height={60}
								textAnchor="end"
								tick={{ fontSize: 11 }}
							/>
							<YAxisComp tick={{ fontSize: 12 }} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar
								dataKey="count"
								fill="var(--color-count)"
								radius={BAR_TOP_RADIUS}
							>
								{transformedTimeSlots.map((item, index) => (
									<Cell
										className="duration-200"
										fillOpacity={getBarFillOpacity(activeIndex, index)}
										key={`slot-${item.slot}-${item.time}`}
										onMouseEnter={() => setActiveIndex(index)}
									/>
								))}
							</Bar>
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</motion.div>
	)
}
