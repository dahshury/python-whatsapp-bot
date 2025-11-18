import { NextResponse } from 'next/server'
import { callPythonBackend } from '@/shared/libs/backend'

type UndoCancelResponse = {
	success: boolean
	message?: string
	data?: unknown
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { reservationId, ar } = body // ar is optional

		if (typeof reservationId !== 'number') {
			return NextResponse.json(
				{ success: false, message: 'Invalid reservationId provided.' },
				{ status: 400 }
			)
		}

		const pythonResponse = await callPythonBackend<UndoCancelResponse>(
			'/undo-cancel',
			{
				method: 'POST',
				body: JSON.stringify({
					reservation_id: reservationId,
					ar,
				}),
			}
		)

		if (pythonResponse.success) {
			return NextResponse.json(pythonResponse)
		}
		return NextResponse.json(
			{
				success: false,
				message: pythonResponse.message || 'Undo operation failed in backend.',
			},
			{ status: 500 }
		)
	} catch (_error: unknown) {
		return NextResponse.json(
			{ success: false, error: 'Failed to undo cancellation' },
			{ status: 500 }
		)
	}
}
