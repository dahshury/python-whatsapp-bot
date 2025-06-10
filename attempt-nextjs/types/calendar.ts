export interface CalendarEvent {
  id: string
  title: string
  start: string // ISO 8601 date-time string
  end: string   // ISO 8601 date-time string
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  editable?: boolean
  durationEditable?: boolean
  className?: string[]
  extendedProps?: {
    type: number
    cancelled?: boolean
    [key: string]: any
  }
}

// Reservation payload shape from backend
export interface Reservation {
  customer_id: string // e.g. WhatsApp ID
  date: string        // YYYY-MM-DD
  time_slot: string   // HH:mm format
  customer_name: string
  type: number        // 0 or 1
  cancelled?: boolean
  [key: string]: any
}

// Conversation message shape from backend
export interface Conversation {
  id: number | string
  timestamp: string   // ISO 8601 date-time
  type: 'user' | 'bot' | 'system' | string
  message: string
  sender: string
}

// Vacation period data structure
export interface VacationPeriod {
  start: Date
  end: Date
  title?: string
  duration?: number
} 