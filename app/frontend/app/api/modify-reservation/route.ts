import { zModifyReservationBody } from "@shared/validation/api/requests/modify-reservation.schema";
import {
	zApiResponse,
	zReservationsMap,
} from "@shared/validation/api/response.schema";
import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function POST(request: Request) {
	try {
		const json = await request.json().catch(() => ({}));
		const parsed = zModifyReservationBody.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, message: parsed.error.message },
				{ status: 400 }
			);
		}
		const { id, date, time, title, type, approximate, reservationId } =
			parsed.data;

		// Call the Python backend endpoint directly - id is the WhatsApp ID
		const backendResponse = await callPythonBackend(
			`/reservations/${id}/modify`,
			{
				method: "POST",
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
			},
			zApiResponse(zReservationsMap)
		);

		return NextResponse.json(backendResponse);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to modify reservation: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
			{ status: 500 }
		);
	}
}
