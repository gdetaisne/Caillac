export default async function CaseFileLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-4 text-sm">
        <a className="underline" href="/casefiles">
          ← Dossiers
        </a>
        <a className="underline" href={`/casefiles/${id}/documents`}>
          Documents
        </a>
        <a className="underline" href={`/casefiles/${id}/facts`}>
          Faits
        </a>
        <a className="underline" href={`/casefiles/${id}/timeline`}>
          Timeline
        </a>
        <a className="underline" href={`/casefiles/${id}/context`}>
          Contexte
        </a>
        <a className="underline" href={`/casefiles/${id}/chat`}>
          Chat
        </a>
      </nav>
      {children}
    </div>
  );
}

