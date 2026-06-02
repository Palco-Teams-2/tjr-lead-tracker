import { NextRequest, NextResponse } from "next/server";
import { buildJourney } from "@/lib/journey";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing query param q" }, { status: 400 });
  }

  try {
    const journey = await buildJourney(q);
    if (!journey) {
      return NextResponse.json({ ok: false, error: "No matching lead found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...journey });
  } catch (err) {
    console.error("journey error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Database error" },
      { status: 500 }
    );
  }
}
