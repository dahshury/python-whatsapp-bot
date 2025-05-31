import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { callPythonBackend } from '@/lib/backend'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, title, date, time, type, max_reservations } = body

    // Validate required fields
    if (!id || !title || !date || !time) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: id, title, date, time' },
        { status: 400 }
      )
    }

    const backendResponse = await callPythonBackend('/reserve', {
      method: 'POST',
      body: JSON.stringify({
        id,
        title,
        date,
        time,
        type: type || 0,
        max_reservations: max_reservations || 6
      })
    })

    return NextResponse.json(backendResponse)
  } catch (error) {
    console.error('Error creating reservation via Python backend:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: `Failed to create reservation: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    )
  }
} 