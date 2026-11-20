// Se ejecuta una vez al arrancar cada instancia del servidor (Next.js 16).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Sin await: precarga el modelo de embeddings en segundo plano, sin retrasar el arranque.
  import("./lib/embeddings")
    .then((m) => m.warmUpEmbeddings())
    .catch((err) => console.error("[embeddings] no se pudo precargar:", err));
}
