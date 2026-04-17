import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    
    if (!q || q.length < 2) return NextResponse.json({ success: true, items: [] });
    
    try {
        const user = await prisma.user.findFirst();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const items = await prisma.feedItem.findMany({
            where: {
                feed: { userId: user.id },
                OR: [
                    { title: { contains: q } },
                    { content: { contains: q } }
                ]
            },
            take: 10,
            include: { feed: { select: { title: true, type: true, favicon: true } } },
            orderBy: { publishedAt: 'desc' }
        });

        return NextResponse.json({ success: true, items });
    } catch(e) {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
