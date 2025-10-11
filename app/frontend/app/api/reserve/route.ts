import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { id, title, date, time, type, max_reservations, hijri, ar } = body;

		// Validate required fields
		if (!id || !title || !date || !time) {
			return NextResponse.json(
				{
					success: false,
					message: "Missing required fields: id, title, date, time",
				},
				{ status: 400 }
			);
		}

		// Call the Python backend with parameters that match reserve_time_slot function
		const backendResponse = await callPythonBackend("/reserve", {
			method: "POST",
			body: JSON.stringify({
				wa_id: id, // WhatsApp ID
				customer_name: title, // Customer name
				date_str: date, // Date string
				time_slot: time, // Time slot
				reservation_type: type || 0, // Type (0 for Check-Up, 1 for Follow-Up)
				hijri: hijri || false, // Hijri calendar flag
				max_reservations: max_reservations || 6, // Frontend allows 6, AI agent uses 5
				ar: ar || false, // Arabic language flag
			}),
		});

		return NextResponse.json(backendResponse);
	} catch (error) {
		console.error("Error creating reservation via Python backend:", error);
		return NextResponse.json(
			{
				success: false,
				message: `Failed to create reservation: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
			{ status: 500 }
		);
	}
}
