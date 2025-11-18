'use client'

import { motion } from 'framer-motion'
import { LabelList, Pie, PieChart } from 'recharts'
import {
	buildSegmentChartConfig,
	buildSegmentChartItems,
	transformCustomerSegments,
} from '@/features/dashboard/services'
import type { CustomerSegment } from '@/features/dashboard/types'
import { i18n } from '@/shared/libs/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/shared/ui/chart'

type CustomerSegmentsChartProps = {
	customerSegments: CustomerSegment[]
	isLocalized: boolean
}

export function CustomerSegmentsChart({
	customerSegments,
	isLocalized,
}: CustomerSegmentsChartProps) {
	const transformedCustomerSegments = transformCustomerSegments(
		customerSegments,
		isLocalized
	)
	const segmentItems = buildSegmentChartItems(transformedCustomerSegments)
	const segmentChartConfig = buildSegmentChartConfig(segmentItems)

	return (
		<motion.div initial={false}>
			<Card className="h-full">
				<CardHeader>
					<CardTitle>
						{i18n.getMessage('chart_customer_segments', isLocalized)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer
						className="mx-auto max-h-[18.75rem] w-full [&_.recharts-text]:fill-background"
						config={segmentChartConfig}
					>
						<PieChart>
							<ChartTooltip
								content={<ChartTooltipContent hideLabel nameKey="name" />}
							/>
							<Pie
								cornerRadius={8}
								data={segmentItems}
								dataKey="count"
								innerRadius={30}
								paddingAngle={4}
								radius={10}
							>
								<LabelList
									dataKey="count"
									fill="currentColor"
									fontSize={12}
									fontWeight={500}
									formatter={(value: number) => value.toString()}
									stroke="none"
								/>
							</Pie>
						</PieChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</motion.div>
	)
}
