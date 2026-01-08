import { prisma } from "@hg/db";

export default async function DocumentPagesPage({
  params
}: {
  params: { id: string; documentId: string };
}) {
  const doc = await prisma.document.findFirst({
    where: { id: params.documentId, caseFileId: params.id },
    select: { id: true, filename: true, status: true, error: true }
  });
  if (!doc) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Document introuvable</h1>
      </main>
    );
  }

  const pages = await prisma.documentPage.findMany({
    where: { documentId: doc.id },
    orderBy: { pageNumber: "asc" },
    select: { pageNumber: true, text: true, ocrUsed: true }
  });

  return (
    <main className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <p className="text-sm text-neutral-600">
          {doc.filename} · {doc.status}
        </p>
        {doc.error ? <p className="text-sm text-red-700">Erreur: {doc.error}</p> : null}
      </header>

      {pages.length === 0 ? (
        <section className="rounded-lg border bg-white p-4">
          <p className="text-sm text-neutral-600">
            Aucune page extraite pour l’instant. Si le statut est INGESTING, attends le worker.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {pages.map((p) => (
            <section key={p.pageNumber} className="rounded-lg border bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium">Page {p.pageNumber}</h2>
                {p.ocrUsed ? <span className="text-xs text-neutral-600">OCR</span> : null}
              </div>
              <pre className="whitespace-pre-wrap break-words text-xs text-neutral-800">{p.text || ""}</pre>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

