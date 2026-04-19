import prisma from "@/lib/prisma";
import { ensureDemoAccount, getCurrentSessionUser } from "@/lib/auth";

export async function getFirstUser() {
  return prisma.user.findFirst();
}

export async function getOrCreateDemoUser() {
  const signedInUser = await getCurrentSessionUser();
  if (signedInUser) {
    return signedInUser;
  }

  return ensureDemoAccount();
}
