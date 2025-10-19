import { zReservationsQuery } from "@shared/validation/api/requests/queries.schema";
import {
	zApiResponse,
	zReservationsMap,
} from "@shared/validation/api/response.schema";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const qp = Object.fromEntries(url.searchParams.entries());
		const parsed = zReservationsQuery.safeParse(qp);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, message: parsed.error.message, data: {} },
				{ status: 400 }
			);
		}

		const params = new URLSearchParams(parsed.data as Record<string, string>);

		const backendResponse = await callPythonBackend(
			`/reservations?${params}`,
			{ method: "GET" },
			zApiResponse(zReservationsMap)
		);

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
