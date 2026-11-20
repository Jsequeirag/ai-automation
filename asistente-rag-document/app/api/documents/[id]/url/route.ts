import { getUser } from "@/lib/supabase/server";
import { jsonError, unauthorized } from "@/lib/http";
import { STORAGE_BUCKET } from "@/lib/limits";

const SIGNED_URL_SECONDS = 10 * 60;

/**
 * GET /api/documents/:id/url?page=n → {url} firmada por 10 min que abre el PDF en la página n.
 * Única excepción a "el navegador solo habla con Next.js": el PDF se lee directo de Storage.
 * 404 si el documento ya no existe (la UI muestra "Fuente borrada").
 */
export async function GET(request: Request, ctx: RouteContext<"/api/documents/[id]/url">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  const pageParam = new URL(request.url).searchParams.get("page");
  const page = pageParam == null ? 1 : Number(pageParam);
  if (!Number.isInteger(page) || page < 1) return jsonError(400, "La página no es válida.");

  const { data: doc } = await supabase
    .from("rag_documents")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!doc) return jsonError(404, "El documento ya no existe.");

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_SECONDS);
  if (error || !data) {
    console.error("[url] storage:", error?.message);
    return jsonError(500, "No se pudo abrir el PDF.");
  }

  return Response.json({ url: `${data.signedUrl}#page=${page}` });
}
