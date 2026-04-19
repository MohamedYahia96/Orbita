import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import { GOOGLE_DRIVE_READONLY_SCOPE, GOOGLE_GMAIL_READONLY_SCOPE, hasGoogleScope } from "@/services/fetchers/gmail";
import { fetchSportsTodayMatches } from "@/services/fetchers/sports";

export const runtime = "nodejs";

type FeedStatusItem = {
  id: string;
  title: string;
  type: string;
  platform: string | null;
  status: string;
  lastChecked: string | null;
  workspaceName: string | null;
};

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();

    const [feeds, token, pushCount] = await Promise.all([
      prisma.feed.findMany({
        where: { userId: user.id },
        orderBy: [{ status: "asc" }, { lastChecked: "desc" }, { createdAt: "desc" }],
        include: {
          workspace: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.googleToken.findUnique({
        where: { userId: user.id },
        select: {
          email: true,
          scope: true,
          expiresAt: true,
        },
      }),
      prisma.pushSubscription.count({
        where: { userId: user.id },
      }),
    ]);

    let sportsWarning: string | null = null;
    let sportsSource: string | null = null;

    try {
      const sports = await fetchSportsTodayMatches({ limit: 1 });
      sportsWarning = sports.warning || null;
      sportsSource = sports.source;
    } catch (error: unknown) {
      sportsWarning = error instanceof Error ? error.message : "Sports provider is unavailable";
      sportsSource = process.env.SPORTS_API_PROVIDER || null;
    }

    const feedStatus: FeedStatusItem[] = feeds.map((feed) => ({
      id: feed.id,
      title: feed.title,
      type: feed.type,
      platform: feed.platform,
      status: feed.status,
      lastChecked: feed.lastChecked ? feed.lastChecked.toISOString() : null,
      workspaceName: feed.workspace?.name || null,
    }));

    const lastCheckedAt = feeds
      .map((feed) => feed.lastChecked)
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalFeeds: feeds.length,
        activeFeeds: feeds.filter((feed) => feed.status === "active").length,
        errorFeeds: feeds.filter((feed) => feed.status === "error").length,
        pausedFeeds: feeds.filter((feed) => feed.status === "paused").length,
        lastCheckedAt: lastCheckedAt ? lastCheckedAt.toISOString() : null,
      },
      integrations: {
        gmail: {
          connected: hasGoogleScope(token?.scope, GOOGLE_GMAIL_READONLY_SCOPE),
          email: token?.email || null,
          expiresAt: token?.expiresAt ? token.expiresAt.toISOString() : null,
        },
        drive: {
          connected: hasGoogleScope(token?.scope, GOOGLE_DRIVE_READONLY_SCOPE),
          email: token?.email || null,
          expiresAt: token?.expiresAt ? token.expiresAt.toISOString() : null,
        },
        push: {
          configured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
          subscriptions: pushCount,
        },
        sports: {
          healthy: !sportsWarning,
          source: sportsSource,
          warning: sportsWarning,
        },
      },
      feeds: feedStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
