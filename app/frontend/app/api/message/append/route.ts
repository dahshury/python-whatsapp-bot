import { NextResponse } from 'next/server'
import { callPythonBackend } from '@/shared/libs/backend'

export async function POST(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const wa_id = searchParams.get('wa_id')

		if (!wa_id) {
			return NextResponse.json(
				{ success: false, message: 'Missing required parameter: wa_id' },
				{ status: 400 }
			)
		}

		const body = await request.json()
		const { role, message, date, time } = body

		// Validate required fields
		if (!(role && message && date && time)) {
			return NextResponse.json(
				{
					success: false,
					message: 'Missing required fields: role, message, date, time',
				},
				{ status: 400 }
			)
		}

		// Call Python backend to append message to conversation
		const backendResponse = await callPythonBackend(`/conversations/${wa_id}`, {
			method: 'POST',
			body: JSON.stringify({
				role,
				message,
				date,
				time,
			}),
		})

		return NextResponse.json(backendResponse)
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to append message: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
