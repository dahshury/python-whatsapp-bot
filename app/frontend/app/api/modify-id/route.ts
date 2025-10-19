import { zModifyIdBody } from "@shared/validation/api/requests/modify-id.schema";
import { zApiResponse } from "@shared/validation/api/response.schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { callPythonBackend } from "@/shared/libs/backend";

export async function POST(request: Request) {
	try {
		const json = await request.json().catch(() => ({}));
		const parsed = zModifyIdBody.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, message: parsed.error.message },
				{ status: 400 }
			);
		}
		const { old_id, new_id, ar } = parsed.data;

		// Call the Python backend with parameters that match modify_id function
		// The endpoint expects a wa_id in the URL (which can be anything) and both old and new IDs in the body
		const backendResponse = await callPythonBackend(
			`/reservations/${old_id}/modify_id`,
			{
				method: "POST",
				body: JSON.stringify({
					old_wa_id: old_id, // Old WhatsApp ID
					new_wa_id: new_id, // New WhatsApp ID
					ar, // Arabic language flag
				}),
			},
			zApiResponse(z.record(z.unknown()))
		);

		return NextResponse.json(backendResponse);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to modify customer ID: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
			{ status: 500 }
		);
	}
}
