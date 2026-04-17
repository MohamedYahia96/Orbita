import { fetchRssFeed } from './fetchers/rss';
import { scrapeLinkData } from './fetchers/scraper';
import prisma from '@/lib/prisma';

export async function syncAllFeeds() {
  console.log('[Feed Sync] Starting global feed synchronization...');
  
  // Find all active feeds
  const feeds = await prisma.feed.findMany({
    where: { status: 'active' },
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

export async function syncSingleFeed(feed: any) {
  let newItems: any[] = [];
  let feedUpdates: any = {};
  
  if (feed.type === 'rss' || feed.type === 'youtube' || feed.type === 'github') {
    const urlToFetch = feed.rssUrl || feed.url;
    if (!urlToFetch) throw new Error('No URL to fetch');
    
    // Attempt to parse standard RSS/Atom XML
    const parsedData = await fetchRssFeed(urlToFetch);
    if (!parsedData || !parsedData.items) throw new Error('Failed to parse RSS feed from URL');
    
    newItems = parsedData.items.map(item => ({
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
    
    const existingUrls = new Set(existingItems.map(i => i.url));
    const itemsToInsert = newItems.filter(item => !existingUrls.has(item.url));

    if (itemsToInsert.length > 0) {
      await prisma.feedItem.createMany({
        data: itemsToInsert,
      });
      console.log(`[Feed Sync] Inserted ${itemsToInsert.length} new items for feed: ${feed.title}`);

      // Trigger Web Push Notification
      try {
         const { notifyUsersOfNewItems } = await import('./push-sender');
         await notifyUsersOfNewItems(feed.title, itemsToInsert.length, itemsToInsert[0].title, itemsToInsert[0].url);
      } catch (e) {
         console.warn('[Feed Sync] Push delivery failed:', e);
      }
    }
  }

  // Update timestamps and details
  feedUpdates.lastChecked = new Date();
  
  await prisma.feed.update({
    where: { id: feed.id },
    data: feedUpdates,
  });
}
