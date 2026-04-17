import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    // Note: In production you should validate x-hub-signature-256 against GITHUB_WEBHOOK_SECRET
    const payload = await req.json();
    const event = req.headers.get('x-github-event');
    
    if (event === 'push' || event === 'release' || event === 'issues') {
        const repoUrl = payload.repository?.html_url;
        
        // Find corresponding active GitHub Feed by matching its URL
        const feed = await prisma.feed.findFirst({
            where: { url: repoUrl, type: 'github', status: 'active' }
        });
        
        if (feed) {
            let itemData: any = null;
            if (event === 'push') {
                const commit = payload.commits[0];
                if (commit) {
                    itemData = {
                        title: `Push: ${commit.message.substring(0, 50)}...`,
                        url: commit.url,
                        content: `User ${commit.author?.name || 'Unknown'} pushed to ${payload.repository.full_name}`,
                        publishedAt: new Date(commit.timestamp)
                    };
                }
            } else if (event === 'release') {
                itemData = {
                   title: `Release: ${payload.release.name}`,
                   url: payload.release.html_url,
                   content: payload.release.body,
                   publishedAt: new Date(payload.release.published_at)
                };
            }
            
            if (itemData) {
                // Ensure duplicate check via url
                const existing = await prisma.feedItem.findFirst({
                    where: { feedId: feed.id, url: itemData.url }
                });

                if (!existing) {
                    await prisma.feedItem.create({
                        data: {
                            feedId: feed.id,
                            title: itemData.title,
                            url: itemData.url,
                            content: itemData.content,
                            mediaType: 'article',
                            publishedAt: itemData.publishedAt,
                            extraData: JSON.stringify({ event })
                        }
                    });
                }
            }
        }
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[GitHub Webhook Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
