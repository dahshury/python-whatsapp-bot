import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { wa_id, typing } = body ?? {};

    if (!wa_id || typeof typing !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid fields: wa_id, typing" },
        { status: 400 }
      );
    }

    const backendResponse = await callPythonBackend("/typing", {
      method: "POST",
      body: JSON.stringify({
        wa_id,
        typing,
        _call_source: "frontend",
      }),
    });

    return NextResponse.json(backendResponse);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Failed to send typing indicator: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
