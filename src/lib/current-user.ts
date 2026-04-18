import prisma from "@/lib/prisma";

export async function getFirstUser() {
  return prisma.user.findFirst();
}

export async function getOrCreateDemoUser() {
  let user = await prisma.user.findFirst();

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "demo@orbita.local",
        name: "Demo User",
      },
    });
  }

  return user;
}
