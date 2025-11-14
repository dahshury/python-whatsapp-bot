import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function GET(_req: NextRequest) {
  try {
    const backendResponse = await callPythonBackend("/api/config");
    return NextResponse.json(backendResponse);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch config: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const backendResponse = await callPythonBackend("/api/config", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return NextResponse.json(backendResponse);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Failed to update config: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendResponse = await callPythonBackend("/api/config", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(backendResponse);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Failed to create config: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
