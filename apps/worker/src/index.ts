import "dotenv/config";

import { prisma } from "@hg/db";
import { env } from "@hg/env";

import { extractPdfPagesText } from "./pdf/extractPdfPagesText";
import { extractFactsFromPage } from "./facts/extractors";

import { readFile } from "node:fs/promises";
import { hostname } from "node:os";

async function claimNextJob() {
  const now = new Date();
  const workerId = hostname();

  return await prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({
      where: {
        status: "QUEUED",
        runAt: { lte: now },
        lockedAt: null
      },
      orderBy: [{ runAt: "asc" }, { createdAt: "asc" }]
    });
    if (!job) return null;

    const res = await tx.job.updateMany({
      where: { id: job.id, status: "QUEUED", lockedAt: null },
      data: { status: "RUNNING", lockedAt: now, lockedBy: workerId, attempts: { increment: 1 } }
    });

    if (res.count !== 1) return null;
    return job;
  });
}

async function runJob(job: any) {
  if (job.type === "INGEST_DOCUMENT") {
    const documentId = String(job.payloadJson?.documentId ?? "");
    if (!documentId) throw new Error("Missing documentId");

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, caseFileId: true, mimetype: true, localPath: true }
    });
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "INGESTING", error: null }
    });

    const fileBuffer = await readFile(doc.localPath);

    if (doc.mimetype !== "application/pdf") {
      throw new Error(`Unsupported mimetype for ingestion (v1): ${doc.mimetype}`);
    }

    const pages = await extractPdfPagesText(fileBuffer);

    await prisma.documentPage.deleteMany({ where: { documentId: doc.id } });
    await prisma.documentPage.createMany({
      data: pages.map((p) => ({
        documentId: doc.id,
        pageNumber: p.pageNumber,
        text: p.text,
        ocrUsed: false
      }))
    });

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "INGESTED", error: null }
    });

    return;
  }

  if (job.type === "EXTRACT_FACTS") {
    const caseFileId = String(job.payloadJson?.caseFileId ?? job.caseFileId ?? "");
    if (!caseFileId) throw new Error("Missing caseFileId");

    await prisma.fact.deleteMany({
      where: { caseFileId, status: "extracted" }
    });

    const pages = await prisma.documentPage.findMany({
      where: {
        document: { caseFileId, status: "INGESTED" }
      },
      select: {
        documentId: true,
        pageNumber: true,
        text: true
      },
      orderBy: [{ documentId: "asc" }, { pageNumber: "asc" }]
    });

    for (const p of pages) {
      const extracted = extractFactsFromPage({
        documentId: p.documentId,
        pageNumber: p.pageNumber,
        text: p.text
      });

      for (const f of extracted) {
        await prisma.fact.create({
          data: {
            caseFileId,
            factType: f.factType,
            label: f.label,
            valueString: f.valueString,
            valueNumber: f.valueNumber,
            valueDate: f.valueDate,
            unit: f.unit,
            currency: f.currency,
            confidence: f.confidence,
            status: "extracted",
            sources: {
              create: {
                documentId: f.source.documentId,
                pageNumber: f.source.pageNumber,
                excerpt: f.source.excerpt.slice(0, 300),
                locatorJson: f.source.locatorJson,
                extractorVersion: env.EXTRACTOR_VERSION
              }
            }
          }
        });
      }
    }

    return;
  }

  throw new Error(`Unknown job type: ${String(job.type)}`);
}

async function tick() {
  const job = await claimNextJob();
  if (!job) return;

  try {
    await runJob(job);
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "DONE", lockedAt: null, lockedBy: null, lastError: null }
    });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    console.error("[worker] job failed", { id: job.id, type: job.type, msg });
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "FAILED", lockedAt: null, lockedBy: null, lastError: msg }
    });
  }
}

console.log("[worker] started", {
  pollMs: env.JOB_POLL_INTERVAL_MS,
  uploadDir: env.UPLOAD_DIR
});

setInterval(() => {
  void tick();
}, env.JOB_POLL_INTERVAL_MS);

// run immediately
void tick();

