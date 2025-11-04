'use client'

import { i18n } from '@shared/libs/i18n'
import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, XAxis as XAxisComp } from 'recharts'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/shared/ui/card'
import type { ChartConfig } from '@/shared/ui/chart'
import { ChartContainer } from '@/shared/ui/chart'
import { MONTH_LABEL_MAX_LENGTH } from '../../dashboard/constants'
import type { EnhancedWordFrequency } from '../../utils/word-frequency'
import { WordCustomBar } from '../word-frequency-chart'

type WordFrequencyChartProps = {
	enhancedWordFrequency: EnhancedWordFrequency[]
	isLocalized: boolean
}

export function WordFrequencyChart({
	enhancedWordFrequency,
	isLocalized,
}: WordFrequencyChartProps) {
	const [wordActiveIndex, setWordActiveIndex] = useState<number | null>(null)

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			initial={{ opacity: 0, y: 20 }}
			transition={{ delay: 0.7 }}
		>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<MessageSquare className="h-5 w-5 text-muted-foreground" />
						{i18n.getMessage('msg_most_common_words', isLocalized)}
					</CardTitle>
					<CardDescription>
						{i18n.getMessage('msg_most_common_words', isLocalized)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer
						className="h-[25rem] w-full"
						config={
							{
								desktop: { label: 'Desktop', color: 'hsl(var(--chart-1))' },
							} as unknown as ChartConfig
						}
					>
						<BarChart
							data={enhancedWordFrequency.map((w) => ({
								month: w.word,
								desktop: w.totalCount,
							}))}
							onMouseLeave={() => setWordActiveIndex(null)}
						>
							<XAxisComp
								axisLine={false}
								dataKey="month"
								tickFormatter={(value) =>
									String(value).slice(0, MONTH_LABEL_MAX_LENGTH)
								}
								tickLine={false}
								tickMargin={10}
							/>
							<Bar
								dataKey="desktop"
								fill="var(--color-desktop)"
								shape={
									<WordCustomBar
										activeIndex={wordActiveIndex}
										setActiveIndex={setWordActiveIndex}
									/>
								}
							/>
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</motion.div>
	)
}
