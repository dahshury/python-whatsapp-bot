export interface DashboardStats {
	totalReservations: number;
	totalCancellations: number;
	// Unique customers who had their FIRST reservation within the selected period
	uniqueCustomers: number;
	conversionRate: number;
	returningCustomers: number;
	returningRate: number;
	avgFollowups: number;
	avgResponseTime: number;
	// Customers who have at least one upcoming reservation (future-dated)
	activeCustomers: number;
	// Period-over-period trend metrics for KPI cards
	trends?: {
		// Higher is better
		totalReservations?: { percentChange: number; isPositive: boolean };
		// Active customers trend may be undefined due to semantics of "upcoming"
		activeCustomers?: { percentChange: number; isPositive: boolean };
		// Lower is better
		cancellations?: { percentChange: number; isPositive: boolean };
		// Lower is better
		avgResponseTime?: { percentChange: number; isPositive: boolean };
		// Higher is better
		avgFollowups?: { percentChange: number; isPositive: boolean };
		// Higher is better (first-time customers within the period)
		uniqueCustomers?: { percentChange: number; isPositive: boolean };
		// Higher is better
		conversionRate?: { percentChange: number; isPositive: boolean };
	};
}

export interface PrometheusMetrics {
	cpu_percent?: number;
	memory_bytes?: number;
	reservations_requested_total?: number;
	reservations_successful_total?: number;
	reservations_failed_total?: number;
	reservations_cancellation_requested_total?: number;
	reservations_cancellation_successful_total?: number;
	reservations_cancellation_failed_total?: number;
	reservations_modification_requested_total?: number;
	reservations_modification_successful_total?: number;
	reservations_modification_failed_total?: number;
}

export interface DailyData {
	date: string;
	reservations: number;
	cancellations: number;
	modifications: number;
}

export interface TypeDistribution {
	type: number;
	label: string;
	count: number;
}

export interface TimeSlotData {
	slot: string;
	time: string;
	count: number;
	normalized: number;
	type: "regular" | "saturday" | "ramadan" | "unknown";
	availDays: number;
}

export interface MessageData {
	wa_id: string;
	date: string;
	time: string;
	message: string;
	datetime: Date;
	hour: number;
	weekday: string;
	length_chars: number;
	length_words: number;
}

export interface MessageHeatmapData {
	weekday: string;
	hour: number;
	count: number;
}

export interface CustomerActivity {
	wa_id: string;
	messageCount: number;
	reservationCount: number;
	lastActivity: string;
}

export interface ConversationAnalysis {
	avgMessageLength: number;
	avgWordsPerMessage: number;
	avgMessagesPerCustomer: number;
	totalMessages: number;
	uniqueCustomers: number;
	responseTimeStats: {
		avg: number;
		median: number;
		max: number;
	};
	messageCountDistribution: {
		avg: number;
		median: number;
		max: number;
	};
}

export interface WordFrequency {
	word: string;
	count: number;
}

export interface DayOfWeekData {
	day: string;
	reservations: number;
	cancellations: number;
	cancelRate: number;
}

export interface MonthlyTrend {
	month: string;
	reservations: number;
	cancellations: number;
	conversations: number;
	growth?: number;
}

export interface FunnelData {
	stage: string;
	count: number;
	percentage?: number;
}

export interface CustomerSegment {
	segment: string;
	count: number;
	percentage: number;
	avgReservations: number;
}

export interface DashboardData {
	_isMockData?: boolean; // Optional marker to detect mock data usage
	stats: DashboardStats;
	prometheusMetrics: PrometheusMetrics;
	dailyTrends: DailyData[];
	typeDistribution: TypeDistribution[];
	timeSlots: TimeSlotData[];
	messageHeatmap: MessageHeatmapData[];
	topCustomers: CustomerActivity[];
	conversationAnalysis: ConversationAnalysis;
	wordFrequency: WordFrequency[];
	dayOfWeekData: DayOfWeekData[];
	monthlyTrends: MonthlyTrend[];
	funnelData: FunnelData[];
	customerSegments: CustomerSegment[];
}

export interface DateRange {
	from: Date;
	to: Date;
}

export interface DashboardFilters {
	dateRange: DateRange;
	customerType?: "all" | "new" | "returning";
	reservationType?: "all" | "checkup" | "followup";
}
