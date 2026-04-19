import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";

export const runtime = "nodejs";

type HourBucket = {
  hour: number;
  count: number;
};

function buildHourBuckets() {
  const buckets: HourBucket[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    buckets.push({ hour, count: 0 });
  }
  return buckets;
}

export async function GET(req: Request) {
  try {
    const user = await getOrCreateDemoUser();
    const { searchParams } = new URL(req.url);
    const daysParam = Number.parseInt(searchParams.get("days") || "7", 10);
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 90) : 7;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalFeeds, totalWorkspaces, totalItems, unreadItems, savedItems, bookmarkedItems, recentItems, topFeedsRaw] =
      await Promise.all([
        prisma.feed.count({ where: { userId: user.id } }),
        prisma.workspace.count({ where: { userId: user.id } }),
        prisma.feedItem.count({ where: { feed: { userId: user.id } } }),
        prisma.feedItem.count({ where: { feed: { userId: user.id }, isRead: false } }),
        prisma.feedItem.count({ where: { feed: { userId: user.id }, isSavedForLater: true } }),
        prisma.feedItem.count({ where: { feed: { userId: user.id }, isBookmarked: true } }),
        prisma.feedItem.findMany({
          where: {
            feed: { userId: user.id },
            OR: [{ publishedAt: { gte: since } }, { createdAt: { gte: since } }],
          },
          select: {
            feedId: true,
            createdAt: true,
            publishedAt: true,
          },
        }),
        prisma.feed.findMany({
          where: { userId: user.id },
          select: {
            id: true,
            title: true,
            platform: true,
          },
        }),
      ]);

    const topFeedMap = new Map<string, { count: number }>();
    const hourBuckets = buildHourBuckets();

    for (const item of recentItems) {
      const current = topFeedMap.get(item.feedId) || { count: 0 };
      current.count += 1;
      topFeedMap.set(item.feedId, current);

      const timestamp = item.publishedAt || item.createdAt;
      const hour = timestamp.getHours();
      const bucket = hourBuckets[hour];
      if (bucket) {
        bucket.count += 1;
      }
    }

    const topFeeds = topFeedsRaw
      .map((feed) => ({
        id: feed.id,
        title: feed.title,
        platform: feed.platform,
        count: topFeedMap.get(feed.id)?.count || 0,
      }))
      .filter((feed) => feed.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const totalRecent = recentItems.length;
    const readRatio = totalItems > 0 ? Math.round(((totalItems - unreadItems) / totalItems) * 100) : 0;
    const peakHour = [...hourBuckets].sort((a, b) => b.count - a.count)[0] || { hour: 0, count: 0 };

    return NextResponse.json({
      periodDays: days,
      summary: {
        totalFeeds,
        totalWorkspaces,
        totalItems,
        unreadItems,
        savedItems,
        bookmarkedItems,
        totalRecent,
        readRatio,
        peakHour: {
          hour: peakHour.hour,
          count: peakHour.count,
        },
      },
      topFeeds,
      activityByHour: hourBuckets,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
