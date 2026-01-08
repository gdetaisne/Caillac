import { prisma } from "@hg/db";
import { z } from "zod";

import { jsonError, serverError } from "@/lib/http";

const CreateSchema = z.object({
  kind: z.enum(["note", "scenario", "decision"]).optional(),
  status: z.enum(["draft", "validated"]).optional(),
  title: z.string().min(1).optional().nullable(),
  text: z.string().min(1)
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseFileId } = await ctx.params;
    const items = await prisma.manualContextItem.findMany({
      where: { caseFileId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, kind: true, status: true, title: true, text: true, createdAt: true, updatedAt: true }
    });
    return Response.json(items);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseFileId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400);

    const created = await prisma.manualContextItem.create({
      data: {
        caseFileId,
        kind: parsed.data.kind ?? "note",
        status: parsed.data.status ?? "draft",
        title: parsed.data.title ?? null,
        text: parsed.data.text
      },
      select: { id: true, kind: true, status: true, title: true, text: true, createdAt: true, updatedAt: true }
    });
    return Response.json(created, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

