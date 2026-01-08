import { prisma } from "@hg/db";

import { jsonError, serverError } from "@/lib/http";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const caseFile = await prisma.caseFile.findUnique({
      where: { id: params.id },
      select: { id: true }
    });
    if (!caseFile) return jsonError("Not found", 404);

    await prisma.job.create({
      data: {
        caseFileId: caseFile.id,
        type: "EXTRACT_FACTS",
        payloadJson: { caseFileId: caseFile.id }
      }
    });

    return Response.json({ ok: true }, { status: 202 });
  } catch (err) {
    return serverError(err);
  }
}

