import { fetchRssFeed } from './fetchers/rss';
import { scrapeLinkData } from './fetchers/scraper';
import {
  TELEGRAM_DEFAULT_FAVICON,
  fetchTelegramChannelUpdates,
} from './fetchers/telegram';
import {
  GMAIL_DEFAULT_FAVICON,
  fetchGmailFeedItems,
} from './fetchers/gmail';
import {
  DRIVE_DEFAULT_FAVICON,
  fetchDriveFeedItems,
} from './fetchers/drive';
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
  mediaType?: 'article' | 'video' | 'image';
  extraData?: Record<string, unknown>;
};

type GmailFeedMetadata = {
  labelIds: string[];
  query: string | null;
};

type DriveFeedMetadata = {
  folderId: string;
};

function parseGmailFeedMetadata(metadata: string | null): GmailFeedMetadata {
  if (!metadata) {
    return {
      labelIds: ['INBOX'],
      query: null,
    };
  }

  try {
    const parsed = JSON.parse(metadata) as {
      labelIds?: unknown;
      query?: unknown;
    };

    const labelIds = Array.isArray(parsed.labelIds)
      ? parsed.labelIds
          .filter((label): label is string => typeof label === 'string')
          .map((label) => label.trim())
          .filter((label) => label.length > 0)
      : [];

    return {
      labelIds: labelIds.length > 0 ? labelIds : ['INBOX'],
      query: typeof parsed.query === 'string' && parsed.query.trim() ? parsed.query.trim() : null,
    };
  } catch {
    return {
      labelIds: ['INBOX'],
      query: null,
    };
  }
}

function parseDriveFeedMetadata(metadata: string | null): DriveFeedMetadata {
  if (!metadata) {
    return {
      folderId: 'root',
    };
  }

  try {
    const parsed = JSON.parse(metadata) as {
      folderId?: unknown;
    };

    return {
      folderId:
        typeof parsed.folderId === 'string' && parsed.folderId.trim()
          ? parsed.folderId.trim()
          : 'root',
    };
  } catch {
    return {
      folderId: 'root',
    };
  }
}

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
    } else if (feed.type === 'telegram') {
      const telegramConfig = await prisma.telegramBot.findUnique({
        where: { feedId: feed.id },
      });

      if (!telegramConfig) {
        throw new Error('Telegram feed is missing bot configuration');
      }

      const parsedData = await fetchTelegramChannelUpdates({
        botToken: telegramConfig.botToken,
        channelUsername: telegramConfig.channelUsername,
      });

      newItems = parsedData.items.map((item: ParsedSyncItem) => ({
        feedId: feed.id,
        title: item.title,
        url: item.link,
        content: item.content,
        image: item.image,
        mediaType: item.mediaType || 'article',
        extraData: JSON.stringify({ guid: item.guid, ...(item.extraData || {}) }),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      }));

      await prisma.telegramBot.update({
        where: { id: telegramConfig.id },
        data: {
          channelUsername: parsedData.channelUsername,
          chatId: parsedData.chatId,
          chatTitle: parsedData.chatTitle,
          chatType: parsedData.chatType,
          lastUpdateId: parsedData.lastUpdateId ?? telegramConfig.lastUpdateId,
        },
      });

      if (!feed.favicon) {
        feedUpdates.favicon = TELEGRAM_DEFAULT_FAVICON;
      }
    } else if (feed.type === 'gmail') {
      const gmailMetadata = parseGmailFeedMetadata(feed.metadata);
      const parsedData = await fetchGmailFeedItems({
        userId: feed.userId,
        labelIds: gmailMetadata.labelIds,
        query: gmailMetadata.query,
      });

      newItems = parsedData.items.map((item: ParsedSyncItem) => ({
        feedId: feed.id,
        title: item.title,
        url: item.link,
        content: item.content,
        image: item.image,
        mediaType: item.mediaType || 'article',
        extraData: JSON.stringify({ guid: item.guid, ...(item.extraData || {}) }),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      }));

      if (!feed.favicon) {
        feedUpdates.favicon = GMAIL_DEFAULT_FAVICON;
      }

      if (!feed.description && parsedData.email) {
        feedUpdates.description = `Gmail inbox (${parsedData.email})`;
      }
    } else if (feed.type === 'drive') {
      const driveMetadata = parseDriveFeedMetadata(feed.metadata);
      const parsedData = await fetchDriveFeedItems({
        userId: feed.userId,
        folderId: driveMetadata.folderId,
      });

      newItems = parsedData.items.map((item: ParsedSyncItem) => ({
        feedId: feed.id,
        title: item.title,
        url: item.link,
        content: item.content,
        image: item.image,
        mediaType: item.mediaType || 'article',
        extraData: JSON.stringify({ guid: item.guid, ...(item.extraData || {}) }),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      }));

      if (!feed.favicon) {
        feedUpdates.favicon = DRIVE_DEFAULT_FAVICON;
      }

      if (!feed.description) {
        if (parsedData.folderName) {
          feedUpdates.description = `Google Drive folder (${parsedData.folderName})`;
        } else if (parsedData.email) {
          feedUpdates.description = `Google Drive (${parsedData.email})`;
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
