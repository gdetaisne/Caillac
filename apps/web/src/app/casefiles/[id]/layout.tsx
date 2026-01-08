export default function CaseFileLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-4 text-sm">
        <a className="underline" href="/casefiles">
          ← Dossiers
        </a>
        <a className="underline" href={`/casefiles/${params.id}/documents`}>
          Documents
        </a>
        <a className="underline" href={`/casefiles/${params.id}/facts`}>
          Faits
        </a>
        <a className="underline" href={`/casefiles/${params.id}/timeline`}>
          Timeline
        </a>
      </nav>
      {children}
    </div>
  );
}

