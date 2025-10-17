import { NextResponse } from "next/server";

export const runtime = "edge";

export function GET() {
	// Return empty DevTools configuration to satisfy Chrome DevTools
	return NextResponse.json({});
}
