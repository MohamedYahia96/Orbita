import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type UpdateReadingListBody = {
  title?: string;
  url?: string | null;
  note?: string | null;
  isRead?: boolean;
  isSavedForLater?: boolean;
  tagIds?: string[];
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as UpdateReadingListBody;
    const { title, url, note, isRead, isSavedForLater, tagIds } = body;

    const dataToUpdate: Prisma.FeedItemUpdateInput = {
      title, 
      url, 
      note, 
      isRead, 
      isSavedForLater 
    };

    if (tagIds !== undefined) {
      dataToUpdate.tags = {
        deleteMany: {}, // remove old tags
        create: tagIds.map((tagId: string) => ({
          tag: { connect: { id: tagId } }
        }))
      };
    }

    const item = await prisma.feedItem.update({
      where: { id },
      data: dataToUpdate,
      include: {
        tags: { include: { tag: true } }
      }
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Failed to update reading list item:", error);
    return NextResponse.json(
      { error: "Failed to update reading list item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.feedItem.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete reading list item:", error);
    return NextResponse.json(
      { error: "Failed to delete reading list item" },
      { status: 500 }
    );
  }
}
