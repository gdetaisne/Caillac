import { prisma } from "@hg/db";
import { z } from "zod";

import { getOrCreatePublicOwnerId } from "@/lib/publicOwner";

const CreateCaseFileSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional()
});

async function createCaseFile(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const description = descriptionRaw.length ? descriptionRaw : undefined;

  const parsed = CreateCaseFileSchema.safeParse({ name, description });
  if (!parsed.success) throw new Error("Invalid form");

  const ownerId = await getOrCreatePublicOwnerId();
  await prisma.caseFile.create({
    data: {
      ownerId,
      name: parsed.data.name,
      description: parsed.data.description
    }
  });
}

export default async function CaseFilesPage() {
  const items = await prisma.caseFile.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, createdAt: true }
  });

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Dossiers</h1>
        <p className="text-sm text-neutral-600">
          Un dossier regroupe documents, pages extraites, faits, timeline et exports. Pas d’auth : tout est public.
        </p>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Créer un dossier</h2>
        <form action={createCaseFile} className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Nom</span>
            <input
              name="name"
              required
              minLength={1}
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="Succession Géraud"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Description (optionnel)</span>
            <input
              name="description"
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="Notes factuelles, périmètre, etc."
            />
          </label>
          <div className="md:col-span-2">
            <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">Créer</button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Liste</h2>
        {items.length === 0 ? (
          <p className="text-sm text-neutral-600">Aucun dossier pour l’instant.</p>
        ) : (
          <ul className="divide-y">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  {c.description ? <div className="truncate text-xs text-neutral-600">{c.description}</div> : null}
                </div>
                <a className="text-sm font-medium text-blue-700 underline" href={`/casefiles/${c.id}/documents`}>
                  Ouvrir
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

