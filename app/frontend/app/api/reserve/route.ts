import { NextResponse } from 'next/server'
import { callPythonBackend } from '@/shared/libs/backend'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { id, title, date, time, type, max_reservations, hijri, ar } = body

		// Validate required fields
		if (!(id && title && date && time)) {
			return NextResponse.json(
				{
					success: false,
					message: 'Missing required fields: id, title, date, time',
				},
				{ status: 400 }
			)
		}

		const payload: Record<string, unknown> = {
			wa_id: id,
			customer_name: title,
			date_str: date,
			time_slot: time,
			reservation_type: type || 0,
			hijri,
			ar,
			_call_source: 'frontend',
		}
		if (typeof max_reservations === 'number') {
			payload.max_reservations = max_reservations
		}

		// Call the Python backend with parameters that match reserve_time_slot function
		const backendResponse = await callPythonBackend('/reserve', {
			method: 'POST',
			body: JSON.stringify(payload),
		})

		return NextResponse.json(backendResponse)
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to create reservation: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
