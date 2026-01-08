"use client";

import { useState } from "react";

export function UploadDocuments({ caseFileId }: { caseFileId: string }) {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setLog([]);
    try {
      const list = Array.from(files);
      const form = new FormData();
      for (const f of list) form.append("files", f);

      setLog((l) => [...l, `Upload: ${list.length} fichier(s)`]);
      const uploadRes = await fetch(`/api/casefiles/${caseFileId}/documents/upload`, {
        method: "POST",
        body: form
      });
      if (!uploadRes.ok) throw new Error(`upload failed (${uploadRes.status})`);
      const uploadJson = (await uploadRes.json()) as { items: Array<{ id: string; filename: string }> };

      for (const doc of uploadJson.items) {
        setLog((l) => [...l, `Enqueue ingest: ${doc.filename}`]);
        const ingestRes = await fetch(`/api/documents/${doc.id}/ingest`, { method: "POST" });
        if (!ingestRes.ok) throw new Error(`ingest enqueue failed for ${doc.filename} (${ingestRes.status})`);
      }

      setLog((l) => [...l, "OK"]);
      // Simple refresh: l’utilisateur verra les statuts en rechargeant.
    } catch (e: any) {
      setLog((l) => [...l, `ERROR: ${String(e?.message ?? e)}`]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.docx"
          disabled={busy}
          onChange={(e) => onUpload(e.target.files)}
        />
        {busy ? <span className="text-sm text-neutral-600">Traitement…</span> : null}
      </div>
      {log.length ? (
        <pre className="max-h-56 overflow-auto rounded-md border bg-neutral-50 p-3 text-xs">{log.join("\n")}</pre>
      ) : null}
    </div>
  );
}

