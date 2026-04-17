import { NextResponse } from 'next/server';
import { syncAllFeeds } from '@/services/feed-sync';

// Set this to run optimally on standard edge or serverless
export const runtime = 'nodejs'; // Use nodejs because rss-parser/cheerio might rely on Node built-ins
export const maxDuration = 300; // Allow up to 5 minutes to fetch all feeds

export async function GET(req: Request) {
  // Check if we are in production and running on Vercel
  const authHeader = req.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const results = await syncAllFeeds();
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('[Cron API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
