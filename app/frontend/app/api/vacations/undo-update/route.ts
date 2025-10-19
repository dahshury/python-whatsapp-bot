import { zApiResponse } from "@shared/validation/api/response.schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { callPythonBackend } from "@/shared/libs/backend";

const zUndoVacationBody = z.object({
	originalVacationData: z.record(z.unknown()),
	ar: z.boolean().optional(),
});

const zUndoVacationResponse = zApiResponse(z.object({}).passthrough());

export async function POST(request: Request) {
	try {
		const json = await request.json().catch(() => ({}));
		const parsed = zUndoVacationBody.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, message: parsed.error.message },
				{ status: 400 }
			);
		}
		const { originalVacationData, ar } = parsed.data;

		const pythonResponse = await callPythonBackend(
			"/undo-vacation-update",
			{
				method: "POST",
				body: JSON.stringify({
					original_vacation_data: originalVacationData,
					ar,
				}),
			},
			zUndoVacationResponse
		);

		if (pythonResponse.success) {
			return NextResponse.json(pythonResponse);
		}
		return NextResponse.json(
			{
				success: false,
				message:
					pythonResponse.message ||
					"Undo vacation operation failed in backend.",
			},
			{ status: 500 }
		);
	} catch (_error: unknown) {
		return NextResponse.json(
			{ success: false, error: "Failed to undo vacation update" },
			{ status: 500 }
		);
	}
}
