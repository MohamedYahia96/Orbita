import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:kontakt@orbita.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export async function POST(req: Request) {
  try {
    const subscription = await req.json();
    
    // Quick user resolver (since we don't have session auth completely wired in this prompt block)
    const user = await prisma.user.findFirst();
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
  } catch (err: any) {
    console.error("Push subscription error", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
