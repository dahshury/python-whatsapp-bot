'use client'

import { useDashboardData } from '@shared/libs/data/websocket-data-provider'
import { differenceInDays, format, subDays } from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { logger } from '@/shared/libs/logger'
import type { DashboardData, DashboardFilters } from '../types'

const DEFAULT_DATE_RANGE_DAYS = 30
const FILTER_DEBOUNCE_MS = 250

type SafeDashboardData = DashboardData

export interface EnhancedDashboardControllerResult {
	filters: DashboardFilters
	setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>
	daysCount: number
	defaultDateRange: { from: Date; to: Date }
	dashboardData: DashboardData | null
	safeDashboard: SafeDashboardData
	isLoading: boolean
	error: string | null
	isUsingMockData: boolean
	isInitialized: boolean
	activeTab: string
	setActiveTab: (value: string) => void
	handleDateRangeChange: (dateRange: DateRange | undefined) => void
	handleExport: () => void
	refreshDashboard: ReturnType<typeof useDashboardData>['refresh']
}

const defaultStats: DashboardData['stats'] = {
	activeCustomers: 0,
	avgFollowups: 0,
	avgResponseTime: 0,
	conversionRate: 0,
	returningCustomers: 0,
	returningRate: 0,
	totalCancellations: 0,
	totalReservations: 0,
	uniqueCustomers: 0,
}

const defaultConversationAnalysis: DashboardData['conversationAnalysis'] = {
	avgMessageLength: 0,
	avgMessagesPerCustomer: 0,
	avgWordsPerMessage: 0,
	messageCountDistribution: {
		avg: 0,
		max: 0,
		median: 0,
	},
	responseTimeStats: {
		avg: 0,
		max: 0,
		median: 0,
	},
	totalMessages: 0,
	uniqueCustomers: 0,
}

const emptySafeDashboard: SafeDashboardData = {
	_isMockData: false,
	stats: defaultStats,
	prometheusMetrics: {},
	dailyTrends: [],
	typeDistribution: [],
	timeSlots: [],
	messageHeatmap: [],
	topCustomers: [],
	conversationAnalysis: defaultConversationAnalysis,
	wordFrequency: [],
	dayOfWeekData: [],
	monthlyTrends: [],
	funnelData: [],
	customerSegments: [],
}

function formatYmd(date: Date): string {
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

export function useEnhancedDashboardController(): EnhancedDashboardControllerResult {
	const defaultDateRange = useMemo(
		() => ({
			from: subDays(new Date(), DEFAULT_DATE_RANGE_DAYS),
			to: new Date(),
		}),
		[]
	)

	const [filters, setFilters] = useState<DashboardFilters>({
		dateRange: defaultDateRange,
	})
	const [activeTab, setActiveTab] = useState('overview')
	const [isInitialized, setIsInitialized] = useState(false)
	const [isUsingMockData, setIsUsingMockData] = useState(false)

	const {
		dashboardData,
		isLoading,
		error,
		refresh: refreshDashboard,
	} = useDashboardData()

	useEffect(() => {
		if (!isInitialized) {
			const fromDate = formatYmd(defaultDateRange.from)
			const toDate = formatYmd(defaultDateRange.to)
			refreshDashboard({ fromDate, toDate })
				.then(() => {
					setIsInitialized(true)
				})
				.catch((caughtError) => {
					logger.error(
						'[EnhancedDashboardController] Failed to load initial dashboard data',
						caughtError
					)
				})
		}
	}, [defaultDateRange, isInitialized, refreshDashboard])

	useEffect(() => {
		if (!(isInitialized && filters.dateRange?.from && filters.dateRange?.to)) {
			return () => {
				// no cleanup required
			}
		}
		const fromDate = formatYmd(filters.dateRange.from)
		const toDate = formatYmd(filters.dateRange.to)
		const timeoutId = setTimeout(() => {
			refreshDashboard({ fromDate, toDate }).catch((caughtError) => {
				logger.error(
					'[EnhancedDashboardController] Failed to refresh dashboard data after filter change',
					caughtError
				)
			})
		}, FILTER_DEBOUNCE_MS)
		return () => clearTimeout(timeoutId)
	}, [filters, refreshDashboard, isInitialized])

	useEffect(() => {
		setIsUsingMockData(Boolean(dashboardData?._isMockData))
	}, [dashboardData])

	const daysCount = useMemo(() => {
		const from = filters.dateRange?.from
		const to = filters.dateRange?.to
		if (!(from && to)) {
			return 0
		}
		return differenceInDays(to, from) + 1
	}, [filters])

	const safeDashboard = useMemo<SafeDashboardData>(() => {
		if (!dashboardData) {
			return emptySafeDashboard
		}
		return {
			_isMockData: dashboardData._isMockData ?? false,
			stats: dashboardData.stats ?? defaultStats,
			prometheusMetrics: dashboardData.prometheusMetrics ?? {},
			dailyTrends: dashboardData.dailyTrends ?? [],
			typeDistribution: dashboardData.typeDistribution ?? [],
			timeSlots: dashboardData.timeSlots ?? [],
			messageHeatmap: dashboardData.messageHeatmap ?? [],
			topCustomers: dashboardData.topCustomers ?? [],
			conversationAnalysis:
				dashboardData.conversationAnalysis ?? defaultConversationAnalysis,
			wordFrequency: dashboardData.wordFrequency ?? [],
			dayOfWeekData: dashboardData.dayOfWeekData ?? [],
			monthlyTrends: dashboardData.monthlyTrends ?? [],
			funnelData: dashboardData.funnelData ?? [],
			customerSegments: dashboardData.customerSegments ?? [],
		}
	}, [dashboardData])

	const handleDateRangeChange = useCallback(
		(dateRange: DateRange | undefined) => {
			if (dateRange?.from && dateRange?.to) {
				setFilters((prev) => ({
					...prev,
					dateRange: {
						from: dateRange.from as Date,
						to: dateRange.to as Date,
					},
				}))
			}
		},
		[]
	)

	const handleExport = useCallback(() => {
		if (!dashboardData) {
			return
		}
		const dataToExport = {
			exportedAt: new Date().toISOString(),
			dateRange: filters.dateRange,
			stats: dashboardData.stats,
			dailyTrends: dashboardData.dailyTrends,
			typeDistribution: dashboardData.typeDistribution,
			timeSlots: dashboardData.timeSlots,
			topCustomers: dashboardData.topCustomers,
			conversationAnalysis: dashboardData.conversationAnalysis,
		}
		const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
			type: 'application/json',
		})
		const url = URL.createObjectURL(blob)
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = `dashboard-export-${format(new Date(), 'yyyy-MM-dd')}.json`
		document.body.appendChild(anchor)
		anchor.click()
		document.body.removeChild(anchor)
		URL.revokeObjectURL(url)
	}, [dashboardData, filters.dateRange])

	return {
		filters,
		setFilters,
		daysCount,
		defaultDateRange,
		dashboardData,
		safeDashboard,
		isLoading,
		error,
		isUsingMockData,
		isInitialized,
		activeTab,
		setActiveTab,
		handleDateRangeChange,
		handleExport,
		refreshDashboard,
	}
}
