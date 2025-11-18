import { NextResponse } from 'next/server'
import { callPythonBackend } from '@/shared/libs/backend'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { wa_id, text } = body

		// Validate required fields
		if (!(wa_id && text)) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields: wa_id, text' },
				{ status: 400 }
			)
		}

		// Call Python backend to send WhatsApp message
		const backendResponse = await callPythonBackend('/whatsapp/message', {
			method: 'POST',
			body: JSON.stringify({
				wa_id,
				text,
				_call_source: 'frontend', // Tag as frontend-initiated to filter notifications
			}),
		})

		return NextResponse.json(backendResponse)
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
