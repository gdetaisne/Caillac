export default async function CaseFileTimelinePage({ params }: { params: { id: string } }) {
  return (
    <main className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <p className="text-sm text-neutral-600">Dossier: {params.id}</p>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <p className="text-sm text-neutral-700">
          Timeline (événements triés par date → fait → source) à venir.
        </p>
      </section>
    </main>
  );
}

