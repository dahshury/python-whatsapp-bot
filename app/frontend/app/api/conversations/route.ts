import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const fromDate = url.searchParams.get("from_date"); // YYYY-MM-DD format
		const toDate = url.searchParams.get("to_date"); // YYYY-MM-DD format

		// Build parameters for Python backend
		const params = new URLSearchParams();

		// Add date range filtering if provided
		if (fromDate) {
			params.append("from_date", fromDate);
		}
		if (toDate) {
			params.append("to_date", toDate);
		}

		// Make request to Python backend with date filtering
		const backendResponse = await callPythonBackend(params.toString() ? `/conversations?${params}` : "/conversations");

		// The Python backend should return the data in the expected format
		// { success: true, data: Record<string, Conversation[]> }
		return NextResponse.json(backendResponse);
	} catch (error) {
		console.error("Error fetching conversations from Python backend:", error);

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
