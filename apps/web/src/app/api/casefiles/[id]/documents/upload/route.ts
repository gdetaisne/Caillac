import { prisma } from "@hg/db";
import { env } from "@hg/env";

import { getOrCreatePublicOwnerId } from "@/lib/publicOwner";
import { jsonError, serverError } from "@/lib/http";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function safeName(filename: string) {
  return filename.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 160);
}

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const caseFileId = params.id;

    const caseFile = await prisma.caseFile.findUnique({
      where: { id: caseFileId },
      select: { id: true }
    });
    if (!caseFile) return jsonError("Not found", 404);

    // Assure l'existence de l'owner public (schéma actuel).
    await getOrCreatePublicOwnerId();

    const form = await req.formData();
    const files = form.getAll("files").filter((f) => f instanceof File) as File[];
    if (files.length === 0) return jsonError("No files", 400);

    const dir = path.join(env.UPLOAD_DIR, caseFileId);
    await mkdir(dir, { recursive: true });

    const created = [];
    for (const file of files) {
      const name = safeName(file.name || "document");
      const localPath = path.join(dir, `${crypto.randomUUID()}-${name}`);
      const buf = Buffer.from(await file.arrayBuffer());

      await writeFile(localPath, buf);

      const doc = await prisma.document.create({
        data: {
          caseFileId,
          filename: file.name || name,
          mimetype: file.type || "application/octet-stream",
          sizeBytes: buf.length,
          storage: "LOCAL",
          localPath,
          status: "UPLOADED"
        },
        select: { id: true, filename: true, mimetype: true, uploadedAt: true, status: true }
      });
      created.push(doc);
    }

    return Response.json({ items: created }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

