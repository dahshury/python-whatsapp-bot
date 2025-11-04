import { NextResponse } from 'next/server'
import { callPythonBackend } from '@/shared/libs/backend'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { id, date, time, title, type, approximate, reservationId } = body

		// Validate required fields
		if (!(id && date && time)) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields: id, date, time' },
				{ status: 400 }
			)
		}

		// Call the Python backend endpoint directly - id is the WhatsApp ID
		const backendResponse = await callPythonBackend(
			`/reservations/${id}/modify`,
			{
				method: 'POST',
				body: JSON.stringify({
					new_date: date,
					new_time_slot: time,
					new_name: title,
					new_type: type || 0,
					approximate,
					max_reservations: 6, // Frontend allows 6 per user request
					hijri: false,
					ar: false,
					reservation_id_to_modify: reservationId,
				}),
			}
		)

		return NextResponse.json(backendResponse)
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to modify reservation: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
