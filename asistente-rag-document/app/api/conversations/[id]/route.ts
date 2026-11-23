import { getUser } from "@/lib/supabase/server";
import { jsonError, unauthorized } from "@/lib/http";
import { hydrateCitations } from "@/lib/conversations";
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
