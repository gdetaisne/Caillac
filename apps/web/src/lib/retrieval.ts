import { prisma } from "@hg/db";

export type RetrievedSnippet = {
  documentId: string;
  pageNumber: number;
  text: string;
  rank: number;
};

export async function retrievePageSnippets(args: {
  caseFileId: string;
  query: string;
  limit: number;
}): Promise<RetrievedSnippet[]> {
  const { caseFileId, query, limit } = args;

  // "simple" = pas de stemming/locale, fiable sur FR sans config serveur.
  const rows = await prisma.$queryRaw<
    Array<{ documentId: string; pageNumber: number; snippet: string; rank: number }>
  >`
    SELECT
      dp."documentId" as "documentId",
      dp."pageNumber" as "pageNumber",
      LEFT(REGEXP_REPLACE(dp."text", '\\s+', ' ', 'g'), 300) as "snippet",
      ts_rank_cd(to_tsvector('simple', dp."text"), plainto_tsquery('simple', ${query})) as "rank"
    FROM "DocumentPage" dp
    JOIN "Document" d ON d."id" = dp."documentId"
    WHERE
      d."caseFileId" = ${caseFileId}
      AND d."status" = 'INGESTED'
      AND to_tsvector('simple', dp."text") @@ plainto_tsquery('simple', ${query})
    ORDER BY "rank" DESC
    LIMIT ${limit};
  `;

  return rows.map((r) => ({
    documentId: r.documentId,
    pageNumber: r.pageNumber,
    text: r.snippet,
    rank: Number(r.rank ?? 0)
  }));
}

