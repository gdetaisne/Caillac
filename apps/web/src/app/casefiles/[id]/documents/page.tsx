import { prisma } from "@hg/db";

import { UploadDocuments } from "./UploadDocuments";

export const dynamic = "force-dynamic";

export default async function CaseFileDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documents = await prisma.document.findMany({
    where: { caseFileId: id },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, filename: true, mimetype: true, uploadedAt: true, status: true, error: true }
  });

  return (
    <main className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-neutral-600">Dossier: {id}</p>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Upload</h2>
        <UploadDocuments caseFileId={id} />
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Liste</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-neutral-600">Aucun document.</p>
        ) : (
          <ul className="divide-y">
            {documents.map((d) => (
              <li key={d.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{d.filename}</div>
                    <div className="text-xs text-neutral-600">
                      {d.mimetype} · {new Date(d.uploadedAt).toLocaleString("fr-FR")} · {d.status}
                    </div>
                    {d.error ? <div className="mt-1 text-xs text-red-700">Erreur: {d.error}</div> : null}
                  </div>
                  <a className="text-sm font-medium text-blue-700 underline" href={`/casefiles/${id}/documents/${d.id}`}>
                    Pages
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

