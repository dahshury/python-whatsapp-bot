import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { callPythonBackend } from '@/lib/backend'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, date, time, title, type, approximate, max_reservations } = body

    // Validate required fields
    if (!id || !date || !time) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: id, date, time' },
        { status: 400 }
      )
    }

    // Call the correct Python backend endpoint with proper parameter mapping
    const backendResponse = await callPythonBackend(`/reservations/${id}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        new_date: date,           // Map 'date' to 'new_date'
        new_time_slot: time,      // Map 'time' to 'new_time_slot'
        new_name: title,          // Map 'title' to 'new_name'
        new_type: type || 0,      // Map 'type' to 'new_type'
        approximate: approximate || false,
        max_reservations: max_reservations || 6,
        hijri: false,             // Always false for this API
        ar: false                 // Could be made configurable later
      })
    })

    return NextResponse.json(backendResponse)
  } catch (error) {
    console.error('Error modifying reservation via Python backend:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: `Failed to modify reservation: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    )
  }
} 