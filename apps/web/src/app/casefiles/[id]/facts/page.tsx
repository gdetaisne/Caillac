import { prisma } from "@hg/db";

import { ExtractFactsButton } from "./ExtractFactsButton";
import { FactsTableClient } from "./FactsTableClient";

export const dynamic = "force-dynamic";

export default async function CaseFileFactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const facts = await prisma.fact.findMany({
    where: { caseFileId: id },
    orderBy: [{ valueDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      factType: true,
      label: true,
      valueString: true,
      valueNumber: true,
      valueDate: true,
      unit: true,
      currency: true,
      confidence: true,
      status: true,
      sources: {
        take: 1,
        orderBy: { extractedAt: "desc" },
        select: {
          documentId: true,
          pageNumber: true,
          excerpt: true,
          extractorVersion: true,
          extractedAt: true
        }
      }
    }
  });

  return (
    <main className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Faits</h1>
        <p className="text-sm text-neutral-600">Dossier: {id}</p>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Extraction</h2>
        <ExtractFactsButton caseFileId={id} />
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Table</h2>
        {facts.length === 0 ? (
          <p className="text-sm text-neutral-600">Aucun fait pour l’instant.</p>
        ) : (
          <FactsTableClient
            initialFacts={facts.map((f) => ({
              id: f.id,
              factType: f.factType,
              label: f.label,
              valueString: f.valueString,
              valueNumber: f.valueNumber,
              valueDate: f.valueDate ? new Date(f.valueDate).toISOString() : null,
              unit: f.unit,
              currency: f.currency,
              confidence: f.confidence,
              status: f.status,
              source: f.sources[0]
                ? {
                    documentId: f.sources[0].documentId,
                    pageNumber: f.sources[0].pageNumber,
                    excerpt: f.sources[0].excerpt
                  }
                : null
            }))}
          />
        )}
      </section>
    </main>
  );
}

