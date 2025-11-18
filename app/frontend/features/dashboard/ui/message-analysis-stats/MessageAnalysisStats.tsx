'use client'

import { i18n } from '@shared/libs/i18n'
import { motion } from 'framer-motion'
import { Clock, MessageSquare, TrendingUp, Users } from 'lucide-react'
import type { ConversationAnalysis } from '@/features/dashboard/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

type MessageAnalysisStatsProps = {
	conversationAnalysis: ConversationAnalysis
	isLocalized: boolean
}

export function MessageAnalysisStats({
	conversationAnalysis,
	isLocalized,
}: MessageAnalysisStatsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 [&>*]:h-full">
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="h-full"
				initial={{ opacity: 0, y: 20 }}
				transition={{ delay: 0.1 }}
			>
				<Card className="h-full">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{i18n.getMessage('msg_total_messages', isLocalized)}
						</CardTitle>
						<MessageSquare className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{conversationAnalysis.totalMessages.toLocaleString()}
						</div>
						<p className="text-muted-foreground text-xs">
							{i18n.getMessage('msg_across_all_conversations', isLocalized)}
						</p>
					</CardContent>
				</Card>
			</motion.div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="h-full"
				initial={{ opacity: 0, y: 20 }}
				transition={{ delay: 0.2 }}
			>
				<Card className="h-full">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{i18n.getMessage('msg_avg_message_length', isLocalized)}
						</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{conversationAnalysis.avgMessageLength.toFixed(0)}
						</div>
						<p className="text-muted-foreground text-xs">
							{i18n.getMessage('msg_chars', isLocalized)} •{' '}
							{conversationAnalysis.avgWordsPerMessage.toFixed(0)}{' '}
							{i18n.getMessage('msg_words_avg', isLocalized)}
						</p>
					</CardContent>
				</Card>
			</motion.div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="h-full"
				initial={{ opacity: 0, y: 20 }}
				transition={{ delay: 0.3 }}
			>
				<Card className="h-full">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{i18n.getMessage('msg_avg_response_time', isLocalized)}
						</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{(() => {
							const avgSeconds = conversationAnalysis.responseTimeStats.avg * 60
							const medianSeconds =
								conversationAnalysis.responseTimeStats.median * 60
							const avgFormatted =
								avgSeconds < 60
									? {
											value: avgSeconds,
											unit: i18n.getMessage('msg_seconds', isLocalized) || 's',
										}
									: {
											value: conversationAnalysis.responseTimeStats.avg,
											unit: i18n.getMessage('msg_minutes', isLocalized),
										}
							const medianFormatted =
								medianSeconds < 60
									? {
											value: medianSeconds,
											unit: i18n.getMessage('msg_seconds', isLocalized) || 's',
										}
									: {
											value: conversationAnalysis.responseTimeStats.median,
											unit: i18n.getMessage('msg_minutes', isLocalized),
										}
							return (
								<>
									<div className="font-bold text-2xl">
										{avgFormatted.value.toFixed(1)}
										{avgFormatted.unit}
									</div>
									<p className="text-muted-foreground text-xs">
										{i18n.getMessage('msg_median', isLocalized)}{' '}
										{medianFormatted.value.toFixed(1)}
										{medianFormatted.unit}
									</p>
								</>
							)
						})()}
					</CardContent>
				</Card>
			</motion.div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="h-full"
				initial={{ opacity: 0, y: 20 }}
				transition={{ delay: 0.4 }}
			>
				<Card className="h-full">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{i18n.getMessage('msg_messages_per_customer', isLocalized)}
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{conversationAnalysis.avgMessagesPerCustomer.toFixed(1)}
						</div>
						<p className="text-muted-foreground text-xs">
							{i18n.getMessage('msg_average_conversation_length', isLocalized)}
						</p>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	)
}
