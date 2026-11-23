import type { UIMessage } from "ai";

// Tipos compartidos entre POST /api/chat y el chat del navegador (sin "server-only").

/** Una cita usada en la respuesta: [n] → documento, página y fragmento. */
export type Citation = {
  n: number;
  document_id: string;
  document: string; // nombre del PDF
  page: number;
  chunk_id: number;
  snippet: string; // texto completo del fragmento, para verificar la cita en la UI
  /** El fragmento ya no existe (documento borrado): la UI muestra "Fuente borrada". */
  deleted?: boolean;
};

/** Lo que se guarda en rag_messages.citations: sin texto, para que borrar un documento borre su contenido. */
export type StoredCitation = Pick<Citation, "n" | "document_id" | "page" | "chunk_id">;

export type ConversationSummary = { id: string; title: string | null; created_at: string };

export type ConversationDetail = {
  id: string;
  title: string | null;
  document_ids: string[];
  messages: { id: number; role: "user" | "assistant"; content: string; citations: Citation[] }[];
};

/** Metadata del mensaje del asistente; llega al terminar el stream. */
export type ChatMetadata = {
  citations?: Citation[];
  /** ms desde que llega la petición: recuperación, primer token y total. */
  timings?: { retrievalMs: number; firstTokenMs: number; totalMs: number };
};

export type ChatUIMessage = UIMessage<ChatMetadata>;

/** Respuesta fija cuando nada supera el umbral (sin llamar al LLM, sin citas). */
export const NOT_FOUND = "No lo encuentro en tus documentos.";
