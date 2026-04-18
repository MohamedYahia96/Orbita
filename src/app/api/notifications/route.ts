import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getOrCreateDemoUser } from '@/lib/current-user';
import {
  resolveFocusModeState,
  sanitizeFocusModeSettings,
} from '@/lib/focus-mode';

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    let focusSettingsRaw: unknown = null;
    if (user.focusModeSettings) {
      try {
        focusSettingsRaw = JSON.parse(user.focusModeSettings);
      } catch {
        focusSettingsRaw = null;
      }
    }

    const focusSettings = sanitizeFocusModeSettings(focusSettingsRaw);
    const focusState = resolveFocusModeState(focusSettings);
    const focusWorkspaceId =
      focusState.isActive &&
      focusSettings.muteOutsideWorkspace &&
      focusSettings.workspaceId
        ? focusSettings.workspaceId
        : null;

    // Fetch latest 10 unread items
    const notifications = await prisma.feedItem.findMany({
      where: { 
        feed: {
          userId: user.id,
          ...(focusWorkspaceId ? { workspaceId: focusWorkspaceId } : {}),
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

    return NextResponse.json({
      success: true,
      count: notifications.length,
      notifications,
      focusApplied: Boolean(focusWorkspaceId),
      focusWorkspaceId,
    });
  } catch (error) {
    console.error('[API Notifications GET error]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(req: Request) {
    try {
  const user = await getOrCreateDemoUser();

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
