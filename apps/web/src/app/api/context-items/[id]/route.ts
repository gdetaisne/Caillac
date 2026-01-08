import { prisma } from "@hg/db";
import { z } from "zod";

import { jsonError, serverError } from "@/lib/http";

const PatchSchema = z.object({
  kind: z.enum(["note", "scenario", "decision"]).optional(),
  status: z.enum(["draft", "validated"]).optional(),
  title: z.string().min(1).optional().nullable(),
  text: z.string().min(1).optional()
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400);

    const updated = await prisma.manualContextItem.update({
      where: { id },
      data: {
        ...(parsed.data.kind !== undefined ? { kind: parsed.data.kind } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.text !== undefined ? { text: parsed.data.text } : {})
      },
      select: { id: true, kind: true, status: true, title: true, text: true, createdAt: true, updatedAt: true }
    });
    return Response.json(updated);
  } catch (err: any) {
    if (String(err?.code ?? "") === "P2025") return jsonError("Not found", 404);
    return serverError(err);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await prisma.manualContextItem.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err: any) {
    if (String(err?.code ?? "") === "P2025") return jsonError("Not found", 404);
    return serverError(err);
  }
}

