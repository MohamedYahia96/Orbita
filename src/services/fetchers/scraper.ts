import * as cheerio from 'cheerio';

export async function scrapeLinkData(url: string) {
  try {
    const response = await fetch(url, { 
      headers: { 
        'User-Agent': 'Orbita-Bot/1.0 (+https://github.com/MohamedYahia96/Orbita)' 
      },
      next: { revalidate: 3600 } // Cache for 1 hour to avoid spamming
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract Metadata
    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
    
    // Extract Favicon
    let faviconUrl = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
    if (faviconUrl && !faviconUrl.startsWith('http')) {
        try {
           const parsedUrl = new URL(url);
           faviconUrl = `${parsedUrl.protocol}//${parsedUrl.host}${faviconUrl.startsWith('/') ? '' : '/'}${faviconUrl}`;
          } catch {
           faviconUrl = undefined;
        }
    }

    // Try to get some content from main or article elements
    let content = '';
    const mainContent = $('article').text() || $('main').text();
    if (mainContent) {
        // limit to 500 characters
        content = mainContent.replace(/\s+/g, ' ').substring(0, 500).trim();
    }
    
    return { 
      title: title.trim(), 
      description: description.trim(), 
      image, 
      favicon: faviconUrl,
      content 
    };
  } catch (error) {
    console.error(`[Scraper] Failed to scrape URL: ${url}`, error);
    return null;
  }
}
