// Comprueba el set de evaluación contra los PDFs con el mismo lector que la ingesta:
// reparto 12/4/4, que cada 'evidence' esté en su página y que las preguntas sin
// respuesta no tengan sus términos en los documentos. Uso: node eval/check-set.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const dir = dirname(fileURLToPath(import.meta.url));
const set = JSON.parse(readFileSync(join(dir, "questions.json"), "utf8"));
const norm = (s) => s.replace(/\s+/g, " ").toLowerCase();

const pages = {};
for (const [key, file] of Object.entries(set.documents)) {
  const docs = await new PDFLoader(new Blob([readFileSync(join(dir, "docs", file))])).load();
  pages[key] = Object.fromEntries(docs.map((d) => [d.metadata.loc.pageNumber, norm(d.pageContent)]));
  console.log(`${file}: ${docs.length} páginas con texto`);
}

let errors = 0;
const fail = (msg) => (errors++, console.error("✗", msg));

const count = (t) => set.questions.filter((q) => q.type === t).length;
const split = `${count("single")}/${count("multi")}/${count("none")}`;
if (set.questions.length !== 20 || split !== "12/4/4") fail(`reparto ${set.questions.length} preguntas, ${split} (se espera 20, 12/4/4)`);

for (const q of set.questions) {
  const expected = { single: 1, multi: 2, none: 0 }[q.type];
  if (q.sources.length !== expected) fail(`#${q.id}: ${q.sources.length} fuentes para tipo ${q.type}`);
  for (const s of q.sources) {
    if (!pages[s.document]?.[s.page]?.includes(norm(s.evidence))) {
      const found = Object.entries(pages[s.document] ?? {}).find(([, t]) => t.includes(norm(s.evidence)));
      fail(`#${q.id}: «${s.evidence}» no está en ${s.document} p.${s.page}${found ? ` (está en p.${found[0]})` : ""}`);
    }
  }
}

// Términos que no deben aparecer para que las preguntas 'none' no tengan respuesta.
const absent = ["cápsula", "precio", "cuesta", "fumar", "tabaco", "australia", "canberra"];
for (const term of absent) {
  for (const [doc, byPage] of Object.entries(pages)) {
    for (const [p, text] of Object.entries(byPage)) if (text.includes(term)) fail(`«${term}» aparece en ${doc} p.${p}`);
  }
}

console.log(errors ? `\n${errors} problema(s)` : `\nSet OK: 20 preguntas (${split}), todas las páginas verificadas.`);
process.exit(errors ? 1 : 0);
