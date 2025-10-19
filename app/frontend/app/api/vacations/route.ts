import {
	zApiResponse,
	zVacationsArray,
} from "@shared/validation/api/response.schema";
import { type NextRequest, NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function GET(_request: NextRequest) {
	try {
		const resp = await callPythonBackend(
			"/vacations",
			{ method: "GET" },
			zApiResponse(zVacationsArray)
		);
		return NextResponse.json(resp);
	} catch (error) {
		// If backend is not reachable, return empty array instead of error
		if (error instanceof TypeError && error.message.includes("fetch")) {
			return NextResponse.json({
				success: true,
				data: [],
				message: "Backend not reachable, using empty vacation periods",
			});
		}

		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Unknown error",
				data: [],
			},
			{ status: 500 }
		);
	}
}
