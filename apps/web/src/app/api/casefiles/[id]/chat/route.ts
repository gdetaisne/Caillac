import { prisma } from "@hg/db";
import { env } from "@hg/env";
import { z } from "zod";

import { jsonError, serverError } from "@/lib/http";
import { retrievePageSnippets } from "@/lib/retrieval";

const ChatSchema = z.object({
  message: z.string().min(1),
  mode: z.enum(["quick", "deep"]).default("deep")
});

function systemPrompt() {
  return [
    "Tu es un assistant de dossier factuel de succession.",
    "Règles impératives:",
    "- Ne JAMAIS donner de conseil (juridique/fiscal/patrimonial) ni d'interprétation.",
    "- Ne JAMAIS inventer. Si non sourcé: répondre 'inconnu'.",
    "- Toujours citer les sources quand tu utilises un fait/extrait (docId + page + extrait).",
    "- Distinguer clairement: CONTEXTE MANUEL (saisi par l'utilisateur) vs FAITS SOURCÉS (documents).",
    "",
    "Format de sortie:",
    "- Réponse courte et précise",
    "- Puis une section 'Sources' listant les citations utilisées"
  ].join("\n");
}

async function callOpenAI(args: { messages: Array<{ role: string; content: string }> }) {
  if (!env.OPENAI_API_KEY) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: args.messages
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error (${res.status}): ${txt.slice(0, 500)}`);
  }

  const json = (await res.json()) as any;
  return String(json?.choices?.[0]?.message?.content ?? "");
}

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseFileId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400);

    const userMsg = await prisma.chatMessage.create({
      data: {
        caseFileId,
        role: "user",
        content: parsed.data.message,
        mode: parsed.data.mode
      },
      select: { id: true, role: true, content: true, createdAt: true }
    });

    const manual = await prisma.manualContextItem.findMany({
      where: { caseFileId, status: "validated" },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { kind: true, title: true, text: true, status: true }
    });

    const facts = await prisma.fact.findMany({
      where: { caseFileId, status: { in: ["validated", "extracted"] } },
      orderBy: [{ valueDate: "asc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        factType: true,
        label: true,
        valueString: true,
        valueNumber: true,
        valueDate: true,
        unit: true,
        currency: true,
        status: true,
        sources: {
          take: 1,
          orderBy: { extractedAt: "desc" },
          select: { documentId: true, pageNumber: true, excerpt: true }
        }
      }
    });

    const snippetLimit = parsed.data.mode === "quick" ? 6 : 20;
    const snippets = await retrievePageSnippets({
      caseFileId,
      query: parsed.data.message,
      limit: snippetLimit
    });

    const contextBlocks: string[] = [];
    if (manual.length) {
      contextBlocks.push(
        "CONTEXTE MANUEL (validé):\n" +
          manual
            .map((m: { kind: string; title: string | null; text: string }, i: number) => `- [${i + 1}] (${m.kind}) ${m.title ? m.title + " — " : ""}${m.text}`)
            .join("\n")
      );
    }

    if (facts.length) {
      contextBlocks.push(
        "FAITS (extraits + sources):\n" +
          facts
            .map((f, i) => {
              const src = f.sources[0];
              const value =
                f.valueDate
                  ? new Date(f.valueDate).toISOString().slice(0, 10)
                  : f.valueNumber != null
                    ? `${f.valueNumber}${f.unit ? ` ${f.unit}` : ""}${f.currency ? ` ${f.currency}` : ""}`
                    : f.valueString ?? "";
              const cit = src ? `doc=${src.documentId} p=${src.pageNumber} excerpt="${src.excerpt}"` : "source=inconnue";
              return `- [F${i + 1}] ${f.factType} | ${f.label} = ${value} | status=${f.status} | ${cit}`;
            })
            .join("\n")
      );
    }

    if (snippets.length) {
      contextBlocks.push(
        "EXTRAITS PAGES (recherche):\n" +
          snippets
            .map((s, i) => `- [S${i + 1}] doc=${s.documentId} p=${s.pageNumber} excerpt="${s.text}"`)
            .join("\n")
      );
    }

    const messages = [
      { role: "system", content: systemPrompt() },
      { role: "user", content: `QUESTION:\n${parsed.data.message}\n\nCONTEXTE:\n${contextBlocks.join("\n\n")}` }
    ];

    const answer = await callOpenAI({ messages });
    if (!answer) {
      return jsonError("OPENAI_API_KEY missing (chat disabled)", 400);
    }

    const assistantMsg = await prisma.chatMessage.create({
      data: { caseFileId, role: "assistant", content: answer, mode: parsed.data.mode },
      select: { id: true, role: true, content: true, createdAt: true }
    });

    return Response.json({ user: userMsg, assistant: assistantMsg });
  } catch (err) {
    return serverError(err);
  }
}

