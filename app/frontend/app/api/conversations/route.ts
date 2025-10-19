import { zConversationsQuery } from "@shared/validation/api/requests/queries.schema";
import {
	zApiResponse,
	zConversationsMap,
} from "@shared/validation/api/response.schema";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const qp = Object.fromEntries(url.searchParams.entries());
		const parsed = zConversationsQuery.safeParse(qp);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, message: parsed.error.message, data: {} },
				{ status: 400 }
			);
		}
		const params = new URLSearchParams(parsed.data as Record<string, string>);

		// Make request to Python backend with date filtering and validate response
		const backendResponse = await callPythonBackend(
			params.toString() ? `/conversations?${params}` : "/conversations",
			{ method: "GET" },
			zApiResponse(zConversationsMap)
		);

		// The Python backend should return the data in the expected format
		// { success: true, data: Record<string, Conversation[]> }
		return NextResponse.json(backendResponse);
	} catch (error) {
		// Return empty data structure on error
		return NextResponse.json(
			{
				success: false,
				message: `Failed to fetch conversations: ${error instanceof Error ? error.message : "Unknown error"}`,
				data: {},
			},
			{ status: 500 }
		);
	}
}
