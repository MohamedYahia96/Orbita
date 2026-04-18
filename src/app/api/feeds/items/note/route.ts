import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getFirstUser } from '@/lib/current-user';

export async function PATCH(req: Request) {
    try {
        const user = await getFirstUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { itemId, note } = await req.json();
        
        if (!itemId) return NextResponse.json({ success: false }, { status: 400 });

        const result = await prisma.feedItem.updateMany({
            where: {
                id: itemId,
                feed: {
                    userId: user.id
                }
            },
            data: { note, updatedAt: new Date() }
        });

        if (result.count === 0) {
            return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
