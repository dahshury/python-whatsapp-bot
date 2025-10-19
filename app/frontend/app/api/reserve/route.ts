import { zReserveBody } from "@shared/validation/api/requests/reserve.schema";
import {
	zApiResponse,
	zReservationsMap,
} from "@shared/validation/api/response.schema";
import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

// Default max reservations (Frontend allows 6, AI agent uses 5)
const DEFAULT_MAX_RESERVATIONS = 6;

export async function POST(request: Request) {
	try {
		const json = await request.json().catch(() => ({}));
		const parsed = zReserveBody.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, message: parsed.error.message },
				{ status: 400 }
			);
		}
		const { id, title, date, time, type, max_reservations, hijri, ar } =
			parsed.data;

		// Call the Python backend with parameters that match reserve_time_slot function
		// Strictly require numeric 0/1; let backend reject invalids via its validator
		const typeNum = Number(type);
		const typeValid = typeNum === 0 || typeNum === 1;

		const backendResponse = await callPythonBackend(
			"/reserve",
			{
				method: "POST",
				body: JSON.stringify({
					wa_id: id, // WhatsApp ID
					customer_name: title, // Customer name
					date_str: date, // Date string
					time_slot: time, // Time slot
					reservation_type: typeValid ? typeNum : undefined, // only send when valid
					type: typeValid ? typeNum : undefined, // also send type for compatibility
					hijri, // Hijri calendar flag
					max_reservations: max_reservations || DEFAULT_MAX_RESERVATIONS,
					ar, // Arabic language flag
				}),
			},
			zApiResponse(zReservationsMap)
		);

		return NextResponse.json(backendResponse);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to create reservation: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
			{ status: 500 }
		);
	}
}
