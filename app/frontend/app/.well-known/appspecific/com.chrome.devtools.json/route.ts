import { NextResponse } from "next/server";

export function GET() {
  // Return empty DevTools configuration to satisfy Chrome DevTools
  return NextResponse.json({});
}
