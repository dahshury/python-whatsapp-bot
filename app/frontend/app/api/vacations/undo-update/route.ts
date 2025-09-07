import { NextResponse } from "next/server";
import { callPythonBackend } from "@/lib/backend";

interface UndoVacationUpdateResponse {
	success: boolean;
	message?: string;
	data?: unknown;
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { originalVacationData, ar } = body; // ar is optional for language

		if (!originalVacationData || typeof originalVacationData !== "object") {
			return NextResponse.json(
				{
					success: false,
					message: "Invalid original vacation data provided.",
				},
				{ status: 400 },
			);
		}

		// Call Python backend to restore vacation periods to original state
		console.log(
			"API CALL (Python Backend): undo vacation update with original data:",
			originalVacationData,
		);

		const pythonResponse = await callPythonBackend<UndoVacationUpdateResponse>(
			"/undo-vacation-update",
			{
				method: "POST",
				body: JSON.stringify({
					original_vacation_data: originalVacationData,
					ar: ar || false,
				}),
			},
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
			{ status: 500 },
		);
	} catch (error: unknown) {
		console.error("Error in /api/vacations/undo-update API:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to undo vacation update" },
			{ status: 500 },
		);
	}
}
