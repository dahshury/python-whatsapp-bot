import {
	zAppendMessageBody,
	zAppendMessageQuery,
} from "@shared/validation/api/requests/append-message.schema";
import { zApiResponse } from "@shared/validation/api/response.schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { callPythonBackend } from "@/shared/libs/backend";

export async function POST(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const qp = Object.fromEntries(searchParams.entries());
		const parsedQuery = zAppendMessageQuery.safeParse(qp);
		if (!parsedQuery.success) {
			return NextResponse.json(
				{ success: false, message: parsedQuery.error.message },
				{ status: 400 }
			);
		}
		const { wa_id } = parsedQuery.data;

		const json = await request.json().catch(() => ({}));
		const parsedBody = zAppendMessageBody.safeParse(json);
		if (!parsedBody.success) {
			return NextResponse.json(
				{ success: false, message: parsedBody.error.message },
				{ status: 400 }
			);
		}
		const { role, message, date, time } = parsedBody.data;

		// Call Python backend to append message to conversation
		const backendResponse = await callPythonBackend(
			`/conversations/${wa_id}`,
			{
				method: "POST",
				body: JSON.stringify({
					role,
					message,
					date,
					time,
				}),
			},
			zApiResponse(z.record(z.unknown()))
		);

		return NextResponse.json(backendResponse);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to append message: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
			{ status: 500 }
		);
	}
}
