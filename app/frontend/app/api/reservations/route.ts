import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const future = url.searchParams.get("future") === "true";
		const includeCancelled =
			url.searchParams.get("include_cancelled") === "true";
		const fromDate = url.searchParams.get("from_date"); // YYYY-MM-DD format
		const toDate = url.searchParams.get("to_date"); // YYYY-MM-DD format

		// Build parameters for Python backend
		const params = new URLSearchParams({
			future: future.toString(),
			include_cancelled: includeCancelled.toString(),
		});

		// Add date range filtering if provided
		if (fromDate) {
			params.append("from_date", fromDate);
		}
		if (toDate) {
			params.append("to_date", toDate);
		}

		const backendResponse = await callPythonBackend(`/reservations?${params}`);

		// The Python backend should return the data in the expected format
		// { success: true, data: Record<string, Reservation[]> }
		return NextResponse.json(backendResponse);
	} catch (error) {
		// Return empty data structure on error to prevent breaking the frontend
		return NextResponse.json(
			{
				success: false,
				message: `Failed to fetch reservations: ${error instanceof Error ? error.message : "Unknown error"}`,
				data: {},
			},
			{ status: 500 }
		);
	}
}
