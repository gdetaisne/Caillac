import { prisma } from "@hg/db";
import { z } from "zod";

import { jsonError, serverError } from "@/lib/http";

const SaveSchema = z.object({
  kind: z.enum(["note", "scenario", "decision"]).default("scenario"),
  status: z.enum(["draft", "validated"]).default("validated"),
  title: z.string().min(1).optional().nullable()
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: messageId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = SaveSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400);

    const msg = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, caseFileId: true, content: true, savedContextItemId: true }
    });
    if (!msg) return jsonError("Not found", 404);
    if (msg.savedContextItemId) return jsonError("Already saved", 409);

    const item = await prisma.manualContextItem.create({
      data: {
        caseFileId: msg.caseFileId,
        kind: parsed.data.kind,
        status: parsed.data.status,
        title: parsed.data.title ?? null,
        text: msg.content
      },
      select: { id: true }
    });

    await prisma.chatMessage.update({
      where: { id: msg.id },
      data: { savedContextItemId: item.id }
    });

    return Response.json({ ok: true, manualContextItemId: item.id });
  } catch (err) {
    return serverError(err);
  }
}

