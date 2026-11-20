import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { jsonError, unauthorized } from "@/lib/http";
import { retrieve, SIMILARITY_THRESHOLD, MATCH_COUNT } from "@/lib/retrieval";
import set from "@/eval/questions.json";

// Solo desarrollo (T09): corre las 20 preguntas del set contra los documentos del
// usuario de la sesión y muestra similitudes y si la página esperada está entre
// los MATCH_COUNT recuperados. Sirve para fijar SIMILARITY_THRESHOLD.
export async function GET() {
  if (process.env.NODE_ENV === "production") return jsonError(404, "No encontrado.");
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  const { data: docs } = await supabase
    .from("rag_documents")
    .select("id, name, status")
    .eq("user_id", user.id);
  const docs_ = docs ?? [];
  const idByKey: Record<string, string | undefined> = {};
  for (const [key, file] of Object.entries(set.documents)) {
    idByKey[key] = docs_.find((d) => d.name === file && d.status === "ready")?.id;
  }
  const missing = Object.entries(set.documents).filter(([key]) => !idByKey[key]);
  if (missing.length) {
    return jsonError(400, `Sube y procesa primero: ${missing.map(([, f]) => f).join(", ")}`);
  }
  const nameById = Object.fromEntries(docs_.map((d) => [d.id, d.name]));

  const results = [];
  for (const q of set.questions) {
    const chunks = await retrieve(supabase, q.question);
    const top = chunks[0]?.similarity ?? 0;
    const retrieved = chunks.map((c) => `${nameById[c.document_id] ?? c.document_id} p.${c.page} (${c.similarity.toFixed(3)})`);
    const sourcesFound = q.sources.map((s) =>
      chunks.some((c) => c.document_id === idByKey[s.document] && c.page === s.page),
    );
    results.push({
      id: q.id,
      type: q.type,
      question: q.question,
      top: Number(top.toFixed(4)),
      expected: q.sources.map((s) => `${s.document} p.${s.page}`),
      found: sourcesFound,
      retrieved,
    });
  }

  const answerable = results.filter((r) => r.type !== "none");
  const none = results.filter((r) => r.type === "none");
  const minAnswerable = Math.min(...answerable.map((r) => r.top));
  const maxNone = Math.max(...none.map((r) => r.top));
  const recall = answerable.filter((r) => r.found.every(Boolean)).length;

  return NextResponse.json({
    summary: {
      threshold: SIMILARITY_THRESHOLD,
      match_count: MATCH_COUNT,
      recall: `${recall}/${answerable.length} con todas sus páginas entre los ${MATCH_COUNT}`,
      min_top_answerable: Number(minAnswerable.toFixed(4)),
      max_top_none: Number(maxNone.toFixed(4)),
      separable: minAnswerable > maxNone,
      none_below_threshold: none.filter((r) => r.top < SIMILARITY_THRESHOLD).length + "/" + none.length,
      answerable_above_threshold:
        answerable.filter((r) => r.top >= SIMILARITY_THRESHOLD).length + "/" + answerable.length,
    },
    results,
  });
}
