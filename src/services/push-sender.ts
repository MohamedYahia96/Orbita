import webpush from 'web-push';
import prisma from '@/lib/prisma';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:kontakt@orbita.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function notifyUsersOfNewItems(feedTitle: string, newItemCount: number, recentItemTitle: string, url: string | null) {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    
    try {
        const subscriptions = await prisma.pushSubscription.findMany();
        if (!subscriptions.length) return;

        const payload = JSON.stringify({
            title: `New in ${feedTitle}`,
            body: `${newItemCount} new item(s). Latest: ${recentItemTitle}`,
            url: url || '/en/feeds',
            icon: '/favicon.ico'
        });

        const promises = subscriptions.map(sub => 
            webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, payload).catch(err => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    console.log('Subscription invalid, deleting config...', sub.endpoint);
                    return prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
                } else {
                    console.error('Failed to send push notification', err);
                }
            })
        );
        
        await Promise.all(promises);
    } catch (e) {
        console.error('Notification dispatch error', e);
    }
}
