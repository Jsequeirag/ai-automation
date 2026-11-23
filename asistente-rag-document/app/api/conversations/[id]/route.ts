import { getUser } from "@/lib/supabase/server";
import { jsonError, unauthorized } from "@/lib/http";
import { hydrateCitations, isUuidList, ownDocumentIds } from "@/lib/conversations";
import type { ConversationDetail, StoredCitation } from "@/lib/chat-types";

/**
 * GET /api/conversations/:id → {id, title, document_ids, messages[]}.
 * Las citas se devuelven con el texto actual del fragmento; si se borró, deleted: true.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  const { data: conversation } = await supabase
    .from("rag_conversations")
    .select("id, title, document_ids")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conversation) return jsonError(404, "No se encontró la conversación.");

  const { data: rows, error } = await supabase
    .from("rag_messages")
    .select("id, role, content, citations")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("id", { ascending: true });
  if (error) {
    console.error("[conversation] messages:", error.message);
    return jsonError(500, "No se pudo cargar la conversación.");
  }

  let citations;
  try {
    citations = await hydrateCitations(
      supabase,
      user.id,
      rows.map((m) => (m.citations as StoredCitation[] | null) ?? []),
    );
  } catch (err) {
    console.error("[conversation] citas:", err);
    return jsonError(500, "No se pudo cargar la conversación.");
  }

  const detail: ConversationDetail = {
    id: conversation.id,
    title: conversation.title,
    document_ids: conversation.document_ids ?? [],
    messages: rows.map((m, i) => ({ id: m.id, role: m.role, content: m.content, citations: citations[i] })),
  };
  return Response.json(detail);
}

/**
 * PATCH /api/conversations/:id {document_ids} → 200 {id, document_ids}.
 * Elige en qué documentos busca la conversación (vacío = todos). Solo se aceptan documentos propios.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  let body: { document_ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "La petición no es JSON válido.");
  }
  if (!isUuidList(body.document_ids)) return jsonError(400, "document_ids no es válido.");

  let documentIds: string[] | null;
  try {
    documentIds = await ownDocumentIds(supabase, user.id, body.document_ids);
  } catch (err) {
    console.error("[conversation] documentos:", err);
    return jsonError(500, "No se pudo guardar la selección.");
  }
  if (!documentIds) return jsonError(400, "Alguno de los documentos elegidos no existe.");

  const { data, error } = await supabase
    .from("rag_conversations")
    .update({ document_ids: documentIds })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, document_ids")
    .maybeSingle();
  if (error) {
    console.error("[conversation] patch:", error.message);
    return jsonError(500, "No se pudo guardar la selección.");
  }
  if (!data) return jsonError(404, "No se encontró la conversación.");
  return Response.json(data);
}
