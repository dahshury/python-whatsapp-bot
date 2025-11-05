import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

type UndoCreateResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};
// import {AssistantFunctionService} from '@/../../app/services/assistant_functions'; // Adjust path as needed

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservationId, ar } = body; // ar is optional for language

    if (typeof reservationId !== "number") {
      return NextResponse.json(
        { success: false, message: "Invalid reservationId provided." },
        { status: 400 }
      );
    }

    const pythonResponse = await callPythonBackend<UndoCreateResponse>(
      "/undo-reserve",
      {
        method: "POST",
        body: JSON.stringify({
          reservation_id: reservationId,
          ar,
        }),
      }
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
