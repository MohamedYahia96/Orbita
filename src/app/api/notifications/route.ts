import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    // Determine the user's latest feeds or unread feeds
    // In a real app we'd get `userId` from auth session
    const user = await prisma.user.findFirst();
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    // Fetch latest 10 unread items
    const notifications = await prisma.feedItem.findMany({
      where: { 
        feed: {
          userId: user.id
        },
        isRead: false
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      include: {
        feed: {
          select: { title: true, favicon: true }
        }
      }
    });

    return NextResponse.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    console.error('[API Notifications GET error]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { action, id } = payload;
        
        if (action === 'mark_read' && id) {
            await prisma.feedItem.update({
                where: { id },
                data: { isRead: true }
            });
        }
        
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
