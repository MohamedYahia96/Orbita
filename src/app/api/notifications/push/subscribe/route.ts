import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import webpush from 'web-push';
import { getFirstUser } from '@/lib/current-user';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const hasVapidConfig = Boolean(vapidPublicKey && vapidPrivateKey);

if (hasVapidConfig) {
  webpush.setVapidDetails(
    'mailto:kontakt@orbita.com',
    vapidPublicKey as string,
    vapidPrivateKey as string
  );
}

export async function POST(req: Request) {
  try {
    if (!hasVapidConfig) {
      return NextResponse.json(
        { success: false, error: 'Push is not configured. Missing VAPID keys.' },
        { status: 503 }
      );
    }

    const subscription = await req.json();
    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid push subscription payload' },
        { status: 400 }
      );
    }
    
    const user = await getFirstUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { 
        userId: user.id, 
        p256dh: subscription.keys.p256dh, 
        auth: subscription.keys.auth 
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: user.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Push subscription failed';
    console.error("Push subscription error", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
