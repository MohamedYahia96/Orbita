import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import {
  createDefaultFocusModeSettings,
  mergeFocusModeSettings,
  resolveFocusModeState,
  sanitizeFocusModeSettings,
} from "@/lib/focus-mode";

export const runtime = "nodejs";

function parseStoredFocusMode(value: string | null, allowedWorkspaceIds: Set<string>) {
  if (!value) {
    return createDefaultFocusModeSettings();
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return sanitizeFocusModeSettings(parsed, allowedWorkspaceIds);
  } catch {
    return createDefaultFocusModeSettings();
  }
}

async function getWorkspaceMap(userId: string) {
  const workspaces = await prisma.workspace.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const byId = new Map(workspaces.map((workspace) => [workspace.id, workspace.name] as const));
  return {
    workspaces,
    byId,
    ids: new Set(workspaces.map((workspace) => workspace.id)),
  };
}

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const workspaceMap = await getWorkspaceMap(user.id);
    const settings = parseStoredFocusMode(user.focusModeSettings, workspaceMap.ids);
    const state = resolveFocusModeState(settings);

    return NextResponse.json({
      settings: state.settings,
      isActive: state.isActive,
      timerExpired: state.timerExpired,
      scheduleMatched: state.scheduleMatched,
      activeWorkspaceName:
        state.settings.workspaceId && state.isActive
          ? workspaceMap.byId.get(state.settings.workspaceId) || null
          : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch focus mode";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getOrCreateDemoUser();
    const workspaceMap = await getWorkspaceMap(user.id);
    const current = parseStoredFocusMode(user.focusModeSettings, workspaceMap.ids);
    const patch = (await req.json()) as unknown;

    const nextSettings = mergeFocusModeSettings(current, patch, workspaceMap.ids);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        focusModeSettings: JSON.stringify(nextSettings),
      },
      select: {
        id: true,
      },
    });

    const state = resolveFocusModeState(nextSettings);

    return NextResponse.json({
      settings: state.settings,
      isActive: state.isActive,
      timerExpired: state.timerExpired,
      scheduleMatched: state.scheduleMatched,
      activeWorkspaceName:
        state.settings.workspaceId && state.isActive
          ? workspaceMap.byId.get(state.settings.workspaceId) || null
          : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update focus mode";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
