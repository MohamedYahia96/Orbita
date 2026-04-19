import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getExpiredSessionCookieOptions,
  getSessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";

export const DEMO_EMAIL = "demo@orbita.local";
export const DEMO_PASSWORD = "demo123";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  theme: string;
  locale: string;
  plan: string;
  dashboardLayout: string | null;
  focusModeSettings: string | null;
};

function toPublicUser(user: {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  theme: string;
  locale: string;
  plan: string;
  dashboardLayout: string | null;
  focusModeSettings: string | null;
}) {
  return user;
}

export async function getUserFromSessionToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      theme: true,
      locale: true,
      plan: true,
      dashboardLayout: true,
      focusModeSettings: true,
    },
  });

  return user ? toPublicUser(user) : null;
}

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return getUserFromSessionToken(token);
}

export async function createAuthSession(userId: string) {
  return createSessionToken(userId);
}

export function setAuthCookie(response: { cookies: { set: (name: string, value: string, options: ReturnType<typeof getSessionCookieOptions>) => void } }, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
}

export function clearAuthCookie(response: { cookies: { set: (name: string, value: string, options: ReturnType<typeof getExpiredSessionCookieOptions>) => void } }) {
  response.cookies.set(AUTH_COOKIE_NAME, "", getExpiredSessionCookieOptions());
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user?.passwordHash) {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return toPublicUser(user);
}

export async function ensureDemoAccount() {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  const passwordHash = hashPassword(DEMO_PASSWORD);

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo User",
        passwordHash,
      },
    });

    return toPublicUser(created);
  }

  if (!existing.passwordHash) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash },
    });

    return toPublicUser(updated);
  }

  return toPublicUser(existing);
}

export async function createRegisteredUser(input: { name: string; email: string; password: string }) {
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: hashPassword(input.password),
    },
  });

  return toPublicUser(user);
}

export async function getSignedInOrDemoUser() {
  const sessionUser = await getCurrentSessionUser();
  if (sessionUser) {
    return sessionUser;
  }

  return ensureDemoAccount();
}