import { NextResponse } from 'next/server';
import { callPythonBackend } from '@/lib/backend';
// import {AssistantFunctionService} from '@/../../app/services/assistant_functions'; // Adjust path as needed

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservationId, ar } = body; // ar is optional for language

    if (typeof reservationId !== 'number') {
      return NextResponse.json({ success: false, message: 'Invalid reservationId provided.' }, { status: 400 });
    }

    // Call Python backend to undo reservation creation (cancel the reservation)
    console.log(`API CALL (Python Backend): undo_reserve_time_slot for ID: ${reservationId}, lang_ar: ${ar || false}`);
    
    const pythonResponse = await callPythonBackend('/undo-reserve', {
      method: 'POST',
      body: JSON.stringify({
        reservation_id: reservationId,
        ar: ar || false
      })
    });

    if (pythonResponse.success) {
      return NextResponse.json(pythonResponse);
    } else {
      // Use the message from the Python service if available
      return NextResponse.json({ success: false, message: pythonResponse.message || 'Undo operation failed in backend.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in /api/reservations/undo-create API:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error during undo create.' }, { status: 500 });
  }
} 