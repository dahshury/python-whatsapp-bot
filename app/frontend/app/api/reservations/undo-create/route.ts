import { zApiResponse } from "@shared/validation/api/response.schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { callPythonBackend } from "@/shared/libs/backend";

const zUndoCreateBody = z.object({
	reservationId: z.number(),
	ar: z.boolean().optional(),
});

const zUndoCreateResponse = zApiResponse(z.object({}).passthrough());
// import {AssistantFunctionService} from '@/../../app/services/assistant_functions'; // Adjust path as needed

export async function POST(request: Request) {
	try {
		const json = await request.json().catch(() => ({}));
		const parsed = zUndoCreateBody.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, message: parsed.error.message },
				{ status: 400 }
			);
		}
		const { reservationId, ar } = parsed.data;

		const pythonResponse = await callPythonBackend(
			"/undo-reserve",
			{
				method: "POST",
				body: JSON.stringify({
					reservation_id: reservationId,
					ar,
				}),
			},
			zUndoCreateResponse
		);

		if (pythonResponse.success) {
			return NextResponse.json(pythonResponse);
		}
		// Use the message from the Python service if available
		return NextResponse.json(
			{
				success: false,
				message: pythonResponse.message || "Undo operation failed in backend.",
			},
			{ status: 500 }
		);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error
				? error.message
				: "Internal server error during undo create.";
		return NextResponse.json(
			{
				success: false,
				message: errorMessage,
			},
			{ status: 500 }
		);
	}
}
