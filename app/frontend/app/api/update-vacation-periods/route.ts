import { zUpdateVacationsBody } from "@shared/validation/api/requests/update-vacations.schema";
import { zApiResponse } from "@shared/validation/api/response.schema";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callPythonBackend } from "@/shared/libs/backend";

export async function POST(request: NextRequest) {
	try {
		const json = await request.json().catch(() => ({}));
		const parsed = zUpdateVacationsBody.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, message: parsed.error.message },
				{ status: 400 }
			);
		}

		const { start_dates, durations, ar } = parsed.data;

		// Update the backend with the new vacation periods via helper (tries backend, then localhost)
		const result = await callPythonBackend(
			"/update-vacation-periods",
			{
				method: "POST",
				body: JSON.stringify({
					start_dates,
					durations,
					ar,
				}),
			},
			zApiResponse(z.object({}).passthrough())
		);
		return NextResponse.json(result as unknown as Record<string, unknown>);
	} catch (_error) {
		return NextResponse.json(
			{ success: false, message: "Failed to update vacation periods" },
			{ status: 500 }
		);
	}
}
