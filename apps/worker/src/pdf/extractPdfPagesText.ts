import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export async function extractPdfPagesText(pdfBuffer: Buffer): Promise<ExtractedPdfPage[]> {
  const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
  const doc = await loadingTask.promise;

  const pages: ExtractedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const parts = content.items
      .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
      .filter(Boolean);
    pages.push({
      pageNumber,
      text: normalizeSpaces(parts.join(" "))
    });
  }

  return pages;
}

