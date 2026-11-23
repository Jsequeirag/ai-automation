import "server-only";
import type { ChatMessage } from "./llm";
import type { RetrievedChunk } from "./retrieval";
import { NOT_FOUND, type Citation } from "./chat-types";

// Reglas del plan (paso 4 de la consulta). La de "no lo encuentro" es la que frena
// las preguntas del tema pero sin respuesta, que el umbral no separa (ver T09).
const SYSTEM_PROMPT = `Eres un asistente que responde preguntas sobre los documentos del usuario.
Recibes fragmentos numerados [1], [2]… sacados de sus documentos y una pregunta.

Reglas:
1. Usa SOLO la información de los fragmentos. Nada de conocimiento propio, suposiciones ni cálculos que el texto no respalde.
2. Cita cada afirmación con el número del fragmento del que sale, entre corchetes y justo detrás: "La garantía dura dos años [2]." Si sale de varios, pon cada uno: [1][3]. No uses otro formato de cita ni menciones "fragmento" o "página" en el texto.
3. Si los fragmentos no contienen la respuesta, aunque traten el mismo tema, responde exactamente "${NOT_FOUND}" y nada más, sin citas. Si la pregunta no está en español, di esa misma frase traducida a su idioma.
4. Si solo responden una parte, responde esa parte con sus citas y di claramente qué parte no aparece en los documentos.
5. Responde en el idioma de la pregunta, de forma breve y directa, en texto plano: sin Markdown (nada de **, # ni tablas). Para enumerar, usa líneas que empiecen por "- ".`;

/** Mensajes para el LLM: reglas + fragmentos numerados [1]…[n] con documento y página. */
export function buildAnswerMessages(
  question: string,
  chunks: RetrievedChunk[],
  docNames: Map<string, string>,
): ChatMessage[] {
  const context = chunks
    .map((c, i) => `[${i + 1}] (${docNames.get(c.document_id) ?? "Documento"}, pág. ${c.page})\n${c.content.trim()}`)
    .join("\n\n");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Fragmentos:\n\n${context}\n\nPregunta: ${question}` },
  ];
}

/** ¿La respuesta es el "no lo encuentro" (en español o empezando por él)? */
export const isNotFound = (answer: string) => answer.trim().toLowerCase().startsWith("no lo encuentro");

/**
 * Citas que de verdad aparecen en el texto, en orden de número. Acepta [2], [1][3] y
 * [1, 3]; ignora números fuera de rango. Un "no lo encuentro" nunca lleva citas.
 */
export function extractCitations(
  answer: string,
  chunks: RetrievedChunk[],
  docNames: Map<string, string>,
): Citation[] {
  if (isNotFound(answer)) return [];
  const used = new Set<number>();
  for (const match of answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    for (const n of match[1].split(",").map((s) => Number(s.trim()))) {
      if (n >= 1 && n <= chunks.length) used.add(n);
    }
  }
  return [...used]
    .sort((a, b) => a - b)
    .map((n) => {
      const c = chunks[n - 1];
      return {
        n,
        document_id: c.document_id,
        document: docNames.get(c.document_id) ?? "Documento",
        page: c.page,
        chunk_id: c.id,
        snippet: c.content.trim(), // completo: la UI muestra el fragmento exacto usado (H3)
      };
    });
}

// ─────────────── Reescritura con historial (T13) ───────────────

/** Turnos previos que se mandan para reescribir (3 preguntas con sus respuestas). */
export const REWRITE_HISTORY_MESSAGES = 6;
const REWRITE_ANSWER_CHARS = 600;

const REWRITE_PROMPT = `Reescribes preguntas para buscarlas en los documentos del usuario.
Recibes una conversación y la última pregunta del usuario. Devuelve esa pregunta reescrita como una pregunta completa que se entienda sin la conversación: sustituye "eso", "y el plazo?", "¿y en el otro?" y similares por aquello a lo que se refieren.

Reglas:
- Si la pregunta ya se entiende sola, devuélvela igual.
- Si es solo un tema o unas palabras sueltas, conviértela en una pregunta sobre qué dicen los documentos de ese tema.
- Mantén el idioma de la última pregunta.
- No la respondas ni añadas información que el usuario no pidió.
- Devuelve solo la pregunta, en una línea, sin comillas ni explicaciones.`;

/** Mensajes para reescribir la pregunta; history va del más antiguo al más reciente. */
export function buildRewriteMessages(history: ChatMessage[], question: string): ChatMessage[] {
  const transcript = history
    .map((m) => {
      // Sin las marcas [n]: al reescribir no sirven y confunden.
      const text = m.content.replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, "").trim();
      const short = text.length > REWRITE_ANSWER_CHARS ? `${text.slice(0, REWRITE_ANSWER_CHARS)}…` : text;
      return `${m.role === "user" ? "Usuario" : "Asistente"}: ${short}`;
    })
    .join("\n");
  return [
    { role: "system", content: REWRITE_PROMPT },
    { role: "user", content: `Conversación:\n${transcript}\n\nÚltima pregunta: ${question}` },
  ];
}

/** Limpia la salida del LLM; si no parece una pregunta usable, se queda la original. */
export function cleanRewrite(output: string, original: string): string {
  const line = output
    .trim()
    .split("\n")[0]
    .replace(/^(pregunta( reescrita)?|question)\s*:\s*/i, "")
    .replace(/^["'«“]+|["'»”]+$/g, "")
    .trim();
  return line && line.length <= 500 ? line : original;
}
