import "server-only";
import { availableParallelism } from "node:os";
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Embeddings locales y gratuitos con Transformers.js.
// multilingual-e5-small: 384 dimensiones (igual que vector(384) en la base) y exige
// los prefijos "query: " y "passage: ". Cambiar de modelo obliga a cambiar la
// dimensión en la migración y en rag_match_chunks, y a reingerir todo.
export const EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
export const EMBEDDING_DIMENSIONS = 384;
// Medido en local (T05): lotes de 8 con 4 hilos procesan 300 fragmentos en ~10 s;
// con los hilos por defecto o lotes de 32, ONNX satura la CPU y tarda 4-10 veces más.
const BATCH_SIZE = 8;
const THREADS = Math.min(4, availableParallelism());

// En Vercel solo /tmp es escribible.
if (process.env.VERCEL) env.cacheDir = "/tmp/transformers-cache";

let extractor: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
  // Se carga una vez por proceso (la primera vez descarga el modelo, ~120 MB en q8).
  extractor ??= pipeline("feature-extraction", EMBEDDING_MODEL, {
    dtype: "q8",
    session_options: { intraOpNumThreads: THREADS },
  }).catch((err) => {
    extractor = null;
    throw err;
  });
  return extractor;
}

async function embed(texts: string[]): Promise<number[][]> {
  const model = await getExtractor();
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const output = await model(texts.slice(i, i + BATCH_SIZE), { pooling: "mean", normalize: true });
    vectors.push(...(output.tolist() as number[][]));
  }
  return vectors;
}

/** Embeddings de fragmentos de documento (ingesta). */
export function embedPassages(texts: string[]) {
  return embed(texts.map((t) => `passage: ${t}`));
}

/** Embedding de una pregunta (consulta). */
export async function embedQuery(text: string) {
  const [vector] = await embed([`query: ${text}`]);
  return vector;
}

/** Formato literal de pgvector: "[0.1,0.2,...]". */
export const toPgVector = (v: number[]) => JSON.stringify(v);

/**
 * Carga el modelo y hace una inferencia de prueba al arrancar el servidor
 * (instrumentation.ts), para que la primera pregunta no pague esa espera.
 */
export async function warmUpEmbeddings() {
  const t = performance.now();
  await embedQuery("calentamiento");
  console.log(`[embeddings] modelo listo en ${Math.round(performance.now() - t)} ms`);
}
