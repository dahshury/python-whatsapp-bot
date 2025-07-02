import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    // Call Python backend to get vacation periods
    const response = await fetch(`${BACKEND_URL}/vacations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Backend vacation periods API failed:', response.status, response.statusText)
      return NextResponse.json({ 
        success: false, 
        message: `Backend API failed: ${response.statusText}`,
        data: [] 
      }, { status: response.status })
    }

    const vacationPeriods = await response.json()
    
    return NextResponse.json({ 
      success: true, 
      data: vacationPeriods 
    })
    
  } catch (error) {
    console.error('Error fetching vacation periods:', error)
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    }, { status: 500 })
  }
} 