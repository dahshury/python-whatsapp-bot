import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { id, date, isLocalized } = body;

		// Validate required fields
		if (!(id && date)) {
			return NextResponse.json(
				{ success: false, message: "Missing required fields: id, date" },
				{ status: 400 }
			);
		}

		// Use the correct Python backend endpoint structure: POST /reservations/{wa_id}/cancel
		const backendResponse = await callPythonBackend(
			`/reservations/${id}/cancel`,
			{
				method: "POST",
				body: JSON.stringify({
					date_str: date, // Python backend expects 'date_str', not 'date'
					hijri: false, // Default to Gregorian calendar
					ar: isLocalized, // Use the passed language setting
				}),
			}
		);

		return NextResponse.json(backendResponse);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to cancel reservation: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
			{ status: 500 }
		);
	}
}
