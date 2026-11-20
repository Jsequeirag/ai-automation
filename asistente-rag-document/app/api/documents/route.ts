import { NextResponse, after } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { jsonError, unauthorized } from "@/lib/http";
import { ingestDocument } from "@/lib/ingest";
import { MAX_DOCUMENTS, MAX_FILE_BYTES, STORAGE_BUCKET } from "@/lib/limits";

// La ingesta corre en after() dentro de esta misma función: necesita margen.
export const maxDuration = 60;

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from("rag_documents")
    .select("id, name, pages, status, error, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return jsonError(500, "No se pudieron cargar tus documentos.");
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return jsonError(400, "Envía el archivo en el campo «file».");
  }
  if (!(file instanceof File) || file.size === 0) return jsonError(400, "No se recibió ningún archivo.");

  // Tipo: extensión/MIME y además la firma %PDF- del contenido.
  const looksPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const header = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (!looksPdf || header !== "%PDF-") return jsonError(400, "Solo se aceptan archivos PDF.");

  if (file.size > MAX_FILE_BYTES) return jsonError(413, "El archivo pesa más de 10 MB.");

  const { count, error: countError } = await supabase
    .from("rag_documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) return jsonError(500, "No se pudo comprobar tu límite de documentos.");
  if ((count ?? 0) >= MAX_DOCUMENTS) {
    return jsonError(429, `Ya tienes ${MAX_DOCUMENTS} documentos, el máximo. Borra alguno para subir otro.`);
  }

  const id = crypto.randomUUID();
  const storagePath = `${user.id}/${id}.pdf`;
  const name = file.name.slice(0, 200);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) {
    console.error("[upload] storage:", uploadError.message);
    return jsonError(500, "No se pudo guardar el archivo.");
  }

  const { error: insertError } = await supabase
    .from("rag_documents")
    .insert({ id, user_id: user.id, name, storage_path: storagePath, status: "processing" });
  if (insertError) {
    console.error("[upload] insert:", insertError.message);
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return jsonError(500, "No se pudo registrar el documento.");
  }

  after(() => ingestDocument(supabase, id, file));

  return NextResponse.json({ id, name, status: "processing" }, { status: 201 });
}
