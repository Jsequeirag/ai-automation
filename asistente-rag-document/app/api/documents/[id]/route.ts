import { getUser } from "@/lib/supabase/server";
import { jsonError, unauthorized } from "@/lib/http";
import { STORAGE_BUCKET } from "@/lib/limits";

// Borra el archivo y la fila; rag_chunks (con sus vectores) cae en cascada.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  const { data: doc } = await supabase
    .from("rag_documents")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!doc) return jsonError(404, "El documento no existe.");

  // remove() no da error si una política bloquea el borrado: devuelve la lista vacía.
  // Se comprueba que el archivo de verdad salió (lista vacía también si ya no existía).
  const { data: removed, error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([doc.storage_path]);
  if (storageError) {
    console.error("[delete] storage:", storageError.message);
    return jsonError(500, "No se pudo borrar el archivo.");
  }
  if (removed.length === 0) {
    const folder = doc.storage_path.split("/")[0];
    const { data: still } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folder, { search: doc.storage_path.split("/")[1] });
    if (still?.length) {
      console.error("[delete] storage: el archivo sigue ahí (¿falta la política de borrado?)");
      return jsonError(500, "No se pudo borrar el archivo.");
    }
  }

  const { error } = await supabase.from("rag_documents").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("[delete] row:", error.message);
    return jsonError(500, "No se pudo borrar el documento.");
  }

  return new Response(null, { status: 204 });
}
