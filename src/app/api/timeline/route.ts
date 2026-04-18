import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) return NextResponse.json({ success: true, timeline: [] });

        const items = await prisma.feedItem.findMany({
            where: { feed: { userId: user.id } },
            take: 15,
            include: { feed: { select: { title: true, favicon: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, timeline: items });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
