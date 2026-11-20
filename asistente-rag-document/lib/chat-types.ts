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
