import { NextResponse } from 'next/server'
import { callPythonBackend } from '@/shared/libs/backend'

type UndoCreateResponse = {
	success: boolean
	message?: string
	data?: unknown
}

/**
 * Undo reservation creation by canceling it
 * Now uses the base /reservations/{wa_id}/cancel endpoint instead of the deprecated /undo-reserve
 */
export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { reservationId, waId, ar } = body

		if (typeof reservationId !== 'number') {
			return NextResponse.json(
				{ success: false, message: 'Invalid reservationId provided.' },
				{ status: 400 }
			)
		}

		if (!waId) {
			return NextResponse.json(
				{ success: false, message: 'Missing waId.' },
				{ status: 400 }
			)
		}

		// Use the base cancel endpoint
		const pythonResponse = await callPythonBackend<UndoCreateResponse>(
			`/reservations/${waId}/cancel`,
			{
				method: 'POST',
				body: JSON.stringify({
					reservation_id_to_cancel: reservationId,
					ar,
					_call_source: 'frontend', // Tag as frontend-initiated to filter notifications
				}),
			}
		)

		if (pythonResponse.success) {
			return NextResponse.json(pythonResponse)
		}
		// Use the message from the Python service if available
		return NextResponse.json(
			{
				success: false,
				message: pythonResponse.message || 'Undo operation failed in backend.',
			},
			{ status: 500 }
		)
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error
				? error.message
				: 'Internal server error during undo create.'
		return NextResponse.json(
			{
				success: false,
				message: errorMessage,
			},
			{ status: 500 }
		)
	}
}
