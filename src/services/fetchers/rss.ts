import Parser from 'rss-parser';

export const rssParser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:group', 'mediaGroup'],
      ['content:encoded', 'contentEncoded']
    ],
  },
});

export async function fetchRssFeed(url: string) {
  try {
    const feed = await rssParser.parseURL(url);
    
    return {
      title: feed.title,
      description: feed.description,
      favicon: feed.image?.url,
      items: feed.items.map((item: any) => {
        // Extract standard fields
        const image = extractImage(item);
        
        return {
          title: item.title || 'Untitled',
          link: item.link || '',
          content: item.contentEncoded || item.content || item.summary || '',
          guid: item.guid || item.id || item.link || '',
          pubDate: item.pubDate || item.isoDate,
          image,
        };
      })
    };
  } catch (error) {
    console.error(`[RSS Parser] Failed to parse URL: ${url}`, error);
    return null;
  }
}

// Utility to reliably extract an image from an RSS item (especially YouTube)
function extractImage(item: any): string | null {
  // Check custom media extensions for YouTube
  if (item.mediaGroup && item.mediaGroup['media:thumbnail']) {
    const thumb = item.mediaGroup['media:thumbnail'][0];
    if (thumb && thumb.$ && thumb.$.url) return thumb.$.url;
  }
  
  if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
    return item.mediaThumbnail.$.url;
  }
  
  // Try to parse img tag from content if no direct image property
  const htmlContent = item.contentEncoded || item.content || '';
  if (htmlContent) {
    const imgMatch = htmlContent.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  
  return null;
}
