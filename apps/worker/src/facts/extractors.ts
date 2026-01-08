export type ExtractedFact = {
  factType: string;
  label: string;
  valueString?: string;
  valueNumber?: number;
  valueDate?: Date;
  unit?: string;
  currency?: string;
  confidence: number;
  source: {
    documentId: string;
    pageNumber: number;
    excerpt: string;
    locatorJson?: any;
  };
};

function clipExcerpt(text: string, start: number, end: number, maxLen = 300) {
  const pad = 120;
  const s = Math.max(0, start - pad);
  const e = Math.min(text.length, end + pad);
  let excerpt = text.slice(s, e).replace(/\s+/g, " ").trim();
  if (excerpt.length > maxLen) excerpt = excerpt.slice(0, maxLen);
  return { excerpt, locatorJson: { start, end } };
}

function parseFrenchNumber(raw: string) {
  // "200 000", "200.000", "200 000", "200,5"
  const normalized = raw
    .replace(/\u202f/g, " ")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

const monthMap: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
  décembre: 12
};

function parseFrenchDate(raw: string): Date | null {
  const s = raw.trim();
  // 10/11/1997 or 10-11-1997
  const m1 = s.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (m1) {
    const d = Number(m1[1]);
    const mo = Number(m1[2]);
    const y = Number(m1[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return Number.isFinite(dt.getTime()) ? dt : null;
  }
  // 10 novembre 1997
  const m2 = s
    .toLowerCase()
    .match(/\b(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})\b/);
  if (m2) {
    const d = Number(m2[1]);
    const mo = monthMap[m2[2]] ?? 0;
    const y = Number(m2[3]);
    if (!mo) return null;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return Number.isFinite(dt.getTime()) ? dt : null;
  }
  return null;
}

export function extractFactsFromPage(input: {
  documentId: string;
  pageNumber: number;
  text: string;
}): ExtractedFact[] {
  const { documentId, pageNumber, text } = input;
  const out: ExtractedFact[] = [];
  const t = text ?? "";

  // Montants en € / francs (valeur unique)
  for (const re of [
    /\b(\d{1,3}(?:[ .\u202f]\d{3})*(?:,\d+)?)\s*(€|euros?)\b/gi,
    /\b(\d{1,3}(?:[ .\u202f]\d{3})*(?:,\d+)?)\s*(francs?|fr)\b/gi
  ]) {
    for (const m of t.matchAll(re)) {
      const rawNum = String(m[1] ?? "");
      const unit = String(m[2] ?? "").toLowerCase();
      const n = parseFrenchNumber(rawNum);
      if (n == null) continue;
      const { excerpt, locatorJson } = clipExcerpt(t, m.index ?? 0, (m.index ?? 0) + m[0].length);
      out.push({
        factType: unit.startsWith("fr") ? "amount:franc" : "amount:eur",
        label: unit.startsWith("fr") ? "Montant (FRF)" : "Montant (€)",
        valueNumber: n,
        currency: unit.startsWith("fr") ? "FRF" : "EUR",
        confidence: 0.9,
        source: { documentId, pageNumber, excerpt, locatorJson }
      });
    }
  }

  // Fourchette de valeur: "entre 200 000€ et 250 000€"
  for (const m of t.matchAll(
    /\bentre\s+(\d{1,3}(?:[ .\u202f]\d{3})*(?:,\d+)?)\s*(€|euros?)\s+et\s+(\d{1,3}(?:[ .\u202f]\d{3})*(?:,\d+)?)\s*(€|euros?)\b/gi
  )) {
    const a = parseFrenchNumber(String(m[1] ?? ""));
    const b = parseFrenchNumber(String(m[3] ?? ""));
    if (a == null || b == null) continue;
    const { excerpt, locatorJson } = clipExcerpt(t, m.index ?? 0, (m.index ?? 0) + m[0].length);
    out.push({
      factType: "valuation:range",
      label: "Fourchette de valeur",
      valueString: `${a}–${b} EUR`,
      currency: "EUR",
      confidence: 0.9,
      source: { documentId, pageNumber, excerpt, locatorJson }
    });
  }

  // Dates FR (en tant que "date mentionnée")
  for (const m of t.matchAll(
    /\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{1,2}\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+\d{4})\b/gi
  )) {
    const raw = String(m[1] ?? "");
    const dt = parseFrenchDate(raw);
    if (!dt) continue;
    const { excerpt, locatorJson } = clipExcerpt(t, m.index ?? 0, (m.index ?? 0) + m[0].length);
    out.push({
      factType: "date:mentioned",
      label: "Date mentionnée",
      valueDate: dt,
      confidence: 0.8,
      source: { documentId, pageNumber, excerpt, locatorJson }
    });
  }

  // Parts SCI: "830 parts", "600 parts"
  for (const m of t.matchAll(/\b(\d{1,6})\s+parts?\b/gi)) {
    const n = Number(m[1]);
    if (!Number.isFinite(n)) continue;
    const { excerpt, locatorJson } = clipExcerpt(t, m.index ?? 0, (m.index ?? 0) + m[0].length);
    out.push({
      factType: "company:shares",
      label: "Nombre de parts",
      valueNumber: n,
      unit: "parts",
      confidence: 0.9,
      source: { documentId, pageNumber, excerpt, locatorJson }
    });
  }

  // Régime fiscal: "IR article 8 CGI"
  for (const m of t.matchAll(/\bIR\s+article\s+8\s+CGI\b/gi)) {
    const { excerpt, locatorJson } = clipExcerpt(t, m.index ?? 0, (m.index ?? 0) + m[0].length);
    out.push({
      factType: "company:tax",
      label: "Régime fiscal",
      valueString: "IR (article 8 CGI)",
      confidence: 0.95,
      source: { documentId, pageNumber, excerpt, locatorJson }
    });
  }

  // Protection / classement: "inscrit MH 10/11/1997"
  for (const m of t.matchAll(/\binscrit\s+MH\s+([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{4})\b/gi)) {
    const dt = parseFrenchDate(String(m[1] ?? ""));
    const { excerpt, locatorJson } = clipExcerpt(t, m.index ?? 0, (m.index ?? 0) + m[0].length);
    out.push({
      factType: "asset:heritage_listing",
      label: "Inscription MH",
      valueDate: dt ?? undefined,
      valueString: dt ? undefined : String(m[1] ?? ""),
      confidence: 0.9,
      source: { documentId, pageNumber, excerpt, locatorJson }
    });
  }

  return out;
}

