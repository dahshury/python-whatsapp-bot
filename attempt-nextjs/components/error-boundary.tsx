"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { CalendarSkeleton } from './calendar-skeleton'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.groupEnd()
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const CustomFallback = this.props.fallback
      
      if (CustomFallback) {
        return <CustomFallback error={this.state.error} retry={this.retry} />
      }

      // Default fallback UI
      return (
        <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Something went wrong
            </h2>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200 dark:border-red-800">
                <summary className="cursor-pointer font-medium text-red-800 dark:text-red-200 mb-2">
                  Error Details (Development)
                </summary>
                <pre className="whitespace-pre-wrap text-red-700 dark:text-red-300 text-xs overflow-auto">
                  {this.state.error.message}
                  {this.state.error.stack && '\n\nStack Trace:\n' + this.state.error.stack}
                </pre>
              </details>
            )}
            
            <p className="text-gray-600 dark:text-gray-400">
              {process.env.NODE_ENV === 'development' 
                ? 'This might be caused by hot module reloading issues. Try refreshing the page or restarting the development server.'
                : 'Please refresh the page or try again later.'
              }
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={this.retry} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} variant="default">
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Calendar-specific error fallback
export function CalendarErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  return (
    <div className="relative">
      <CalendarSkeleton />
      <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex items-center justify-center">
        <div className="text-center space-y-4 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-2">📅💥</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Calendar Loading Error
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
            There was an issue loading the calendar. This is likely a temporary development server issue.
          </p>
          
          {process.env.NODE_ENV === 'development' && error && (
            <details className="text-left text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded border">
              <summary className="cursor-pointer font-medium text-red-800 dark:text-red-200">
                Error Details
              </summary>
              <pre className="mt-2 text-red-700 dark:text-red-300 overflow-auto max-h-32">
                {error.message}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2 justify-center">
            <Button onClick={retry} size="sm" variant="outline">
              Retry
            </Button>
            <Button onClick={() => window.location.reload()} size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 