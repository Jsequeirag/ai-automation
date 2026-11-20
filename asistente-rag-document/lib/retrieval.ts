import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery, toPgVector } from "./embeddings";

export const MATCH_COUNT = 6;

/**
 * Similitud coseno mínima del mejor fragmento para responder. Si ningún fragmento
 * la supera, se responde "No lo encuentro en tus documentos" sin llamar al LLM.
 * Fijado con el set de evaluación (T09): la pregunta con respuesta más baja dio 0,813
 * y la de fuera de tema 0,767. Solo corta preguntas ajenas a los documentos: las del
 * tema pero sin respuesta (hasta 0,920) las frena la regla del prompt (T10).
 * Revisar con `npm run eval` si cambian el modelo, el divisor o los documentos.
 */
export const SIMILARITY_THRESHOLD = 0.79;

export type RetrievedChunk = {
  id: number;
  document_id: string;
  page: number;
  content: string;
  similarity: number;
};

/**
 * Los MATCH_COUNT fragmentos más parecidos a la pregunta entre los documentos del
 * usuario de la sesión (rag_match_chunks filtra por auth.uid(); RLS también).
 * docIds vacío = todos sus documentos. Si se pasa timings, anota cuánto tardó cada paso.
 */
export async function retrieve(
  supabase: SupabaseClient,
  question: string,
  docIds: string[] = [],
  timings?: { embedMs?: number; rpcMs?: number },
): Promise<RetrievedChunk[]> {
  let t = performance.now();
  const embedding = await embedQuery(question);
  if (timings) timings.embedMs = Math.round(performance.now() - t);
  t = performance.now();
  const { data, error } = await supabase.rpc("rag_match_chunks", {
    query_embedding: toPgVector(embedding),
    doc_ids: docIds,
    match_count: MATCH_COUNT,
  });
  if (timings) timings.rpcMs = Math.round(performance.now() - t);
  if (error) throw new Error(`rag_match_chunks: ${error.message}`);
  return data as RetrievedChunk[];
}

/** Fragmentos que superan el umbral (vacío = "No lo encuentro"). */
export const aboveThreshold = (chunks: RetrievedChunk[]) =>
  chunks.filter((c) => c.similarity >= SIMILARITY_THRESHOLD);
