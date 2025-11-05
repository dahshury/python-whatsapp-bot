import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

export async function GET() {
  try {
    const data = await callPythonBackend("/notifications");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
