"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { motion } from "framer-motion"
import { MessageSquare, Clock, Users, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react"
import type { 
  MessageHeatmapData, 
  CustomerActivity, 
  ConversationAnalysis, 
  WordFrequency 
} from "@/types/dashboard"
import { i18n } from "@/lib/i18n"
import { useCustomerData } from "@/lib/customer-data-context"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { CustomerStatsCard } from "@/components/customer-stats-card"
import { useSidebarChatStore } from "@/lib/sidebar-chat-store"

interface MessageAnalysisProps {
  messageHeatmap: MessageHeatmapData[]
  topCustomers: CustomerActivity[]
  conversationAnalysis: ConversationAnalysis
  wordFrequency: WordFrequency[]
  isRTL: boolean
}

export function MessageAnalysis({ 
  messageHeatmap, 
  topCustomers, 
  conversationAnalysis, 
  wordFrequency,
  isRTL
}: MessageAnalysisProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const customersPerPage = 10
  const maxCustomers = 100
  
  // Add mock customers if not enough data for testing pagination
  const paddedCustomers = (() => {
    const customers = topCustomers.slice(0, maxCustomers)
    
    // If we have fewer than 25 customers, add some mock ones for testing
    if (customers.length < 25) {
      const mockCustomers = []
      for (let i = customers.length; i < 25; i++) {
        mockCustomers.push({
          wa_id: `+966${500000000 + i}`,
          messageCount: Math.floor(Math.random() * 50) + 1,
          reservationCount: Math.floor(Math.random() * 5),
          lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
      }
      return [...customers, ...mockCustomers]
    }
    
    return customers
  })()
  
  const limitedCustomers = paddedCustomers
  const totalPages = Math.ceil(limitedCustomers.length / customersPerPage)

  const { customers: customerDirectory, conversations, reservations } = useCustomerData()
  const { openConversation } = useSidebarChatStore()

  useEffect(() => {
    setCurrentPage(0)
  }, [topCustomers])

  const getCustomerName = (wa_id: string) => {
    const entry = customerDirectory.find(c => c.phone === wa_id)
    return entry?.name || wa_id
  }

  // Helper function to translate day names
  const translateDayName = (dayName: string) => {
    const dayMap = {
      'Monday': 'day_monday',
      'Tuesday': 'day_tuesday',
      'Wednesday': 'day_wednesday', 
      'Thursday': 'day_thursday',
      'Friday': 'day_friday',
      'Saturday': 'day_saturday',
      'Sunday': 'day_sunday'
    }
    
    const key = dayMap[dayName as keyof typeof dayMap]
    return key ? i18n.getMessage(key, isRTL) : dayName
  }

  // Create heatmap grid
  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const maxCount = Math.max(...messageHeatmap.map(d => d.count), 1)

  const getHeatmapValue = (day: string, hour: number) => {
    const data = messageHeatmap.find(d => d.weekday === day && d.hour === hour)
    return data ? data.count : 0
  }

  const getIntensity = (count: number) => {
    const intensity = count / maxCount
    if (intensity === 0) return 'bg-gray-100'
    if (intensity < 0.2) return 'bg-blue-100'
    if (intensity < 0.4) return 'bg-blue-200'
    if (intensity < 0.6) return 'bg-blue-300'
    if (intensity < 0.8) return 'bg-blue-400'
    return 'bg-blue-500'
  }

  const paginatedCustomers = limitedCustomers.slice(
    currentPage * customersPerPage, 
    (currentPage + 1) * customersPerPage
  )

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
  }

  const handleCustomerClick = (wa_id: string) => {
    openConversation(wa_id)
  }

  // Enhanced word frequency processing with customer vs assistant breakdown
  const enhancedWordFrequency = React.useMemo(() => {
    // Create word breakdown from conversations if available
    if (conversations && Object.keys(conversations).length > 0) {
      const wordStats = new Map<string, { customerCount: number; assistantCount: number }>()
      
      Object.values(conversations).forEach(messages => {
        if (Array.isArray(messages)) {
          messages.forEach(message => {
            if (message && message.message) {
              const words = message.message.toLowerCase()
                .replace(/[^\w\s\u0600-\u06FF]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 2)
              
              const isAssistant = message.role === 'assistant'
              
              words.forEach(word => {
                if (!wordStats.has(word)) {
                  wordStats.set(word, { customerCount: 0, assistantCount: 0 })
                }
                const stats = wordStats.get(word)!
                if (isAssistant) {
                  stats.assistantCount++
        } else {
                  stats.customerCount++
                }
              })
            }
          })
        }
      })
      
      return Array.from(wordStats.entries())
        .map(([word, stats]) => ({
          word,
          customerCount: stats.customerCount,
          assistantCount: stats.assistantCount,
          totalCount: stats.customerCount + stats.assistantCount
        }))
        .sort((a, b) => b.totalCount - a.totalCount)
        .slice(0, 20)
    }
    
    // Fallback to original wordFrequency data
    return wordFrequency.slice(0, 20).map(word => ({
      word: word.word,
      customerCount: Math.floor(word.count * 0.7), // Estimate
      assistantCount: Math.ceil(word.count * 0.3), // Estimate  
      totalCount: word.count
    }))
  }, [conversations, wordFrequency])

  // Debug pagination state
  console.log('Pagination Debug:', {
    currentPage,
    totalPages,
    customersPerPage,
    limitedCustomersLength: limitedCustomers.length,
    topCustomersLength: topCustomers.length,
    paginatedCustomersLength: paginatedCustomers.length,
    prevDisabled: currentPage === 0,
    nextDisabled: currentPage >= totalPages - 1
  })

  return (
    <div className="space-y-6">
      {/* Message Analysis Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 [&>*]:h-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          className="h-full"
          >
          <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {i18n.getMessage('msg_total_messages', isRTL)}
                </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold">{conversationAnalysis.totalMessages.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                {i18n.getMessage('msg_across_all_conversations', isRTL)}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          className="h-full"
          >
          <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {i18n.getMessage('msg_avg_message_length', isRTL)}
                </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold">{conversationAnalysis.avgMessageLength.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">
                {i18n.getMessage('msg_chars', isRTL)} • {conversationAnalysis.avgWordsPerMessage.toFixed(0)} {i18n.getMessage('msg_words_avg', isRTL)}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          className="h-full"
          >
          <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {i18n.getMessage('msg_avg_response_time', isRTL)}
                </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold">{conversationAnalysis.responseTimeStats.avg.toFixed(1)}{i18n.getMessage('msg_minutes', isRTL)}</div>
                <p className="text-xs text-muted-foreground">
                {i18n.getMessage('msg_median', isRTL)} {conversationAnalysis.responseTimeStats.median.toFixed(1)}{i18n.getMessage('msg_minutes', isRTL)}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          className="h-full"
          >
          <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {i18n.getMessage('msg_messages_per_customer', isRTL)}
                </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold">{conversationAnalysis.avgMessagesPerCustomer.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                {i18n.getMessage('msg_average_conversation_length', isRTL)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
      </div>

      {/* Message Volume Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{i18n.getMessage('msg_volume_heatmap', isRTL)}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {i18n.getMessage('msg_activity_patterns', isRTL)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Hour labels row */}
              <div className="flex items-center">
                <div className="w-12 flex-shrink-0"></div>
                <div className="flex flex-1">
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className="flex-1 text-center text-muted-foreground text-[10px] leading-tight min-w-[18px]"
                    >
                      {hour.toString().padStart(2, '0')}
                    </div>
                  ))}
                </div>
                </div>
                
              {/* Days and heatmap rows */}
              {daysOrder.map(day => (
                <div key={day} className="flex items-center">
                  <div className="w-12 flex-shrink-0 text-muted-foreground text-[10px] text-right pr-2 leading-tight">
                    {translateDayName(day).slice(0, 3)}
                    </div>
                  <div className="flex flex-1">
                    {hours.map(hour => {
                      const count = getHeatmapValue(day, hour)
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`relative flex-1 aspect-square ${getIntensity(count)} hover:scale-110 transition-transform cursor-default min-w-[18px] border border-gray-300/30`}
                          style={{ minHeight: '18px' }}
                          title={`${translateDayName(day)} ${hour}:00 - ${count} ${i18n.getMessage('msg_messages', isRTL)}`}
                        >
                          {count > 0 && (
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-gray-800 select-none">
                              {count}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  </div>
                ))}
                
                {/* Legend */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
                <span>{i18n.getMessage('msg_less', isRTL)}</span>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300/30"></div>
                  <div className="w-4 h-4 bg-blue-100 border border-gray-300/30"></div>
                  <div className="w-4 h-4 bg-blue-200 border border-gray-300/30"></div>
                  <div className="w-4 h-4 bg-blue-300 border border-gray-300/30"></div>
                  <div className="w-4 h-4 bg-blue-400 border border-gray-300/30"></div>
                  <div className="w-4 h-4 bg-blue-500 border border-gray-300/30"></div>
                </div>
                <span>{i18n.getMessage('msg_more', isRTL)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Customers and Word Frequency */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Most Active Customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{i18n.getMessage('msg_most_active_customers', isRTL)} {maxCustomers})</CardTitle>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {i18n.getMessage('msg_page', isRTL)} {currentPage + 1} {i18n.getMessage('msg_of', isRTL)} {totalPages}
                  </Badge>
                  <Badge variant="outline">
                    {limitedCustomers.length} {i18n.getMessage('msg_total', isRTL)}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {i18n.getMessage('msg_previous', isRTL)}
                  </Button>
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages - 1}
                    variant="outline"
                    size="sm"
                  >
                    {i18n.getMessage('msg_next', isRTL)}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {paginatedCustomers.map((customer, index) => {
                  const globalIndex = currentPage * customersPerPage + index + 1
                  const initials = customer.wa_id.replace(/[^a-zA-Z0-9]/g, '').slice(-2).toUpperCase()
                  
                  return (
                    <motion.div
                      key={customer.wa_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            #{globalIndex}
                          </span>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <p 
                                className="text-sm font-medium cursor-pointer truncate max-w-[180px] hover:text-blue-600"
                                onClick={() => handleCustomerClick(customer.wa_id)}
                              >
                                {getCustomerName(customer.wa_id)}
                              </p>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-[300px] p-0">
                              <CustomerStatsCard
                                selectedConversationId={customer.wa_id}
                                conversations={conversations}
                                reservations={reservations}
                                isRTL={isRTL}
                                isHoverCard={true}
                              />
                            </HoverCardContent>
                          </HoverCard>
                          <p className="text-xs text-muted-foreground">
                            {i18n.getMessage('msg_last', isRTL)} {new Date(customer.lastActivity).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {customer.messageCount} {i18n.getMessage('msg_msgs', isRTL)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {customer.reservationCount} {i18n.getMessage('msg_bookings', isRTL)}
                          </Badge>
                        </div>
                        <Progress 
                          value={(customer.messageCount / Math.max(...limitedCustomers.map(c => c.messageCount))) * 100} 
                          className="h-1.5 w-20"
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Most Common Words */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{i18n.getMessage('msg_most_common_words', isRTL)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isRTL ? "الكلمات الأكثر شيوعاً في المحادثات" : "Most frequently used words in conversations"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {enhancedWordFrequency.map((word, index) => {
                  const maxCount = Math.max(...enhancedWordFrequency.map(w => w.totalCount))
                  const customerPercentage = (word.customerCount / maxCount) * 100
                  const assistantPercentage = (word.assistantCount / maxCount) * 100
                  
                  return (
                    <motion.div
                      key={word.word}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-medium">{word.word}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {word.totalCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-end space-x-3">
                        {/* Combined usage indicators */}
                        <div className="flex items-center space-x-2 text-xs">
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                            <span className="text-blue-600">{word.customerCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                            <span className="text-green-600">{word.assistantCount}</span>
                          </div>
                        </div>
                        {/* Combined progress bar with numbers inside */}
                        <div className="w-32 h-8 bg-gray-200 rounded-md overflow-hidden relative">
                          <div className="h-full flex">
                            <div 
                              className="bg-blue-500 transition-all duration-300 relative flex items-center justify-center"
                              style={{ width: `${(word.customerCount / word.totalCount) * 100}%` }}
                            >
                              {word.customerCount > 0 && (
                                <span className="text-white text-xs font-medium absolute inset-0 flex items-center justify-center">
                                  {word.customerCount}
                                </span>
                              )}
                            </div>
                            <div 
                              className="bg-green-500 transition-all duration-300 relative flex items-center justify-center"
                              style={{ width: `${(word.assistantCount / word.totalCount) * 100}%` }}
                            >
                              {word.assistantCount > 0 && (
                                <span className="text-white text-xs font-medium absolute inset-0 flex items-center justify-center">
                                  {word.assistantCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 