import { NextRequest, NextResponse } from "next/server";
import { searchSuggestions } from "@/lib/journey";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ ok: true, suggestions: [] });

  try {
    const suggestions = await searchSuggestions(q);
    return NextResponse.json({ ok: true, suggestions });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
