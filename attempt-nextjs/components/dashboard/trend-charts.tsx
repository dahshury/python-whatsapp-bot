"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  FunnelChart,
  Funnel,
  LabelList
} from "recharts"
import type {
  DailyData,
  TypeDistribution,
  TimeSlotData,
  DayOfWeekData,
  MonthlyTrend,
  FunnelData,
  CustomerSegment
} from "@/types/dashboard"
import { i18n } from "@/lib/i18n"

interface TrendChartsProps {
  dailyTrends: DailyData[]
  typeDistribution: TypeDistribution[]
  timeSlots: TimeSlotData[]
  dayOfWeekData: DayOfWeekData[]
  monthlyTrends: MonthlyTrend[]
  funnelData: FunnelData[]
  customerSegments: CustomerSegment[]
  isRTL: boolean
}

export function TrendCharts({
  dailyTrends,
  typeDistribution,
  timeSlots,
  dayOfWeekData,
  monthlyTrends,
  funnelData,
  customerSegments,
  isRTL
}: TrendChartsProps) {
  const colors = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", 
    "#0088fe", "#00c49f", "#ffbb28", "#ff8042", "#8dd1e1"
  ]

  // Helper function to translate day names
  const translateDayName = (dayName: string, isShort = false) => {
    const dayMap = {
      'Monday': isShort ? 'day_mon' : 'day_monday',
      'Tuesday': isShort ? 'day_tue' : 'day_tuesday', 
      'Wednesday': isShort ? 'day_wed' : 'day_wednesday',
      'Thursday': isShort ? 'day_thu' : 'day_thursday',
      'Friday': isShort ? 'day_fri' : 'day_friday',
      'Saturday': isShort ? 'day_sat' : 'day_saturday',
      'Sunday': isShort ? 'day_sun' : 'day_sunday',
      'Mon': 'day_mon',
      'Tue': 'day_tue',
      'Wed': 'day_wed', 
      'Thu': 'day_thu',
      'Fri': 'day_fri',
      'Sat': 'day_sat',
      'Sun': 'day_sun'
    }
    
    const key = dayMap[dayName as keyof typeof dayMap]
    return key ? i18n.getMessage(key, isRTL) : dayName
  }

  // Transform daily trends data with translated dates
  const transformedDailyTrends = dailyTrends.map(trend => ({
    ...trend,
    displayDate: new Date(trend.date).toLocaleDateString(isRTL ? 'ar' : 'en', { 
      month: 'short', 
      day: 'numeric' 
    })
  }))

  // Transform type distribution with translated labels
  const transformedTypeDistribution = typeDistribution.map(type => ({
    ...type,
    label: type.type === 0 
      ? i18n.getMessage('appt_checkup', isRTL)
      : i18n.getMessage('appt_followup', isRTL)
  }))

  // Transform day of week data with translated day names
  const transformedDayOfWeekData = dayOfWeekData.map(data => ({
    ...data,
    day: translateDayName(data.day, false)
  }))

  // Transform time slots with translated types
  const transformedTimeSlots = timeSlots.map(slot => ({
    ...slot,
    typeLabel: slot.type === 'regular' 
      ? i18n.getMessage('slot_regular', isRTL)
      : slot.type === 'saturday'
      ? i18n.getMessage('slot_saturday', isRTL)
      : slot.type === 'ramadan'
      ? i18n.getMessage('slot_ramadan', isRTL)
      : i18n.getMessage('slot_unknown', isRTL)
  }))

  // Sort funnel data from highest to lowest count then translate stage names
  const sortedFunnel = [...funnelData].sort((a,b) => b.count - a.count)

  const transformedFunnelData = sortedFunnel.map(stage => {
    let translatedStage = stage.stage
    
    switch (stage.stage.toLowerCase()) {
      case 'conversations':
        translatedStage = i18n.getMessage('funnel_conversations', isRTL)
        break
      case 'made reservation':
        translatedStage = i18n.getMessage('funnel_made_reservation', isRTL)
        break
      case 'returned for another':
        translatedStage = i18n.getMessage('funnel_returned_for_another', isRTL)
        break
      case 'cancelled':
        translatedStage = i18n.getMessage('funnel_cancelled', isRTL)
        break
      default:
        translatedStage = stage.stage
    }
    
    return {
      ...stage,
      stage: translatedStage
    }
  })

  // Transform customer segments with translated names
  const transformedCustomerSegments = customerSegments.map(segment => {
    let translatedSegment = segment.segment
    
    switch (segment.segment.toLowerCase()) {
      case 'new (1 visit)':
        translatedSegment = i18n.getMessage('segment_new_1_visit', isRTL)
        break
      case 'returning (2-5 visits)':
        translatedSegment = i18n.getMessage('segment_returning_2_5_visits', isRTL)
        break
      case 'loyal (6+ visits)':
        translatedSegment = i18n.getMessage('segment_loyal_6_plus_visits', isRTL)
        break
      case 'new customers':
        translatedSegment = i18n.getMessage('segment_new_customers', isRTL)
        break
      case 'regular customers':
        translatedSegment = i18n.getMessage('segment_regular_customers', isRTL)
        break
      case 'vip customers':
        translatedSegment = i18n.getMessage('segment_vip_customers', isRTL)
        break
      case 'inactive customers':
        translatedSegment = i18n.getMessage('segment_inactive_customers', isRTL)
        break
      default:
        translatedSegment = segment.segment
    }
    
    return {
      ...segment,
      segment: translatedSegment
    }
  })

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
      {/* Daily Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="lg:col-span-2"
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{i18n.getMessage('chart_daily_trends_overview', isRTL)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={transformedDailyTrends}>
                  <defs>
                    <linearGradient id="colorReservations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCancellations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorModifications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff7300" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ff7300" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="reservations"
                    stroke="#8884d8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReservations)"
                    name={i18n.getMessage('dashboard_reservations', isRTL)}
                  />
                  <Area
                    type="monotone"
                    dataKey="cancellations"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCancellations)"
                    name={i18n.getMessage('kpi_cancellations', isRTL)}
                  />
                  <Area
                    type="monotone"
                    dataKey="modifications"
                    stroke="#ff7300"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorModifications)"
                    name={i18n.getMessage('operation_modifications', isRTL)}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>



      {/* Type Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{i18n.getMessage('chart_appointment_type_distribution', isRTL)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={transformedTypeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="label"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {transformedTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Popular Time Slots */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{i18n.getMessage('chart_popular_time_slots', isRTL)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transformedTimeSlots}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#8884d8" 
                    radius={[4, 4, 0, 0]}
                    name={i18n.getMessage('dashboard_reservations', isRTL)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly Activity Pattern */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="lg:col-span-2"
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{i18n.getMessage('chart_weekly_activity_pattern', isRTL)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transformedDayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="reservations" 
                    fill="#8884d8" 
                    radius={[4, 4, 0, 0]}
                    name={i18n.getMessage('dashboard_reservations', isRTL)}
                  />
                  <Bar 
                    dataKey="cancellations" 
                    fill="#82ca9d" 
                    radius={[4, 4, 0, 0]}
                    name={i18n.getMessage('kpi_cancellations', isRTL)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Performance Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="lg:col-span-2"
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{i18n.getMessage('chart_monthly_performance_trends', isRTL)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reservations"
                    stroke="#8884d8"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    name={i18n.getMessage('dashboard_reservations', isRTL)}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversations"
                    stroke="#82ca9d"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    name={i18n.getMessage('msg_messages', isRTL)}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Conversion Funnel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{i18n.getMessage('chart_conversion_funnel', isRTL)}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {i18n.getMessage('chart_conversion_funnel_desc', isRTL)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Funnel
                    dataKey="count"
                    data={transformedFunnelData}
                    isAnimationActive
                    fill="#8884d8"
                    nameKey="stage"
                  >
                    <LabelList position="center" fill="#fff" fontSize={10} />
                    {transformedFunnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Funnel>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Customer Segments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{i18n.getMessage('chart_customer_segments', isRTL)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={transformedCustomerSegments}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ segment, percentage }) => `${segment} ${percentage.toFixed(1)}%`}
                  >
                    {transformedCustomerSegments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 