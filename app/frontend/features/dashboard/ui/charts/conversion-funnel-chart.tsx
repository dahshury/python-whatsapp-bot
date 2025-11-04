'use client'

import { motion } from 'framer-motion'
import {
	Cell,
	Funnel,
	FunnelChart,
	LabelList,
	ResponsiveContainer,
	Tooltip,
} from 'recharts'
import { transformFunnelData } from '@/features/dashboard/services'
import type { FunnelData } from '@/features/dashboard/types'
import { useThemeColors } from '@/shared/libs/hooks/use-theme-colors'
import { i18n } from '@/shared/libs/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { getChartColors, getTooltipStyle } from './chart-utils'

// Add wrappers to avoid @types/recharts v1 typings conflict with Recharts v3
const FunnelComp = Funnel as unknown as React.ComponentType<
	Record<string, unknown>
>

type ConversionFunnelChartProps = {
	funnelData: FunnelData[]
	isLocalized: boolean
}

export function ConversionFunnelChart({
	funnelData,
	isLocalized,
}: ConversionFunnelChartProps) {
	const themeColors = useThemeColors()
	const chartColors = getChartColors(themeColors)
	const tooltipStyle = getTooltipStyle(themeColors)
	const transformedFunnelData = transformFunnelData(funnelData, isLocalized)

	return (
		<motion.div initial={false}>
			<Card className="h-full">
				<CardHeader>
					<CardTitle>
						{i18n.getMessage('chart_conversion_funnel', isLocalized)}
					</CardTitle>
					<p className="mt-1 text-muted-foreground text-sm">
						{i18n.getMessage('chart_conversion_funnel_desc', isLocalized)}
					</p>
				</CardHeader>
				<CardContent>
					<div className="h-[21.875rem]">
						<ResponsiveContainer height="100%" width="100%">
							<FunnelChart>
								<FunnelComp
									data={transformedFunnelData}
									dataKey="count"
									fill={themeColors.primary}
									isAnimationActive={false}
									nameKey="stage"
								>
									<LabelList
										fill={themeColors.background}
										fontSize={10}
										position="center"
									/>
									{/* Chart cells use index as key since data order is stable */}
									{transformedFunnelData.map((entry, index) => (
										<Cell
											fill={chartColors[index % chartColors.length]}
											key={`funnel-cell-${entry.stage}`}
										/>
									))}
								</FunnelComp>
								<Tooltip contentStyle={tooltipStyle} />
							</FunnelChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}
