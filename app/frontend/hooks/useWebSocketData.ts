import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'

// WebSocket message types from backend
type UpdateType = 
  | 'reservation_created'
  | 'reservation_updated' 
  | 'reservation_cancelled'
  | 'reservation_reinstated'
  | 'conversation_new_message'
  | 'vacation_period_updated'
  | 'customer_updated'

interface WebSocketMessage {
  type: UpdateType
  timestamp: string
  data: Record<string, any>
  affected_entities?: string[]
}

interface WebSocketDataState {
  reservations: Record<string, any[]>
  conversations: Record<string, any[]>
  vacations: any[]
  isConnected: boolean
  lastUpdate: string | null
}

interface UseWebSocketDataOptions {
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  reconnectInterval?: number
  enableNotifications?: boolean
  filters?: {
    updateTypes?: UpdateType[]
    entityIds?: string[]
  }
}

export function useWebSocketData(options: UseWebSocketDataOptions = {}) {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 3000,
    enableNotifications = true,
    filters
  } = options

  const [state, setState] = useState<WebSocketDataState>({
    reservations: {},
    conversations: {},
    vacations: [],
    isConnected: false,
    lastUpdate: null
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const messageQueueRef = useRef<WebSocketMessage[]>([])
  const connectingRef = useRef(false) // Prevent multiple connection attempts

  // Get WebSocket URL from environment or default to local
  const getWebSocketUrl = useCallback(() => {
    // For local development, always use ws:// protocol
    const defaultUrl = `ws://localhost:8765`
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || defaultUrl
    console.log('WebSocket URL configured as:', wsUrl)
    return wsUrl
  }, [])

  // Process incoming WebSocket messages
  const processMessage = useCallback((message: WebSocketMessage) => {
    const { type, data, timestamp } = message

    setState(prevState => {
      const newState = { ...prevState, lastUpdate: timestamp }

      switch (type) {
        case 'reservation_created':
        case 'reservation_updated':
        case 'reservation_reinstated':
          // Add or update reservation in the appropriate date group
          const reservationDate = data.date
          if (reservationDate) {
            const dateReservations = newState.reservations[reservationDate] || []
            const existingIndex = dateReservations.findIndex(r => r.id === data.id)
            
            if (existingIndex >= 0) {
              dateReservations[existingIndex] = data
            } else {
              dateReservations.push(data)
            }
            
            newState.reservations = {
              ...newState.reservations,
              [reservationDate]: dateReservations
            }
          }
          break

        case 'reservation_cancelled':
          // Update reservation status or remove if needed
          const cancelledDate = data.date
          if (cancelledDate && newState.reservations[cancelledDate]) {
            newState.reservations = {
              ...newState.reservations,
              [cancelledDate]: newState.reservations[cancelledDate].map(r => 
                r.id === data.id ? { ...r, status: 'cancelled', ...data } : r
              )
            }
          }
          break

        case 'conversation_new_message':
          // Add new conversation message
          const waId = data.wa_id
          if (waId) {
            const customerConversations = newState.conversations[waId] || []
            customerConversations.push(data)
            newState.conversations = {
              ...newState.conversations,
              [waId]: customerConversations
            }
          }
          break

        case 'vacation_period_updated':
          // Update vacation periods
          newState.vacations = data.periods || data
          break

        case 'customer_updated':
          // Handle customer updates - might need to refresh related data
          // This could trigger a broader refresh if needed
          break

        default:
          console.warn('Unknown WebSocket message type:', type)
      }

      return newState
    })

    // Show notification if enabled
    if (enableNotifications) {
      showUpdateNotification(type, data)
    }
  }, [enableNotifications])

  // Show user-friendly notifications for updates
  const showUpdateNotification = useCallback((type: UpdateType, data: any) => {
    switch (type) {
      case 'reservation_created':
        toast({
          title: 'New Reservation',
          description: `Reservation created for ${data.customer_name || data.wa_id} on ${data.date} at ${data.time_slot}`,
          duration: 3000
        })
        break
      case 'reservation_cancelled':
        toast({
          title: 'Reservation Cancelled',
          description: `Reservation for ${data.customer_name || data.wa_id} on ${data.date} has been cancelled`,
          duration: 3000
        })
        break
      case 'conversation_new_message':
        toast({
          title: 'New Message',
          description: `New message from ${data.wa_id}`,
          duration: 2000
        })
        break
      // Add more notification types as needed
    }
  }, [])

  // Connect to WebSocket - now stable function
  const connect = useCallback(() => {
    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN || connectingRef.current) {
      return
    }

    connectingRef.current = true
    try {
      const wsUrl = getWebSocketUrl()
      console.log('Manually connecting to WebSocket:', wsUrl)
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket manually connected')
        setState(prev => ({ ...prev, isConnected: true }))
        reconnectAttemptsRef.current = 0
        connectingRef.current = false

        // Send filters if configured
        if (filters) {
          ws.send(JSON.stringify({
            type: 'set_filter',
            filters
          }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
            processMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket manually disconnected:', event.code, event.reason)
        setState(prev => ({ ...prev, isConnected: false }))
        wsRef.current = null
        connectingRef.current = false
      }

      ws.onerror = (error) => {
        console.error('WebSocket manual connection error:', error)
        connectingRef.current = false
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create manual WebSocket connection:', error)
      connectingRef.current = false
    }
  }, [getWebSocketUrl, filters, processMessage])

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }

    setState(prev => ({ ...prev, isConnected: false }))
  }, [])

  // Manual refresh function for fallback
  const refreshData = useCallback(async () => {
    console.log('Starting data refresh...')
    try {
      // Fallback to API calls if WebSocket is not available
      const [reservationsRes, conversationsRes, vacationsRes] = await Promise.all([
        fetch('/api/reservations').then(r => {
          console.log('Reservations response status:', r.status)
          if (!r.ok) throw new Error(`Reservations API failed: ${r.status}`)
          return r.json()
        }),
        fetch('/api/conversations').then(r => {
          console.log('Conversations response status:', r.status)
          if (!r.ok) throw new Error(`Conversations API failed: ${r.status}`)
          return r.json()
        }),
        fetch('/api/vacations').then(r => {
          console.log('Vacations response status:', r.status)
          if (!r.ok) throw new Error(`Vacations API failed: ${r.status}`)
          return r.json()
        })
      ])

      console.log('All API responses received successfully')
      setState(prev => ({
        ...prev,
        reservations: reservationsRes.data || {},
        conversations: conversationsRes.data || {},
        vacations: vacationsRes.data || [],
        lastUpdate: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to refresh data:', error)
      toast({
        title: 'Refresh Failed',
        description: `Failed to update data from server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
        duration: 8000
      })
    }
  }, [])

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('Initializing WebSocket connection with database integration')
    
    const connectToWebSocket = () => {
      // Prevent multiple connections
      if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN || connectingRef.current) {
        return
      }

      connectingRef.current = true
      try {
        const wsUrl = getWebSocketUrl()
        console.log('Connecting to WebSocket:', wsUrl)
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log('WebSocket connected successfully')
          setState(prev => ({ ...prev, isConnected: true }))
          reconnectAttemptsRef.current = 0
          connectingRef.current = false

          // Send filters if configured
          if (filters) {
            ws.send(JSON.stringify({
              type: 'set_filter',
              filters
            }))
          }

          // Process any queued messages
          while (messageQueueRef.current.length > 0) {
            const queuedMessage = messageQueueRef.current.shift()
            if (queuedMessage) {
              processMessage(queuedMessage)
            }
          }
        }

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            console.log('WebSocket message received:', message)
            processMessage(message)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          setState(prev => ({ ...prev, isConnected: false }))
          wsRef.current = null
          connectingRef.current = false

          // Attempt reconnection if enabled and not manually closed
          if (autoReconnect && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++
            console.log(`Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectToWebSocket()
            }, reconnectInterval * reconnectAttemptsRef.current) // Exponential backoff
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.log('Max reconnection attempts reached')
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          connectingRef.current = false
          toast({
            title: 'Connection Error',
            description: 'Real-time updates temporarily unavailable',
            variant: 'destructive',
            duration: 5000
          })
        }

        wsRef.current = ws
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        connectingRef.current = false
      }
    }

    const timer = setTimeout(() => {
      connectToWebSocket()
    }, 500) // Small delay to prevent immediate multiple calls

    return () => {
      clearTimeout(timer)
      disconnect()
    }
  }, []) // Empty dependency array to prevent reconnection loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Data
    reservations: state.reservations,
    conversations: state.conversations,
    vacations: state.vacations,
    
    // Connection state
    isConnected: state.isConnected,
    lastUpdate: state.lastUpdate,
    
    // Actions
    connect,
    disconnect,
    refreshData,
    
    // Utility
    isReconnecting: reconnectAttemptsRef.current > 0 && !state.isConnected
  }
} 