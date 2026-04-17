import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request) {
    try {
        const { itemId, note } = await req.json();
        
        if (!itemId) return NextResponse.json({ success: false }, { status: 400 });

        await prisma.feedItem.update({
            where: { id: itemId },
            data: { note, updatedAt: new Date() }
        });
        
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
