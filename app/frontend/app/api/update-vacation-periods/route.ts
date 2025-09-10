import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { start_dates, durations, ar } = await request.json();

		// Update the backend with the new vacation periods
		const response = await fetch(
			"http://backend:8000/update-vacation-periods",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					start_dates,
					durations,
					ar: ar || false,
				}),
			},
		);

		if (!response.ok) {
			throw new Error("Failed to update vacation periods on backend");
		}

		const result = await response.json();
		return NextResponse.json(result);
	} catch (error) {
		console.error("Error updating vacation periods:", error);
		return NextResponse.json(
			{ success: false, message: "Failed to update vacation periods" },
			{ status: 500 },
		);
	}
}
