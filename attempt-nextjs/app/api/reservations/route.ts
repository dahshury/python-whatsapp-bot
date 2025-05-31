import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Reservation } from '@/types/calendar'
import { callPythonBackend } from '@/lib/backend'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const future = url.searchParams.get('future') === 'true'
    const includeCancelled = url.searchParams.get('include_cancelled') === 'true'
    
  
    
    // Make request to Python backend with same parameters
    const params = new URLSearchParams({
      future: future.toString(),
      include_cancelled: includeCancelled.toString()
    })
    
    const backendResponse = await callPythonBackend(`/reservations?${params}`)
    
    
    
    // The Python backend should return the data in the expected format
    // { success: true, data: Record<string, Reservation[]> }
    return NextResponse.json(backendResponse)
    
  } catch (error) {
    console.error('Error fetching reservations from Python backend:', error)
    
    // Return empty data structure on error to prevent breaking the frontend
    return NextResponse.json(
      { 
        success: false, 
        message: `Failed to fetch reservations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {}
      },
      { status: 500 }
    )
  }
} 