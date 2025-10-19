import { zApiResponse } from "@shared/validation/api/response.schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { callPythonBackend } from "@/shared/libs/backend";

const zUndoCancelBody = z.object({
	reservationId: z.number(),
	ar: z.boolean().optional(),
});

const zUndoCancelResponse = zApiResponse(z.object({}).passthrough());

export async function POST(request: Request) {
	try {
		const json = await request.json().catch(() => ({}));
		const parsed = zUndoCancelBody.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, message: parsed.error.message },
				{ status: 400 }
			);
		}
		const { reservationId, ar } = parsed.data;

		const pythonResponse = await callPythonBackend(
			"/undo-cancel",
			{
				method: "POST",
				body: JSON.stringify({
					reservation_id: reservationId,
					ar,
					max_reservations: 6,
				}),
			},
			zUndoCancelResponse
		);

		if (pythonResponse.success) {
			return NextResponse.json(pythonResponse);
		}
		return NextResponse.json(
			{
				success: false,
				message: pythonResponse.message || "Undo operation failed in backend.",
			},
			{ status: 500 }
		);
	} catch (_error: unknown) {
		return NextResponse.json(
			{ success: false, error: "Failed to undo cancellation" },
			{ status: 500 }
		);
	}
}
