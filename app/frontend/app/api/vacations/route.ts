import { type NextRequest, NextResponse } from "next/server";
import { callPythonBackend } from "@/lib/backend";

export async function GET(_request: NextRequest) {
	try {
		// Call Python backend (helper tries backend:8000 then localhost:8000)
		const resp = await callPythonBackend<{ success?: boolean; data?: unknown }>(
			"/vacations",
		);
		if (resp && typeof resp === "object" && "data" in resp) {
			return NextResponse.json({
				success: true,
				data: (resp as { success?: boolean; data?: unknown }).data ?? [],
			});
		}
		return NextResponse.json({ success: true, data: resp ?? [] });
	} catch (error) {
		console.error("Error fetching vacation periods:", error);

		// If backend is not reachable, return empty array instead of error
		if (error instanceof TypeError && error.message.includes("fetch")) {
			console.warn(
				"Backend not reachable for vacations, returning empty array",
			);
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
			{ status: 500 },
		);
	}
}
