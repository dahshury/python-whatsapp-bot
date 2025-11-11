import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { old_id, new_id, ar, customer_name } = body;

    // Validate required fields
    if (!(old_id && new_id)) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: old_id, new_id" },
        { status: 400 }
      );
    }

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
          ...(customer_name !== undefined ? { customer_name } : {}),
        }),
      }
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
