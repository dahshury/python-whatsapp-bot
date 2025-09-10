import { type NextRequest, NextResponse } from "next/server";
import { callPythonBackend } from "@/lib/backend";

export async function POST(request: NextRequest) {
	try {
		const { start_dates, durations, ar } = await request.json();

		// Update the backend with the new vacation periods via helper (tries backend, then localhost)
		const result = await callPythonBackend("/update-vacation-periods", {
			method: "POST",
			body: JSON.stringify({
				start_dates,
				durations,
				ar: ar || false,
			}),
		});
		return NextResponse.json(result as unknown as Record<string, unknown>);
	} catch (error) {
		console.error("Error updating vacation periods:", error);
		return NextResponse.json(
			{ success: false, message: "Failed to update vacation periods" },
			{ status: 500 },
		);
	}
}
