'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/shared/ui/skeleton'
import type { DashboardData } from '../../types'

const ResponseTimeAnalysis = dynamic(
	() =>
		import('../../dashboard/response-time-analysis').then(
			(m) => m.ResponseTimeAnalysis
		),
	{ ssr: false, loading: () => <Skeleton className="h-[22rem] w-full" /> }
)

const ConversationLengthAnalysis = dynamic(
	() =>
		import('../../dashboard/conversation-length-analysis').then(
			(m) => m.ConversationLengthAnalysis
		),
	{ ssr: false, loading: () => <Skeleton className="h-[22rem] w-full" /> }
)

const MessageAnalysis = dynamic(
	() =>
		import('../../dashboard/message-analysis').then((m) => m.MessageAnalysis),
	{ ssr: false, loading: () => <Skeleton className="h-[28rem] w-full" /> }
)

type MessagesTabProps = {
	isLocalized: boolean
	safeDashboard: DashboardData
}

export function MessagesTab({ isLocalized, safeDashboard }: MessagesTabProps) {
	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
			<div className="lg:col-span-6">
				<ResponseTimeAnalysis
					conversationAnalysis={safeDashboard.conversationAnalysis}
					isLocalized={isLocalized}
				/>
			</div>
			<div className="lg:col-span-6">
				<ConversationLengthAnalysis
					conversationAnalysis={safeDashboard.conversationAnalysis}
					isLocalized={isLocalized}
				/>
			</div>
			<div className="lg:col-span-12">
				<MessageAnalysis
					conversationAnalysis={safeDashboard.conversationAnalysis}
					isLocalized={isLocalized}
					messageHeatmap={safeDashboard.messageHeatmap}
					topCustomers={safeDashboard.topCustomers}
					wordFrequency={safeDashboard.wordFrequency}
				/>
			</div>
		</div>
	)
}
