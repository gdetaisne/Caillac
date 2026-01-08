import { prisma } from "@hg/db";
import { z } from "zod";

import { getOrCreatePublicOwnerId } from "@/lib/publicOwner";
import { jsonError, serverError } from "@/lib/http";

const PatchFactSchema = z.object({
  action: z.enum(["validate", "reject", "edit"]),
  label: z.string().min(1).optional(),
  valueString: z.string().optional().nullable(),
  valueNumber: z.number().optional().nullable(),
  valueDate: z.string().datetime().optional().nullable(),
  unit: z.string().optional().nullable(),
  currency: z.string().optional().nullable()
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = PatchFactSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400);

    const existing = await prisma.fact.findUnique({
      where: { id },
      include: { sources: { select: { id: true } } }
    });
    if (!existing) return jsonError("Not found", 404);

    const actorId = await getOrCreatePublicOwnerId();

    const beforeJson = {
      id: existing.id,
      status: existing.status,
      label: existing.label,
      valueString: existing.valueString,
      valueNumber: existing.valueNumber,
      valueDate: existing.valueDate,
      unit: existing.unit,
      currency: existing.currency,
      confidence: existing.confidence,
      sourcesCount: existing.sources.length
    };

    const data: any = {};
    if (parsed.data.action === "validate") data.status = "validated";
    if (parsed.data.action === "reject") data.status = "rejected";
    if (parsed.data.action === "edit") {
      if (parsed.data.label !== undefined) data.label = parsed.data.label;
      if (parsed.data.valueString !== undefined) data.valueString = parsed.data.valueString;
      if (parsed.data.valueNumber !== undefined) data.valueNumber = parsed.data.valueNumber;
      if (parsed.data.valueDate !== undefined)
        data.valueDate = parsed.data.valueDate ? new Date(parsed.data.valueDate) : null;
      if (parsed.data.unit !== undefined) data.unit = parsed.data.unit;
      if (parsed.data.currency !== undefined) data.currency = parsed.data.currency;
      // Si l’utilisateur édite, on considère que c’est une validation humaine.
      data.status = "validated";
    }

    const updated = await prisma.fact.update({
      where: { id: existing.id },
      data,
      select: {
        id: true,
        caseFileId: true,
        factType: true,
        label: true,
        valueString: true,
        valueNumber: true,
        valueDate: true,
        unit: true,
        currency: true,
        confidence: true,
        status: true,
        updatedAt: true
      }
    });

    const afterJson = {
      id: updated.id,
      status: updated.status,
      label: updated.label,
      valueString: updated.valueString,
      valueNumber: updated.valueNumber,
      valueDate: updated.valueDate,
      unit: updated.unit,
      currency: updated.currency,
      confidence: updated.confidence
    };

    await prisma.auditLog.create({
      data: {
        actorId,
        action: `fact.${parsed.data.action}`,
        objectType: "Fact",
        objectId: updated.id,
        beforeJson,
        afterJson
      }
    });

    return Response.json(updated);
  } catch (err) {
    return serverError(err);
  }
}

