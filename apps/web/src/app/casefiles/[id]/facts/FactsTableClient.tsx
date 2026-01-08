"use client";

import { useMemo, useState } from "react";

type FactRow = {
  id: string;
  factType: string;
  label: string;
  valueString: string | null;
  valueNumber: number | null;
  valueDate: string | null;
  unit: string | null;
  currency: string | null;
  confidence: number;
  status: "extracted" | "validated" | "rejected";
  source?: {
    documentId: string;
    pageNumber: number;
    excerpt: string;
  } | null;
};

function formatValue(f: FactRow) {
  if (f.valueDate) return new Date(f.valueDate).toLocaleDateString("fr-FR");
  if (f.valueNumber != null) return `${f.valueNumber}${f.unit ? ` ${f.unit}` : ""}${f.currency ? ` ${f.currency}` : ""}`;
  return f.valueString ?? "";
}

export function FactsTableClient({ initialFacts }: { initialFacts: FactRow[] }) {
  const [facts, setFacts] = useState(initialFacts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const sorted = useMemo(() => facts, [facts]);

  async function patchFact(id: string, payload: any) {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/facts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`PATCH failed (${res.status})`);
      const updated = (await res.json()) as any;
      setFacts((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                label: updated.label,
                valueString: updated.valueString,
                valueNumber: updated.valueNumber,
                valueDate: updated.valueDate,
                unit: updated.unit,
                currency: updated.currency,
                status: updated.status
              }
            : f
        )
      );
      setMsg("OK");
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {msg ? <div className="text-sm text-neutral-700">{msg}</div> : null}
      <div className="overflow-auto">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="border-b text-xs text-neutral-600">
            <tr>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Valeur</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Confiance</th>
              <th className="py-2 pr-4">Source</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((f) => (
              <FactRowView key={f.id} f={f} busy={busyId === f.id} onPatch={patchFact} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FactRowView({
  f,
  busy,
  onPatch
}: {
  f: FactRow;
  busy: boolean;
  onPatch: (id: string, payload: any) => Promise<void>;
}) {
  const [label, setLabel] = useState(f.label);
  const [valueString, setValueString] = useState(f.valueString ?? "");
  const [valueNumber, setValueNumber] = useState(f.valueNumber?.toString() ?? "");
  const [valueDate, setValueDate] = useState(f.valueDate ? f.valueDate.slice(0, 10) : "");
  const [unit, setUnit] = useState(f.unit ?? "");
  const [currency, setCurrency] = useState(f.currency ?? "");

  const displayValue = formatValue(f);

  return (
    <tr className="align-top">
      <td className="py-2 pr-4 font-mono text-xs">{f.factType}</td>
      <td className="py-2 pr-4">
        <input className="w-[260px] rounded border px-2 py-1 text-xs" value={label} onChange={(e) => setLabel(e.target.value)} />
      </td>
      <td className="py-2 pr-4">
        <div className="text-xs text-neutral-700">Actuel: {displayValue || "—"}</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            className="rounded border px-2 py-1 text-xs"
            placeholder="valueString"
            value={valueString}
            onChange={(e) => setValueString(e.target.value)}
          />
          <input
            className="rounded border px-2 py-1 text-xs"
            placeholder="valueNumber"
            value={valueNumber}
            onChange={(e) => setValueNumber(e.target.value)}
          />
          <input
            className="rounded border px-2 py-1 text-xs"
            placeholder="YYYY-MM-DD"
            value={valueDate}
            onChange={(e) => setValueDate(e.target.value)}
          />
          <input className="rounded border px-2 py-1 text-xs" placeholder="unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <input
            className="rounded border px-2 py-1 text-xs"
            placeholder="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </td>
      <td className="py-2 pr-4">{f.status}</td>
      <td className="py-2 pr-4">{f.confidence.toFixed(2)}</td>
      <td className="py-2 pr-4">
        {f.source ? (
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">
              doc {f.source.documentId} · p{f.source.pageNumber}
            </div>
            <div className="max-w-[420px] text-xs text-neutral-800">{f.source.excerpt}</div>
          </div>
        ) : (
          <span className="text-xs text-neutral-600">—</span>
        )}
      </td>
      <td className="py-2 pr-4">
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            className="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            onClick={() => onPatch(f.id, { action: "validate" })}
          >
            Valider
          </button>
          <button
            disabled={busy}
            className="rounded bg-red-700 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            onClick={() => onPatch(f.id, { action: "reject" })}
          >
            Rejeter
          </button>
          <button
            disabled={busy}
            className="rounded bg-neutral-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            onClick={() =>
              onPatch(f.id, {
                action: "edit",
                label,
                valueString: valueString.length ? valueString : null,
                valueNumber: valueNumber.length ? Number(valueNumber) : null,
                valueDate: valueDate.length ? new Date(valueDate).toISOString() : null,
                unit: unit.length ? unit : null,
                currency: currency.length ? currency : null
              })
            }
          >
            Éditer (valide)
          </button>
        </div>
      </td>
    </tr>
  );
}

