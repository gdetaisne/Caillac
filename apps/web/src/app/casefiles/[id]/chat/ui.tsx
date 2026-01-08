"use client";

import { useMemo, useState } from "react";

type Msg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  mode: string | null;
  savedContextItemId: string | null;
};

export function ChatClient({
  caseFileId,
  initialMessages
}: {
  caseFileId: string;
  initialMessages: Msg[];
}) {
  const [mode, setMode] = useState<"quick" | "deep">("deep");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => messages, [messages]);

  async function send() {
    const msg = text.trim();
    if (!msg) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/casefiles/${caseFileId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: msg, mode })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? `chat failed (${res.status})`);

      setMessages((prev) => [
        ...prev,
        {
          id: json.user.id,
          role: json.user.role,
          content: json.user.content,
          createdAt: json.user.createdAt,
          mode: json.user.mode ?? null,
          savedContextItemId: json.user.savedContextItemId ?? null
        },
        {
          id: json.assistant.id,
          role: json.assistant.role,
          content: json.assistant.content,
          createdAt: json.assistant.createdAt,
          mode: json.assistant.mode ?? null,
          savedContextItemId: json.assistant.savedContextItemId ?? null
        }
      ]);
      setText("");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function saveToContext(messageId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat-messages/${messageId}/save-to-context`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "scenario", status: "validated" })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? `save failed (${res.status})`);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, savedContextItemId: json.manualContextItemId } : m))
      );
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">Mode</label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            disabled={busy}
          >
            <option value="quick">Rapide</option>
            <option value="deep">Deepsearch</option>
          </select>
          {error ? <span className="text-sm text-red-700">{error}</span> : null}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2 text-sm"
            placeholder="Pose une question (facts only)…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
          />
          <button
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            onClick={() => void send()}
            disabled={busy}
          >
            Envoyer
          </button>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Conversation</h2>
        {ordered.length === 0 ? (
          <p className="text-sm text-neutral-600">Aucun message.</p>
        ) : (
          <div className="space-y-3">
            {ordered.map((m) => (
              <div key={m.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-neutral-600">
                    {m.role} · {new Date(m.createdAt).toLocaleString("fr-FR")} {m.mode ? `· ${m.mode}` : ""}
                  </div>
                  <button
                    className="rounded border px-3 py-1 text-xs font-medium disabled:opacity-60"
                    onClick={() => void saveToContext(m.id)}
                    disabled={busy || !!m.savedContextItemId}
                    title="Enregistre ce message dans Contexte (manuel)"
                  >
                    {m.savedContextItemId ? "Ajouté au contexte" : "Ajouter au contexte"}
                  </button>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm">{m.content}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

