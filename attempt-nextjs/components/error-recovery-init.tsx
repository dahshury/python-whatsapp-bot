"use client"

import { useEffect } from 'react'
import '@/lib/error-recovery' // This will auto-setup error handling

export function ErrorRecoveryInit() {
  useEffect(() => {
    // Additional client-side initialization if needed
    if (process.env.NODE_ENV === 'development') {
      console.info('🛡️ Error recovery system initialized')
      
      // Add global keyboard shortcut for manual recovery (Ctrl+Shift+R)
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'R') {
          event.preventDefault()
          const { ErrorRecovery } = require('@/lib/error-recovery')
          ErrorRecovery.forceRecovery()
        }
      }
      
      window.addEventListener('keydown', handleKeydown)
      return () => window.removeEventListener('keydown', handleKeydown)
    }
  }, [])

  return null // This component doesn't render anything
} 