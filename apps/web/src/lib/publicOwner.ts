import { prisma } from "@hg/db";

/**
 * Sans auth, on rattache tout à un "owner" public unique.
 * Ça évite de changer le schéma Prisma tout de suite.
 */
export async function getOrCreatePublicOwnerId() {
  const email = "public@heritage.local";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: "disabled"
    }
  });

  return user.id;
}

