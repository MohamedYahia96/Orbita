import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getFirstUser } from '@/lib/current-user';

export async function GET() {
  try {
    const user = await getFirstUser();
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
    const user = await getFirstUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const payload = await req.json();
        const { action, id } = payload;
        
        if (action === 'mark_read' && id) {
      const result = await prisma.feedItem.updateMany({
        where: {
          id,
          feed: {
            userId: user.id
          }
        },
                data: { isRead: true }
            });

      if (result.count === 0) {
        return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
      }
        }
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
