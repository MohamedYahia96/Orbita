import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import {
  createDefaultDashboardLayout,
  sanitizeDashboardLayout,
} from "@/lib/dashboard-layout";

export const runtime = "nodejs";

function resolveLayoutFromStorage(storedLayout: string | null) {
  if (!storedLayout) {
    return createDefaultDashboardLayout();
  }

  try {
    const parsed = JSON.parse(storedLayout) as unknown;
    return sanitizeDashboardLayout(parsed);
  } catch {
    return createDefaultDashboardLayout();
  }
}

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const layout = resolveLayoutFromStorage(user.dashboardLayout);

    return NextResponse.json(layout);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard layout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getOrCreateDemoUser();
    const body = (await req.json()) as unknown;
    const nextLayout = sanitizeDashboardLayout(body);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        dashboardLayout: JSON.stringify(nextLayout),
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json(nextLayout);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update dashboard layout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
