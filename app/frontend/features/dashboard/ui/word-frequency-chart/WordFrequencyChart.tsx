'use client'

import { i18n } from '@shared/libs/i18n'
import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import {
	MONTH_LABEL_MAX_LENGTH,
	WORD_FREQUENCY_TOP_LIMIT,
} from '../../dashboard/constants'
import type { WordFrequencyByRole } from '../../types'
import { WordCustomBar } from '../word-frequency-chart'

type WordFrequencyChartProps = {
	wordFrequencyByRole?: WordFrequencyByRole
	isLocalized: boolean
}

export function WordFrequencyChart({
	wordFrequencyByRole,
	isLocalized,
}: WordFrequencyChartProps) {
	const [wordActiveIndex, setWordActiveIndex] = useState<number | null>(null)
	const [activeTab, setActiveTab] = useState<'user' | 'assistant'>('user')

	const chartData = useMemo(() => {
		if (!wordFrequencyByRole) {
			return []
		}
		const words = wordFrequencyByRole[activeTab] || []
		return words.slice(0, WORD_FREQUENCY_TOP_LIMIT).map((w) => ({
			month: w.word,
			desktop: w.count,
		}))
	}, [wordFrequencyByRole, activeTab])

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
					<Tabs
						defaultValue="user"
						onValueChange={(value) =>
							setActiveTab(value as 'user' | 'assistant')
						}
					>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="user">
								{i18n.getMessage('msg_customer_words', isLocalized) ||
									'User Words'}
							</TabsTrigger>
							<TabsTrigger value="assistant">
								{i18n.getMessage('msg_assistant_words', isLocalized) ||
									'Assistant Words'}
							</TabsTrigger>
						</TabsList>
						<TabsContent className="mt-4" value="user">
							<ChartContainer
								className="h-[25rem] w-full"
								config={
									{
										desktop: { label: 'Desktop', color: 'hsl(var(--chart-1))' },
									} as unknown as ChartConfig
								}
							>
								<BarChart
									data={chartData}
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
						</TabsContent>
						<TabsContent className="mt-4" value="assistant">
							<ChartContainer
								className="h-[25rem] w-full"
								config={
									{
										desktop: { label: 'Desktop', color: 'hsl(var(--chart-1))' },
									} as unknown as ChartConfig
								}
							>
								<BarChart
									data={chartData}
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
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</motion.div>
	)
}
