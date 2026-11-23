import { getUser } from "@/lib/supabase/server";
import { jsonError, unauthorized } from "@/lib/http";
import { isUuidList, ownDocumentIds } from "@/lib/conversations";
import type { ConversationSummary } from "@/lib/chat-types";

/** POST /api/conversations {document_ids?} → 201 {id}. El título se pone con la primera pregunta. */
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  let body: { document_ids?: unknown } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "La petición no es JSON válido.");
  }
  const requested = body.document_ids ?? [];
  if (!isUuidList(requested)) return jsonError(400, "document_ids no es válido.");
  let documentIds: string[] | null;
  try {
    documentIds = await ownDocumentIds(supabase, user.id, requested);
  } catch (err) {
    console.error("[conversations] documentos:", err);
    return jsonError(500, "No se pudo crear la conversación.");
  }
  if (!documentIds) return jsonError(400, "Alguno de los documentos elegidos no existe.");

  const { data, error } = await supabase
    .from("rag_conversations")
    .insert({ user_id: user.id, document_ids: documentIds })
    .select("id")
    .single();
  if (error) {
    console.error("[conversations] insert:", error.message);
    return jsonError(500, "No se pudo crear la conversación.");
  }
  return Response.json({ id: data.id }, { status: 201 });
}

/** GET /api/conversations → [{id, title, created_at}], la más reciente primero. */
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from("rag_conversations")
    .select("id, title, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[conversations] list:", error.message);
    return jsonError(500, "No se pudieron cargar las conversaciones.");
  }
  return Response.json(data satisfies ConversationSummary[]);
}
