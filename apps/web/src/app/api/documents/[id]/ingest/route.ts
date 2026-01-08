import { prisma } from "@hg/db";

import { jsonError, serverError } from "@/lib/http";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, status: true, caseFileId: true }
    });
    if (!doc) return jsonError("Not found", 404);

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "INGESTING", error: null }
    });

    await prisma.job.create({
      data: {
        caseFileId: doc.caseFileId,
        type: "INGEST_DOCUMENT",
        payloadJson: { documentId: doc.id }
      }
    });

    return Response.json({ ok: true }, { status: 202 });
  } catch (err) {
    return serverError(err);
  }
}

