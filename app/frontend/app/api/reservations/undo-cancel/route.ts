import { NextResponse } from "next/server";
// import {AssistantFunctionService} from '@/../../app/services/assistant_functions'; // Adjust path
import type { CalendarCoreRef } from "@/components/calendar-core";
import { callPythonBackend } from "@/lib/backend";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { reservationId, ar } = body; // ar is optional

		if (typeof reservationId !== "number") {
			return NextResponse.json(
				{ success: false, message: "Invalid reservationId provided." },
				{ status: 400 },
			);
		}

		// Call Python backend to undo cancellation (reinstate the reservation)
		console.log(
			`API CALL (Python Backend): undo_cancel_reservation for ID: ${reservationId}, lang_ar: ${ar || false}`,
		);

		const pythonResponse = await callPythonBackend("/undo-cancel", {
			method: "POST",
			body: JSON.stringify({
				reservation_id: reservationId,
				ar: ar || false,
			}),
		});

		if (pythonResponse.success) {
			return NextResponse.json(pythonResponse);
		} else {
			return NextResponse.json(
				{
					success: false,
					message:
						pythonResponse.message || "Undo operation failed in backend.",
				},
				{ status: 500 },
			);
		}
	} catch (error: unknown) {
		console.error("Error in /api/reservations/undo-cancel API:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to undo cancellation" },
			{ status: 500 },
		);
	}
}
