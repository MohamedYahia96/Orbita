import { fetchRssFeed } from './fetchers/rss';
import { scrapeLinkData } from './fetchers/scraper';
import prisma from '@/lib/prisma';
import type { Feed, Prisma } from '@prisma/client';

type SyncOptions = {
  userId?: string;
};

export async function syncAllFeeds(options: SyncOptions = {}) {
  console.log('[Feed Sync] Starting global feed synchronization...');
  
  const whereClause: Prisma.FeedWhereInput = {
    status: { in: ['active', 'error'] },
  };

  if (options.userId) {
    whereClause.userId = options.userId;
  }

  // Find feeds that are eligible for sync
  const feeds = await prisma.feed.findMany({
    where: whereClause,
  });

  const results = { total: feeds.length, success: 0, failed: 0 };

  for (const feed of feeds) {
    try {
      await syncSingleFeed(feed);
      results.success++;
    } catch (err) {
      console.error(`[Feed Sync] Failed for feed ${feed.id}:`, err);
      results.failed++;
    }
  }

  console.log(`[Feed Sync] Completed. Success: ${results.success}, Failed: ${results.failed}`);
  return results;
}

type ParsedSyncItem = {
  title: string;
  link: string;
  content: string;
  image: string | null;
  guid: string;
  pubDate?: string;
};

export async function syncSingleFeed(feed: Feed) {
  let newItems: Prisma.FeedItemCreateManyInput[] = [];
  const feedUpdates: Prisma.FeedUpdateInput = {};

  try {
    if (feed.type === 'rss' || feed.type === 'youtube' || feed.type === 'github') {
      const urlToFetch = feed.rssUrl || feed.url;
      if (!urlToFetch) throw new Error('No URL to fetch');
      
      // Attempt to parse standard RSS/Atom XML
      const parsedData = await fetchRssFeed(urlToFetch);
      if (!parsedData || !parsedData.items) throw new Error('Failed to parse RSS feed from URL');
      
      newItems = parsedData.items.map((item: ParsedSyncItem) => ({
        feedId: feed.id,
        title: item.title,
        url: item.link,
        content: item.content,
        image: item.image,
        mediaType: feed.type === 'youtube' ? 'video' : 'article',
        extraData: JSON.stringify({ guid: item.guid }),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      }));

      if (!feed.favicon && parsedData.favicon) {
        feedUpdates.favicon = parsedData.favicon;
      }
    } else if (feed.type === 'custom_link') {
      if (feed.url) {
        const scrapedData = await scrapeLinkData(feed.url);
        if (scrapedData) {
          newItems = [{
            feedId: feed.id,
            title: scrapedData.title || feed.title,
            url: feed.url,
            content: scrapedData.content || scrapedData.description || '',
            image: scrapedData.image,
            mediaType: 'article',
            extraData: JSON.stringify({ isStaticLink: true }),
            publishedAt: new Date()
          }];

          if (!feed.favicon && scrapedData.favicon) {
            feedUpdates.favicon = scrapedData.favicon;
          }
        }
      }
    }

    if (newItems.length > 0) {
      // Avoid duplicates by checking existing URLs
      const urls = newItems.map(i => i.url).filter(Boolean) as string[];
      const existingItems = await prisma.feedItem.findMany({
        where: { feedId: feed.id, url: { in: urls } },
        select: { url: true }
      });
      
      const existingUrls = new Set(
        existingItems.map(i => i.url).filter((url): url is string => Boolean(url))
      );
      const itemsToInsert = newItems.filter(item => !item.url || !existingUrls.has(item.url));

      if (itemsToInsert.length > 0) {
        await prisma.feedItem.createMany({
          data: itemsToInsert,
        });
        console.log(`[Feed Sync] Inserted ${itemsToInsert.length} new items for feed: ${feed.title}`);

        // Trigger Web Push Notification
        try {
          const { notifyUsersOfNewItems } = await import('./push-sender');
          await notifyUsersOfNewItems(
            feed.title,
            itemsToInsert.length,
            itemsToInsert[0]?.title || feed.title,
            itemsToInsert[0]?.url || null
          );
        } catch (pushError) {
          console.warn('[Feed Sync] Push delivery failed:', pushError);
        }
      }
    }

    feedUpdates.status = 'active';
  } catch (error) {
    feedUpdates.status = 'error';
    throw error;
  } finally {
    feedUpdates.lastChecked = new Date();
    try {
      await prisma.feed.update({
        where: { id: feed.id },
        data: feedUpdates,
      });
    } catch (updateError) {
      console.error(`[Feed Sync] Failed to update feed status for ${feed.id}:`, updateError);
    }
  }
}
