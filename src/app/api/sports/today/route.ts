import { NextResponse } from "next/server";
import { fetchSportsTodayMatches } from "@/services/fetchers/sports";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const limitParam = Number.parseInt(searchParams.get("limit") || "8", 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 30) : 8;

  try {
    const result = await fetchSportsTodayMatches({
      date,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch sports matches";

    // Keep dashboard stable even when provider is unavailable.
    return NextResponse.json({
      date: date || new Date().toISOString().slice(0, 10),
      source: "thesportsdb",
      matches: [],
      warning: message,
    });
  }
}
