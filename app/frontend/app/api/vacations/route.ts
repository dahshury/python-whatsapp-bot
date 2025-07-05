import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
	process.env.PYTHON_BACKEND_URL ||
	process.env.BACKEND_URL ||
	"http://localhost:8000";

export async function GET(_request: NextRequest) {
	try {
		// Call Python backend to get vacation periods
		const response = await fetch(`${BACKEND_URL}/vacations`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			console.error(
				"Backend vacation periods API failed:",
				response.status,
				response.statusText,
			);
			
			// If backend doesn't have vacations endpoint (404), return empty array
			if (response.status === 404) {
				console.warn("Vacations endpoint not found on backend, returning empty array");
				return NextResponse.json({
					success: true,
					data: [],
					message: "Vacations endpoint not available on backend"
				});
			}
			
			return NextResponse.json(
				{
					success: false,
					message: `Backend API failed: ${response.statusText}`,
					data: [],
				},
				{ status: response.status },
			);
		}

		const vacationPeriods = await response.json();

		return NextResponse.json({
			success: true,
			data: vacationPeriods,
		});
	} catch (error) {
		console.error("Error fetching vacation periods:", error);
		
		// If backend is not reachable, return empty array instead of error
		if (error instanceof TypeError && error.message.includes("fetch")) {
			console.warn("Backend not reachable for vacations, returning empty array");
			return NextResponse.json({
				success: true,
				data: [],
				message: "Backend not reachable, using empty vacation periods"
			});
		}
		
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Unknown error",
				data: [],
			},
			{ status: 500 },
		);
	}
}
