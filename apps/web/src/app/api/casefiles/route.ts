import { prisma } from "@hg/db";
import { z } from "zod";

import { getOrCreatePublicOwnerId } from "@/lib/publicOwner";
import { jsonError, serverError } from "@/lib/http";

const CreateCaseFileSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional()
});

export async function GET() {
  try {
    const items = await prisma.caseFile.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true }
    });
    return Response.json(items);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = CreateCaseFileSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400);

    const ownerId = await getOrCreatePublicOwnerId();
    const created = await prisma.caseFile.create({
      data: {
        ownerId,
        name: parsed.data.name,
        description: parsed.data.description
      },
      select: { id: true, name: true, description: true, createdAt: true }
    });

    return Response.json(created, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

