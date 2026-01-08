import { prisma } from "@hg/db";

export const dynamic = "force-dynamic";

export default async function CaseFileContextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: caseFileId } = await params;
  const items = await prisma.manualContextItem.findMany({
    where: { caseFileId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, kind: true, status: true, title: true, text: true, updatedAt: true }
  });

  return (
    <main className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Contexte (manuel)</h1>
        <p className="text-sm text-neutral-600">Visible + modifiable. Utilisé par le chat.</p>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Ajouter</h2>
        <p className="text-sm text-neutral-700">
          Pour l’instant, l’ajout se fait via l’API (et via le chat → “Ajouter au contexte”). UI complète juste après.
        </p>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Liste</h2>
        {items.length === 0 ? (
          <p className="text-sm text-neutral-600">Aucun item.</p>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li key={it.id} className="py-3">
                <div className="text-xs text-neutral-600">
                  {it.kind} · {it.status} · maj {new Date(it.updatedAt).toLocaleString("fr-FR")}
                </div>
                <div className="text-sm font-medium">{it.title ?? "—"}</div>
                <div className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{it.text}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

