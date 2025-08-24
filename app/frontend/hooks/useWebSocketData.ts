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
  | 'metrics_updated'
  | 'snapshot'

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
    // 1) Explicit public override
    const explicit = process.env.NEXT_PUBLIC_WEBSOCKET_URL
    if (explicit) {
      console.log('WebSocket URL (explicit):', explicit)
      return explicit
    }

    // 2) Map backend HTTP URL to WS
    const httpUrl = process.env.PYTHON_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8000'
    try {
      const url = new URL(httpUrl)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      url.pathname = '/ws'
      const mapped = url.toString()
      console.log('WebSocket URL (mapped):', mapped)
      return mapped
    } catch {}

    // 3) Final fallback
    const fallback = 'ws://localhost:8000/ws'
    console.log('WebSocket URL (fallback):', fallback)
    return fallback
  }, [])

  // Process incoming WebSocket messages
  const processMessage = useCallback((message: WebSocketMessage) => {
    const { type, data, timestamp } = message

    setState(prevState => {
      const newState = { ...prevState, lastUpdate: timestamp }

      switch (type) {
        case 'reservation_created':
        case 'reservation_updated':
        case 'reservation_reinstated': {
          // Store reservations grouped by waId (customer), not by date
          const waIdKey: string | undefined = data.wa_id || data.waId
          if (waIdKey) {
            const byCustomer = newState.reservations[waIdKey] || []
            const idx = byCustomer.findIndex((r: any) => String(r.id) === String(data.id))
            if (idx >= 0) byCustomer[idx] = data
            else byCustomer.push(data)
            newState.reservations = { ...newState.reservations, [waIdKey]: byCustomer }
            try { setTimeout(() => { try { const evt = new CustomEvent('realtime', { detail: { type, data } }); window.dispatchEvent(evt) } catch {} }, 0) } catch {}
          }
          break
        }

        case 'reservation_cancelled': {
          // Mark reservation as cancelled within the customer's list; robust fallback if waId not provided
          const waIdKey: string | undefined = data.wa_id || data.waId
          if (waIdKey && newState.reservations[waIdKey]) {
            newState.reservations = {
              ...newState.reservations,
              [waIdKey]: newState.reservations[waIdKey].map((r: any) =>
                String(r.id) === String(data.id) ? { ...r, cancelled: true, ...data } : r
              )
            }
          } else {
            // Fallback: scan all lists to find the reservation id
            const updated: Record<string, any[]> = { ...newState.reservations }
            Object.keys(updated).forEach((k) => {
              const list = updated[k] || []
              let changed = false
              const next = list.map((r: any) => {
                if (String(r.id) === String(data.id)) { changed = true; return { ...r, cancelled: true, ...data } }
                return r
              })
              if (changed) updated[k] = next
            })
            newState.reservations = updated
          }
          try { setTimeout(() => { try { const evt = new CustomEvent('realtime', { detail: { type, data } }); window.dispatchEvent(evt) } catch {} }, 0) } catch {}
          break
        }

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
            try { setTimeout(() => { try { const evt = new CustomEvent('realtime', { detail: { type, data } }); window.dispatchEvent(evt) } catch {} }, 0) } catch {}
          }
          break

        case 'vacation_period_updated':
          // Update vacation periods
          newState.vacations = data.periods || data
          try { setTimeout(() => { try { const evt = new CustomEvent('realtime', { detail: { type, data } }); window.dispatchEvent(evt) } catch {} }, 0) } catch {}
          break

        case 'metrics_updated':
          // Update global metrics for dashboard provider
          try {
            ;(globalThis as any).__prom_metrics__ = data.metrics || {}
          } catch {}
          break
        case 'snapshot':
          // Initial snapshot of all data
          newState.reservations = data.reservations || {}
          newState.conversations = data.conversations || {}
          newState.vacations = data.vacations || []
          try {
            ;(globalThis as any).__prom_metrics__ = data.metrics || {}
          } catch {}
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

        // Send filters if configured, then request data snapshot
        if (filters) {
          ws.send(JSON.stringify({
            type: 'set_filter',
            filters
          }))
        }
        // Request initial snapshot to avoid REST
        try { ws.send(JSON.stringify({ type: 'get_snapshot' })) } catch {}
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
            processMessage(message)
        } catch (error) {
          console.warn('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket manually disconnected:', event.code, event.reason)
        setState(prev => ({ ...prev, isConnected: false }))
        wsRef.current = null
        connectingRef.current = false
      }

      ws.onerror = (error) => {
        console.warn('WebSocket manual connection error:', error)
        connectingRef.current = false
      }

      wsRef.current = ws
    } catch (error) {
      console.warn('Failed to create manual WebSocket connection:', error)
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
        fetch('/api/reservations').then(async r => {
          console.log('Reservations response status:', r.status)
          if (!r.ok) {
            console.warn(`Reservations API not ok: ${r.status}`)
            return { success: false, data: {} }
          }
          try { return await r.json() } catch { return { success: false, data: {} } }
        }),
        fetch('/api/conversations').then(async r => {
          console.log('Conversations response status:', r.status)
          if (!r.ok) {
            console.warn(`Conversations API not ok: ${r.status}`)
            return { success: false, data: {} }
          }
          try { return await r.json() } catch { return { success: false, data: {} } }
        }),
        fetch('/api/vacations').then(async r => {
          console.log('Vacations response status:', r.status)
          if (!r.ok) {
            console.warn(`Vacations API not ok: ${r.status}`)
            return { success: false, data: [] }
          }
          try { return await r.json() } catch { return { success: false, data: [] } }
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
      console.warn('Failed to refresh data:', error)
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

          // Send filters if configured, then request data snapshot
          if (filters) {
            ws.send(JSON.stringify({
              type: 'set_filter',
              filters
            }))
          }
          try { ws.send(JSON.stringify({ type: 'get_snapshot' })) } catch {}

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
            console.warn('Error parsing WebSocket message:', error)
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
          console.warn('WebSocket error:', error)
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
        console.warn('Failed to create WebSocket connection:', error)
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