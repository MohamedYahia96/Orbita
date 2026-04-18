import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const items = await prisma.feedItem.findMany({
            where: {
                feed: { userId: user.id },
                isRead: false,
                publishedAt: { gte: sevenDaysAgo }
            },
            include: { feed: true },
            orderBy: { publishedAt: 'desc' }
        });

        // Smart Digest Categorization
        const categorized: {
            articles: typeof items;
            videos: typeof items;
            others: typeof items;
        } = { articles: [], videos: [], others: [] };
        items.forEach(i => {
           if (i.mediaType === 'video') categorized.videos.push(i);
           else if (i.mediaType === 'article') categorized.articles.push(i);
           else categorized.others.push(i);
        });

        // Pick top 5 from each category for the digest
        const topDigest = {
            articles: categorized.articles.slice(0, 5),
            videos: categorized.videos.slice(0, 5),
            others: categorized.others.slice(0, 5),
            total: items.length
        };

        return NextResponse.json({ success: true, digest: topDigest });
    } catch(e) {
        console.log(e);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
