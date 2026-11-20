import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { getUser } from "@/lib/supabase/server";
import { jsonError, unauthorized } from "@/lib/http";
import { aboveThreshold, retrieve } from "@/lib/retrieval";
import { streamChat } from "@/lib/llm";
import { buildAnswerMessages, extractCitations } from "@/lib/prompt";
import { NOT_FOUND, type ChatMetadata, type ChatUIMessage } from "@/lib/chat-types";

export const maxDuration = 30;

const MAX_QUESTION_CHARS = 2000;

/**
 * POST /api/chat {conversation_id?, message} → stream de mensaje del AI SDK.
 * Las citas usadas van en la metadata del mensaje al terminar.
 * T10: sin historial ni guardado (T12/T13); conversation_id solo limita los documentos.
 */
export async function POST(request: Request) {
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);

  const { supabase, user } = await getUser();
  if (!user) return unauthorized();
  const authMs = ms();

  let body: { conversation_id?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "La petición no es JSON válido.");
  }
  const question = typeof body.message === "string" ? body.message.trim() : "";
  if (!question) return jsonError(400, "Escribe una pregunta.");
  if (question.length > MAX_QUESTION_CHARS) {
    return jsonError(400, `La pregunta no puede pasar de ${MAX_QUESTION_CHARS} caracteres.`);
  }

  // Documentos de la conversación (vacío = todos los del usuario).
  let docIds: string[] = [];
  if (body.conversation_id != null) {
    if (typeof body.conversation_id !== "string") return jsonError(400, "conversation_id no es válido.");
    const { data: conversation } = await supabase
      .from("rag_conversations")
      .select("document_ids")
      .eq("id", body.conversation_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!conversation) return jsonError(404, "No se encontró la conversación.");
    docIds = conversation.document_ids ?? [];
  }

  let chunks;
  const steps: { embedMs?: number; rpcMs?: number } = {};
  try {
    chunks = await retrieve(supabase, question, docIds, steps);
  } catch (err) {
    console.error("[chat] recuperación:", err);
    return jsonError(500, "No se pudo buscar en tus documentos.");
  }
  const retrievalMs = ms();
  const best = chunks[0]?.similarity ?? 0;
  const found = aboveThreshold(chunks).length > 0;

  // Nombres de los documentos citables, para el prompt y las citas.
  const docNames = new Map<string, string>();
  if (found) {
    const ids = [...new Set(chunks.map((c) => c.document_id))];
    const { data: docs } = await supabase
      .from("rag_documents")
      .select("id, name")
      .eq("user_id", user.id)
      .in("id", ids);
    for (const d of docs ?? []) docNames.set(d.id, d.name);
  }

  const stream = createUIMessageStream<ChatUIMessage>({
    async execute({ writer }) {
      const textId = "answer";
      let answer = "";
      let firstTokenMs = 0;

      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: textId });

      if (!found) {
        // Principio 2: nada supera el umbral → respuesta fija, sin LLM y sin citas.
        answer = NOT_FOUND;
        firstTokenMs = ms();
        writer.write({ type: "text-delta", id: textId, delta: answer });
      } else {
        for await (const delta of streamChat(buildAnswerMessages(question, chunks, docNames))) {
          if (!answer) firstTokenMs = ms();
          answer += delta;
          writer.write({ type: "text-delta", id: textId, delta });
        }
      }

      writer.write({ type: "text-end", id: textId });

      const citations = found ? extractCitations(answer, chunks, docNames) : [];
      const metadata: ChatMetadata = { citations, timings: { retrievalMs, firstTokenMs, totalMs: ms() } };
      writer.write({ type: "finish", messageMetadata: metadata });

      console.log(
        `[chat] mejor similitud ${best.toFixed(3)} · ${found ? "LLM" : "sin LLM (bajo umbral)"} · ` +
          `recuperación ${retrievalMs} ms (sesión ${authMs}, embedding ${steps.embedMs}, rpc ${steps.rpcMs}) · ` +
          `LLM hasta primer token ${firstTokenMs - retrievalMs} ms · primer token ${firstTokenMs} ms · total ${ms()} ms · ` +
          `citas [${citations.map((c) => c.n).join(", ")}]`,
      );
    },
    onError(err) {
      console.error("[chat] respuesta:", err);
      return "No se pudo generar la respuesta. Inténtalo de nuevo.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
