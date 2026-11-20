import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embedPassages, toPgVector } from "./embeddings";
import { MAX_PAGES } from "./limits";

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
const INSERT_BATCH = 100;

type Status = "ready" | "no_text" | "error";

/**
 * Pipeline de ingesta (corre en after(), dentro de la misma función, sin colas):
 * PDFLoader → divisor → embeddings → rag_chunks, y deja el documento en
 * ready, no_text o error (con el motivo en español en rag_documents.error).
 */
export async function ingestDocument(supabase: SupabaseClient, documentId: string, file: Blob) {
  const finish = async (status: Status, pages: number | null, error: string | null = null) => {
    const { error: dbError } = await supabase
      .from("rag_documents")
      .update({ status, pages, error })
      .eq("id", documentId);
    if (dbError) console.error(`[ingest ${documentId}] no se pudo marcar ${status}:`, dbError.message);
  };

  const started = Date.now();
  let pages: number | null = null;
  try {
    // Una entrada por página con texto; las páginas sin texto no aparecen.
    const pageDocs = await new PDFLoader(file).load();
    pages = (pageDocs[0]?.metadata.pdf?.totalPages as number | undefined) ?? null;

    if (pages !== null && pages > MAX_PAGES) {
      return await finish("error", pages, `El PDF tiene ${pages} páginas y el máximo es ${MAX_PAGES}.`);
    }

    const withText = pageDocs.filter((d) => d.pageContent.trim().length > 0);
    if (withText.length === 0) {
      return await finish(
        "no_text",
        pages,
        "No se encontró texto en el PDF. Parece escaneado y el reconocimiento de texto (OCR) no está disponible.",
      );
    }

    const chunks = (await splitter.splitDocuments(withText))
      .map((c) => ({ page: c.metadata.loc?.pageNumber as number, content: c.pageContent.trim() }))
      .filter((c) => c.content.length > 0 && Number.isInteger(c.page));

    const vectors = await embedPassages(chunks.map((c) => c.content));
    const rows = chunks.map((c, i) => ({
      document_id: documentId,
      page: c.page,
      content: c.content,
      embedding: toPgVector(vectors[i]),
    }));

    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const { error } = await supabase.from("rag_chunks").insert(rows.slice(i, i + INSERT_BATCH));
      if (error) throw new Error(`insert rag_chunks: ${error.message}`);
    }

    await finish("ready", pages);
    console.log(`[ingest ${documentId}] ready: ${pages} páginas, ${rows.length} fragmentos, ${Date.now() - started} ms`);
  } catch (err) {
    console.error(`[ingest ${documentId}] error:`, err);
    const encrypted = err instanceof Error && /password/i.test(err.message);
    await finish(
      "error",
      pages,
      encrypted ? "El PDF está protegido con contraseña." : "No se pudo procesar el PDF. Prueba a subirlo de nuevo.",
    );
  }
}
