import { NextResponse } from 'next/server';
import { callPythonBackend } from '@/lib/backend';
// import {AssistantFunctionService} from '@/../../app/services/assistant_functions'; // Adjust path

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // originalData contains the state of the reservation BEFORE it was modified.
    // It should match the structure expected by the Python modify_reservation function's parameters.
    const { reservationId, originalData, ar } = body;

    if (typeof reservationId !== 'number' || typeof originalData !== 'object' || originalData === null) {
      return NextResponse.json({ success: false, message: 'Invalid reservationId or originalData provided.' }, { status: 400 });
    }

    // The Python `modify_reservation` function expects parameters like:
    // wa_id, new_date, new_time_slot, new_name, new_type, reservation_id_to_modify
    // Ensure originalData from the client maps to these.
    const payloadForPython = {
      wa_id: originalData.wa_id, // This must be present in originalData
      new_date: originalData.date,
      new_time_slot: originalData.time_slot,
      new_name: originalData.customer_name,
      new_type: originalData.type,
      reservation_id_to_modify: reservationId, // Crucial: target specific reservation
      ar: ar || false,
      // max_reservations, approximate, hijri might not be needed for a direct revert,
      // or should be part of originalData if they influenced the original state.
      // For simplicity, assuming direct revert.
    };
    
    if (!payloadForPython.wa_id) {
         return NextResponse.json({ success: false, message: 'originalData is missing wa_id.' }, { status: 400 });
    }

    // Call Python backend to modify reservation back to original data
    console.log(`API CALL (Python Backend): modify_reservation (for undo) for ID: ${reservationId} with original data:`, payloadForPython);

    const pythonResponse = await callPythonBackend('/undo-modify', {
      method: 'POST',
      body: JSON.stringify(payloadForPython)
    });

    if (pythonResponse.success) {
      return NextResponse.json(pythonResponse);
    } else {
      return NextResponse.json({ success: false, message: pythonResponse.message || 'Undo modification failed in backend.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in /api/reservations/undo-modify API:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error during undo modify.' }, { status: 500 });
  }
} 