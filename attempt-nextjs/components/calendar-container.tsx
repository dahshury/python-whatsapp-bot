import React from 'react'
import { CalendarSkeleton } from './calendar-skeleton'
import { ErrorBoundary, CalendarErrorFallback } from './error-boundary'

interface CalendarContainerProps {
  loading: boolean
  isHydrated: boolean
  isRefreshing: boolean
  children: React.ReactNode
}

export function CalendarContainer({ 
  loading, 
  isHydrated, 
  isRefreshing, 
  children 
}: CalendarContainerProps) {
  // Show loading state
  if (loading || !isHydrated) {
    return <CalendarSkeleton />
  }

  const content = (
    <ErrorBoundary fallback={CalendarErrorFallback}>
      {children}
    </ErrorBoundary>
  )

  // Show blurred calendar when refreshing
  if (isRefreshing) {
    return <CalendarSkeleton isBlurred={true}>{content}</CalendarSkeleton>
  }

  return content
} 