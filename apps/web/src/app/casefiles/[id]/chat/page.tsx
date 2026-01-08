import { prisma } from "@hg/db";

import { ChatClient } from "./ui";

export const dynamic = "force-dynamic";

export default async function CaseFileChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: caseFileId } = await params;

  const messages = await prisma.chatMessage.findMany({
    where: { caseFileId },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
      mode: true,
      savedContextItemId: true
    }
  });

  return (
    <main className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <p className="text-sm text-neutral-600">
          Modes: <strong>Rapide</strong> vs <strong>Deepsearch</strong>. “Ajouter au contexte” enregistre un message en
          contexte manuel.
        </p>
      </header>

      <ChatClient
        caseFileId={caseFileId}
        initialMessages={messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
          mode: m.mode ?? null,
          savedContextItemId: m.savedContextItemId ?? null
        }))}
      />
    </main>
  );
}

