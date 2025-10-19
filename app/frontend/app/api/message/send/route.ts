import { zSendMessageBody } from "@shared/validation/api/requests/send-message.schema";
import { zApiResponse } from "@shared/validation/api/response.schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { callPythonBackend } from "@/shared/libs/backend";

export async function POST(request: Request) {
	try {
		const json = await request.json().catch(() => ({}));
		const parsed = zSendMessageBody.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, message: parsed.error.message },
				{ status: 400 }
			);
		}
		const { wa_id, text } = parsed.data;

		// Call Python backend to send WhatsApp message
		const backendResponse = await callPythonBackend(
			"/whatsapp/message",
			{
				method: "POST",
				body: JSON.stringify({
					wa_id,
					text,
				}),
			},
			zApiResponse(z.object({}).passthrough())
		);

		return NextResponse.json(backendResponse);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
			{ status: 500 }
		);
	}
}
