import { NextResponse } from "next/server";
import { callPythonBackend } from "@/shared/libs/backend";

const DEFAULT_NOTIFICATION_LIMIT = 100;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const parsedLimit = Number(limitParam);
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : DEFAULT_NOTIFICATION_LIMIT;
    const query = `?limit=${encodeURIComponent(String(limit))}`;
    const data = await callPythonBackend(`/notifications${query}`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
