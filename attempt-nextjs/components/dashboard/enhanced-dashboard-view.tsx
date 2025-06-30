"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon, Download } from "lucide-react"
import { motion } from "framer-motion"
import { format, subDays, differenceInDays } from "date-fns"

import { KPICards } from "./kpi-cards"
import { TrendCharts } from "./trend-charts"
import { MessageAnalysis } from "./message-analysis"
import { OperationMetrics } from "./operation-metrics"
import { ResponseTimeAnalysis } from "./response-time-analysis"
import { ConversationLengthAnalysis } from "./conversation-length-analysis"
import { DashboardService } from "@/lib/services/dashboard-service"
import { useDashboardData } from "@/lib/unified-data-provider"
import type { DashboardData, DashboardFilters } from "@/types/dashboard"
import type { DateRange } from "react-day-picker"
import { useLanguage } from "@/lib/language-context"
import { i18n } from "@/lib/i18n"

export function EnhancedDashboardView() {
  const { isRTL } = useLanguage()
  const { dashboardData, isLoading, error, lastUpdated, refresh, reprocess } = useDashboardData()
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date()
    }
  })

  // Calculate days count properly
  const daysCount = React.useMemo(() => {
    if (!filters.dateRange?.from || !filters.dateRange?.to) return 0
    return differenceInDays(filters.dateRange.to, filters.dateRange.from) + 1
  }, [filters.dateRange])

  // Reprocess dashboard data when filters change (no API calls)
  useEffect(() => {
    // Only reprocess if we already have dashboard data and filters changed
    if (dashboardData && filters) {
      reprocess(filters).catch(err => {
        console.error('Dashboard data reprocessing error:', err)
      })
    }
  }, [filters, reprocess]) // Use reprocess instead of refresh to avoid API calls

  // Check if using mock data
  useEffect(() => {
    setIsUsingMockData(!!dashboardData?._isMockData)
  }, [dashboardData])

  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    if (dateRange?.from && dateRange?.to) {
      setFilters(prev => ({
        ...prev,
        dateRange: {
          from: dateRange.from as Date,
          to: dateRange.to as Date
        }
      }))
    }
  }

  // Fixed date range shortcuts to calculate from current date
  const handleSevenDaysClick = () => {
    const today = new Date()
    const sevenDaysAgo = subDays(today, 7)
    handleDateRangeChange({ 
      from: sevenDaysAgo, 
      to: today 
    })
  }

  const handleThirtyDaysClick = () => {
    const today = new Date()
    const thirtyDaysAgo = subDays(today, 30)
    handleDateRangeChange({ 
      from: thirtyDaysAgo, 
      to: today 
    })
  }



  const handleExport = () => {
    if (!dashboardData) return
    
    const dataToExport = {
      exportedAt: new Date().toISOString(),
      dateRange: filters.dateRange,
      stats: dashboardData.stats,
      dailyTrends: dashboardData.dailyTrends,
      typeDistribution: dashboardData.typeDistribution,
      timeSlots: dashboardData.timeSlots,
      topCustomers: dashboardData.topCustomers,
      conversationAnalysis: dashboardData.conversationAnalysis
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-export-${format(new Date(), 'yyyy-MM-dd')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">{i18n.getMessage('dashboard_error_title', isRTL)}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => refresh(filters)} variant="outline">
              {i18n.getMessage('dashboard_try_again', isRTL)}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{i18n.getMessage('dashboard_title', isRTL)}</h1>
          <p className="text-muted-foreground">
            {i18n.getMessage('dashboard_subtitle', isRTL)}
          </p>
          {isUsingMockData && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{i18n.getMessage('dashboard_demo_mode', isRTL)}:</strong> {i18n.getMessage('dashboard_demo_description', isRTL)}
              </p>
            </div>
          )}
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              {i18n.getMessage('dashboard_last_updated', isRTL)} {format(lastUpdated, 'PPp')}
              {isUsingMockData && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  {i18n.getMessage('dashboard_demo_data', isRTL)}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
          <div className="flex flex-col gap-2">
            {/* Days and Reservations badges row */}
            {filters.dateRange && dashboardData && (
              <div className="flex items-center gap-2 self-start">
                <Badge variant="secondary">
                  {daysCount} {i18n.getMessage('dashboard_days', isRTL)}
                </Badge>
                <Badge variant="outline">
                  {dashboardData.stats.totalReservations} {i18n.getMessage('dashboard_reservations', isRTL)}
                </Badge>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <DatePickerWithRange
                value={filters.dateRange}
                onChange={handleDateRangeChange}
                placeholder={i18n.getMessage('dashboard_select_date_range', isRTL)}
              />
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSevenDaysClick}
                  variant="outline"
                  size="sm"
                >
                  {i18n.getMessage('dashboard_seven_days', isRTL)}
                </Button>
                <Button
                  onClick={handleThirtyDaysClick}
                  variant="outline"
                  size="sm"
                >
                  {i18n.getMessage('dashboard_thirty_days', isRTL)}
                </Button>
              </div>
              


              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                disabled={!dashboardData}
              >
                <Download className="w-4 h-4 mr-2" />
                {i18n.getMessage('dashboard_export', isRTL)}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoading && !dashboardData && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="space-y-0 pb-2">
                  <Skeleton className="h-4 w-[120px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[80px]" />
                  <Skeleton className="h-3 w-[100px] mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-[150px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      {dashboardData && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="overview">{i18n.getMessage('dashboard_overview', isRTL)}</TabsTrigger>
            <TabsTrigger value="trends">{i18n.getMessage('dashboard_trends', isRTL)}</TabsTrigger>
            <TabsTrigger value="messages">{i18n.getMessage('dashboard_messages', isRTL)}</TabsTrigger>
            <TabsTrigger value="insights">{i18n.getMessage('dashboard_insights', isRTL)}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <KPICards 
              stats={dashboardData.stats}
              prometheusMetrics={dashboardData.prometheusMetrics}
              isRTL={isRTL}
            />

            <OperationMetrics
              prometheusMetrics={dashboardData.prometheusMetrics}
              isRTL={isRTL}
            />
            
            {/* Quick Overview Charts */}
            <TrendCharts
              dailyTrends={dashboardData.dailyTrends} // Use filtered data from date picker
              typeDistribution={dashboardData.typeDistribution}
              timeSlots={dashboardData.timeSlots}
              dayOfWeekData={dashboardData.dayOfWeekData}
              monthlyTrends={dashboardData.monthlyTrends}
              funnelData={dashboardData.funnelData}
              customerSegments={dashboardData.customerSegments}
              isRTL={isRTL}
            />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <TrendCharts
              dailyTrends={dashboardData.dailyTrends}
              typeDistribution={dashboardData.typeDistribution}
              timeSlots={dashboardData.timeSlots}
              dayOfWeekData={dashboardData.dayOfWeekData}
              monthlyTrends={dashboardData.monthlyTrends}
              funnelData={dashboardData.funnelData}
              customerSegments={dashboardData.customerSegments}
              isRTL={isRTL}
            />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <ResponseTimeAnalysis
              conversationAnalysis={dashboardData.conversationAnalysis}
              isRTL={isRTL}
            />
            
            <ConversationLengthAnalysis
              conversationAnalysis={dashboardData.conversationAnalysis}
              isRTL={isRTL}
            />
            
            <MessageAnalysis
              messageHeatmap={dashboardData.messageHeatmap}
              topCustomers={dashboardData.topCustomers}
              conversationAnalysis={dashboardData.conversationAnalysis}
              wordFrequency={dashboardData.wordFrequency}
              isRTL={isRTL}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid gap-6">
              {/* Response Time Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>{i18n.getMessage('response_time_insights', isRTL)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {dashboardData.conversationAnalysis.responseTimeStats.avg <= 2 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800">
                          {i18n.getMessage('response_time_excellent', isRTL)}
                        </p>
                      </div>
                    )}
                    {dashboardData.conversationAnalysis.responseTimeStats.avg > 2 && dashboardData.conversationAnalysis.responseTimeStats.avg <= 5 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800">
                          {i18n.getMessage('response_time_good', isRTL)}
                        </p>
                      </div>
                    )}
                    {dashboardData.conversationAnalysis.responseTimeStats.avg > 5 && dashboardData.conversationAnalysis.responseTimeStats.avg <= 10 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800">
                          {i18n.getMessage('response_time_needs_improvement', isRTL)}
                        </p>
                      </div>
                    )}
                    {dashboardData.conversationAnalysis.responseTimeStats.avg > 10 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800">
                          {i18n.getMessage('response_time_poor', isRTL)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Conversation Engagement Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>{i18n.getMessage('conversation_insights', isRTL)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {dashboardData.conversationAnalysis.avgMessagesPerCustomer >= 20 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800">
                          {i18n.getMessage('conversation_insight_high', isRTL)}
                        </p>
                      </div>
                    )}
                    {dashboardData.conversationAnalysis.avgMessagesPerCustomer >= 10 && dashboardData.conversationAnalysis.avgMessagesPerCustomer < 20 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800">
                          {i18n.getMessage('conversation_insight_medium', isRTL)}
                        </p>
                      </div>
                    )}
                    {dashboardData.conversationAnalysis.avgMessagesPerCustomer < 10 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800">
                          {i18n.getMessage('conversation_insight_low', isRTL)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Business Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>{i18n.getMessage('dashboard_business_insights', isRTL)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <h4 className="font-semibold text-blue-900">{i18n.getMessage('dashboard_peak_hours_title', isRTL)}</h4>
                      <p className="text-blue-800 text-sm mt-1">
                        {i18n.getMessage('dashboard_peak_hours_desc', isRTL)}
                      </p>
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {i18n.getMessage('demo_data_warning', isRTL)}
                      </span>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <h4 className="font-semibold text-green-900">{i18n.getMessage('dashboard_customer_retention_title', isRTL)}</h4>
                      <p className="text-green-800 text-sm mt-1">
                        {isRTL ? 
                          `${dashboardData.stats.returningRate.toFixed(1)}% من العملاء يعودون لحجوزات أخرى. هذا يدل على رضا جيد عن الخدمة.` :
                          `${dashboardData.stats.returningRate.toFixed(1)}% of customers return for follow-up appointments. This indicates good service satisfaction.`
                        }
                      </p>
                      <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {i18n.getMessage('real_data_available', isRTL)}
                      </span>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                      <h4 className="font-semibold text-orange-900">{i18n.getMessage('dashboard_response_time_title', isRTL)}</h4>
                      <p className="text-orange-800 text-sm mt-1">
                        {isRTL ? 
                          `متوسط زمن الاستجابة هو ${dashboardData.stats.avgResponseTime.toFixed(1)} دقيقة. فكر في تطبيق ردود تلقائية للاستفسارات الشائعة.` :
                          `Average response time is ${dashboardData.stats.avgResponseTime.toFixed(1)} minutes. Consider implementing automated responses for common queries.`
                        }
                      </p>
                      <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                        {i18n.getMessage('real_data_available', isRTL)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
} 