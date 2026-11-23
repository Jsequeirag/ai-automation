import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Citation, StoredCitation } from "./chat-types";

const TITLE_CHARS = 60;

/** Título de la conversación: la primera pregunta, cortada en una palabra si es larga. */
export function titleFrom(question: string) {
  const text = question.replace(/\s+/g, " ").trim();
  if (text.length <= TITLE_CHARS) return text;
  const cut = text.slice(0, TITLE_CHARS);
  const space = cut.lastIndexOf(" ");
  return `${(space > 30 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Quita el texto y el nombre de las citas antes de guardarlas (plan.md › citas de documentos borrados). */
export const toStored = (citations: Citation[]): StoredCitation[] =>
  citations.map(({ n, document_id, page, chunk_id }) => ({ n, document_id, page, chunk_id }));

/**
 * Rellena las citas guardadas con el nombre del documento y el texto del fragmento,
 * leídos ahora de rag_chunks. Si el fragmento ya no existe, la cita queda como borrada.
 */
export async function hydrateCitations(
  supabase: SupabaseClient,
  userId: string,
  lists: StoredCitation[][],
): Promise<Citation[][]> {
  const chunkIds = [...new Set(lists.flat().map((c) => c.chunk_id))];
  const docIds = [...new Set(lists.flat().map((c) => c.document_id))];
  if (chunkIds.length === 0) return lists.map(() => []);

  const [{ data: chunks, error: chunksError }, { data: docs, error: docsError }] = await Promise.all([
    supabase.from("rag_chunks").select("id, content").eq("user_id", userId).in("id", chunkIds),
    supabase.from("rag_documents").select("id, name").eq("user_id", userId).in("id", docIds),
  ]);
  if (chunksError || docsError) throw new Error(chunksError?.message ?? docsError?.message);

  const content = new Map((chunks ?? []).map((c) => [Number(c.id), c.content as string]));
  const names = new Map((docs ?? []).map((d) => [d.id as string, d.name as string]));

  return lists.map((list) =>
    list.map((c) => {
      const text = content.get(Number(c.chunk_id));
      return text == null
        ? { ...c, document: "", snippet: "", deleted: true }
        : { ...c, document: names.get(c.document_id) ?? "Documento", snippet: text.trim() };
    }),
  );
}
