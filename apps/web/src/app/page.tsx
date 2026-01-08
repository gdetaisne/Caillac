export default function HomePage() {
  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Héritage Géraud</h1>
        <p className="text-sm text-neutral-600">
          L’application extrait des <strong>faits uniquement</strong> (champs + sources). Si l’info n’est pas
          explicitement présente : <strong>inconnu</strong>.
        </p>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">MVP</h2>
        <ul className="list-disc pl-5 text-sm text-neutral-700">
          <li>Auth + dossiers</li>
          <li>Upload documents + ingestion (texte par page)</li>
          <li>Extraction déterministe de faits + validation humaine</li>
          <li>Tables + timeline + export JSON</li>
        </ul>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Démarrer</h2>
        <a className="text-sm font-medium text-blue-700 underline" href="/casefiles">
          Aller aux dossiers (CaseFiles)
        </a>
      </section>
    </main>
  );
}

