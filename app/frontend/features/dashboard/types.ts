import type { ConversationMessage as CalendarConversationMessage } from '@/entities/conversation'
import type { Reservation as CalendarReservation } from '@/entities/event'
export type DashboardStats = {
	totalReservations: number
	totalCancellations: number
	// Unique customers who had their FIRST reservation within the selected period
	uniqueCustomers: number
	conversionRate: number
	returningCustomers: number
	returningRate: number
	avgFollowups: number
	avgResponseTime: number
	// Customers who have at least one upcoming reservation (future-dated)
	activeCustomers: number
	// Period-over-period trend metrics for KPI cards
	trends?: {
		// Higher is better
		totalReservations?: { percentChange: number; isPositive: boolean }
		// Active customers trend may be undefined due to semantics of "upcoming"
		activeCustomers?: { percentChange: number; isPositive: boolean }
		// Lower is better
		cancellations?: { percentChange: number; isPositive: boolean }
		// Lower is better
		avgResponseTime?: { percentChange: number; isPositive: boolean }
		// Higher is better
		avgFollowups?: { percentChange: number; isPositive: boolean }
		// Higher is better (first-time customers within the period)
		uniqueCustomers?: { percentChange: number; isPositive: boolean }
		// Higher is better
		conversionRate?: { percentChange: number; isPositive: boolean }
	}
}

export type PrometheusMetrics = {
	cpu_percent?: number
	memory_bytes?: number
	process_cpu_percent?: number
	process_memory_bytes?: number
	reservations_requested_total?: number
	reservations_successful_total?: number
	reservations_failed_total?: number
	reservations_cancellation_requested_total?: number
	reservations_cancellation_successful_total?: number
	reservations_cancellation_failed_total?: number
	reservations_modification_requested_total?: number
	reservations_modification_successful_total?: number
	reservations_modification_failed_total?: number
}

export type DailyData = {
	date: string
	reservations: number
	cancellations: number
	modifications: number
}

export type TypeDistribution = {
	type: number
	label: string
	count: number
}

export type TimeSlotData = {
	slot: string
	time: string
	count: number
	normalized: number
	type: 'regular' | 'saturday' | 'ramadan' | 'unknown'
	availDays: number
}

export type MessageHeatmapData = {
	weekday: string
	hour: number
	count: number
}

export type CustomerActivity = {
	wa_id: string
	messageCount: number
	reservationCount: number
	lastActivity: string
}

export type ConversationAnalysis = {
	avgMessageLength: number
	avgWordsPerMessage: number
	avgMessagesPerCustomer: number
	totalMessages: number
	uniqueCustomers: number
	responseTimeStats: {
		avg: number
		median: number
		max: number
	}
	messageCountDistribution: {
		avg: number
		median: number
		max: number
	}
}

export type WordFrequency = {
	word: string
	count: number
}

export type DayOfWeekData = {
	day: string
	reservations: number
	cancellations: number
	cancelRate: number
}

export type MonthlyTrend = {
	month: string
	reservations: number
	cancellations: number
	conversations: number
	growth?: number
}

export type FunnelData = {
	stage: string
	count: number
	percentage?: number
}

export type CustomerSegment = {
	segment: string
	count: number
	percentage: number
	avgReservations: number
}

export type DashboardData = {
	_isMockData?: boolean // Optional marker to detect mock data usage
	stats: DashboardStats
	prometheusMetrics: PrometheusMetrics
	dailyTrends: DailyData[]
	typeDistribution: TypeDistribution[]
	timeSlots: TimeSlotData[]
	messageHeatmap: MessageHeatmapData[]
	topCustomers: CustomerActivity[]
	conversationAnalysis: ConversationAnalysis
	wordFrequency: WordFrequency[]
	dayOfWeekData: DayOfWeekData[]
	monthlyTrends: MonthlyTrend[]
	funnelData: FunnelData[]
	customerSegments: CustomerSegment[]
}

type DateRange = {
	from: Date
	to: Date
}

export type DashboardFilters = {
	dateRange: DateRange
	customerType?: 'all' | 'new' | 'returning'
	reservationType?: 'all' | 'checkup' | 'followup'
}

// Dashboard-augmented domain types
export type DashboardConversationMessage = CalendarConversationMessage & {
	ts?: string
	text?: string
	datetime?: string
	sender?: string
	author?: string
	date?: string
	time?: string
	message?: string
	role?: string
}

export type DashboardReservation = CalendarReservation & {
	start?: string
	end?: string
	updated_at?: string
	modified_at?: string
	last_modified?: string
	modified_on?: string
	update_ts?: string
	title?: string
	cancelled?: boolean
	date?: string
	time_slot?: string
	time?: string
	history?: Array<{ ts?: string; timestamp?: string }>
	type?: number
}
