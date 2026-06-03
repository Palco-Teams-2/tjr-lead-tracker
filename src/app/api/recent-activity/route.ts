import { NextRequest, NextResponse } from "next/server";
import { fetchRecentActivity } from "@/lib/recent-activity";

export async function GET(req: NextRequest) {
  const limit = Math.min(
    60,
    Math.max(10, parseInt(req.nextUrl.searchParams.get("limit") ?? "40", 10) || 40)
  );

  try {
    const items = await fetchRecentActivity(limit);
    return NextResponse.json({ ok: true, items, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("recent-activity error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Database error" },
      { status: 500 }
    );
  }
}
