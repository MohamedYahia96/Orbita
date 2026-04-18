import { NextResponse } from "next/server";
import { syncAllFeeds } from "@/services/feed-sync";
import { getOrCreateDemoUser } from "@/lib/current-user";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  try {
    const user = await getOrCreateDemoUser();
    const results = await syncAllFeeds({ userId: user.id });
    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Manual sync failed';
    console.error("[Manual Sync API Error]", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
