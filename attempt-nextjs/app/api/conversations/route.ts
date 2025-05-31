import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Conversation } from '@/types/calendar'
import { callPythonBackend } from '@/lib/backend'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const recent = url.searchParams.get('recent')
    const limit = url.searchParams.get('limit')
    
    // Build parameters for Python backend
    const params = new URLSearchParams()
    if (recent !== null) params.set('recent', recent)
    if (limit !== null) params.set('limit', limit)
    
    const endpoint = params.toString() ? `/conversations?${params}` : '/conversations'
    const backendResponse = await callPythonBackend(endpoint)
    
    // The Python backend should return the data in the expected format
    // { success: true, data: Record<string, Conversation[]> }
    return NextResponse.json(backendResponse)
    
  } catch (error) {
    console.error('Error fetching conversations from Python backend:', error)
    
    // Return empty data structure on error
    return NextResponse.json(
      { 
        success: false, 
        message: `Failed to fetch conversations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {}
      },
      { status: 500 }
    )
  }
} 