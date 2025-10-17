import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

type UndoModifyResponse = {
	success: boolean;
	message?: string;
	data?: unknown;
};
// import {AssistantFunctionService} from '@/../../app/services/assistant_functions'; // Adjust path

export async function POST(request: Request) {
	try {
		const body = await request.json();
		// originalData contains the state of the reservation BEFORE it was modified.
		// It should match the structure expected by the Python modify_reservation function's parameters.
		const { reservationId, originalData, ar } = body;

		if (
			typeof reservationId !== "number" ||
			typeof originalData !== "object" ||
			originalData === null
		) {
			return NextResponse.json(
				{
					success: false,
					message: "Invalid reservationId or originalData provided.",
				},
				{ status: 400 }
			);
		}

		// The Python `modify_reservation` function expects parameters like:
		// wa_id, new_date, new_time_slot, new_name, new_type, max_reservations, approximate, hijri, ar, reservation_id_to_modify
		// Ensure originalData from the client maps to these with proper defaults.
		const payloadForPython = {
			wa_id: originalData.wa_id, // This must be present in originalData
			new_date: originalData.date,
			new_time_slot: originalData.time_slot,
			new_name: originalData.customer_name,
			new_type: originalData.type,
			max_reservations: 6, // Frontend allows 6 per slot for calendar operations
			approximate: false, // For undo, we want exact revert, no approximation
			hijri: false, // Default value for undo operations
			ar,
			reservation_id_to_modify: reservationId, // Crucial: target specific reservation
		};

		if (!payloadForPython.wa_id) {
			return NextResponse.json(
				{ success: false, message: "originalData is missing wa_id." },
				{ status: 400 }
			);
		}

		const pythonResponse = await callPythonBackend<UndoModifyResponse>(
			"/undo-modify",
			{
				method: "POST",
				body: JSON.stringify(payloadForPython),
			}
		);

		if (pythonResponse?.success) {
			return NextResponse.json(pythonResponse);
		}
		const errorMessage =
			pythonResponse?.message || "Undo modification failed in backend.";
		return NextResponse.json(
			{ success: false, message: errorMessage },
			{ status: 500 }
		);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error
				? error.message
				: "Internal server error during undo modify.";
		return NextResponse.json(
			{
				success: false,
				message: errorMessage,
			},
			{ status: 500 }
		);
	}
}
