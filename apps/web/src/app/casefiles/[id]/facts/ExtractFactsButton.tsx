"use client";

import { useState } from "react";

export function ExtractFactsButton({ caseFileId }: { caseFileId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/casefiles/${caseFileId}/extract-facts`, { method: "POST" });
      if (!res.ok) throw new Error(`enqueue failed (${res.status})`);
      setMsg("Extraction lancée (worker). Recharge dans quelques secondes.");
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? "En cours…" : "Extract facts"}
      </button>
      {msg ? <span className="text-sm text-neutral-700">{msg}</span> : null}
    </div>
  );
}

