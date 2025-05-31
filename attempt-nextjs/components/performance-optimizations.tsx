"use client"

import { memo } from "react"

// Performance optimization wrapper for heavy components
export const withPerformanceOptimization = <T extends object>(
  Component: React.ComponentType<T>,
  displayName?: string
) => {
  const MemoizedComponent = memo(Component)
  if (displayName) {
    MemoizedComponent.displayName = displayName
  }
  return MemoizedComponent
}

// Debounce utility for performance
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle utility for performance
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
} 