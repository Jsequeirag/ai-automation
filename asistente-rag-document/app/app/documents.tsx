"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Doc = {
  id: string;
  name: string;
  pages: number | null;
  status: "processing" | "ready" | "no_text" | "error";
  error: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<Doc["status"], string> = {
  processing: "Procesando",
  ready: "Listo",
  no_text: "Sin texto",
  error: "Error",
};

const STATUS_STYLE: Record<Doc["status"], string> = {
  processing: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  ready: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  no_text: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  error: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

async function errorMessage(res: Response, fallback: string) {
  try {
    return ((await res.json()) as { error?: string }).error ?? fallback;
  } catch {
    return fallback;
  }
}

/** 0:07, 1:23… (minutos:segundos). */
function formatElapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

async function fetchDocs(): Promise<{ docs?: Doc[]; error?: string }> {
  try {
    const res = await fetch("/api/documents", { cache: "no-store" });
    if (res.ok) return { docs: await res.json() };
    return { error: await errorMessage(res, "No se pudieron cargar tus documentos.") };
  } catch {
    return { error: "No se pudieron cargar tus documentos. Revisa tu conexión." };
  }
}

export function Documents() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Cronómetro: hora actual (avanza cada segundo mientras haya algo procesando) y
  // duración final de los documentos que terminaron mientras la página estaba abierta.
  const [now, setNow] = useState(() => Date.now());
  const [durations, setDurations] = useState<Record<string, number>>({});
  const prevDocs = useRef<Doc[]>([]);

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchDocs>>) => {
    if (result.docs) {
      const finished: Record<string, number> = {};
      for (const doc of result.docs) {
        const before = prevDocs.current.find((d) => d.id === doc.id);
        if (before?.status === "processing" && doc.status !== "processing") {
          finished[doc.id] = Date.now() - Date.parse(doc.created_at);
        }
      }
      prevDocs.current = result.docs;
      setDocs(result.docs);
      if (Object.keys(finished).length) setDurations((d) => ({ ...d, ...finished }));
    } else if (result.error) setMessage(result.error);
  }, []);
  const load = useCallback(() => fetchDocs().then(apply), [apply]);

  useEffect(() => {
    fetchDocs().then(apply);
  }, [apply]);

  // Sondeo cada 2 s mientras haya alguno en "processing".
  const processing = docs?.some((d) => d.status === "processing") ?? false;
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => void load(), 2000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      clearInterval(clock);
    };
  }, [processing, load]);

  async function upload(file: File) {
    setMessage(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body });
      if (!res.ok) setMessage(await errorMessage(res, "No se pudo subir el archivo."));
      await load();
    } catch {
      setMessage("No se pudo subir el archivo. Revisa tu conexión.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(doc: Doc) {
    if (!confirm(`¿Borrar «${doc.name}»? Se eliminan el archivo y todo su contenido.`)) return;
    setMessage(null);
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (!res.ok) setMessage(await errorMessage(res, "No se pudo borrar el documento."));
    await load();
  }

  return (
    <section aria-labelledby="docs-title" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="docs-title" className="text-lg font-semibold">
          Tus documentos {docs && <span className="text-sm font-normal text-zinc-500">({docs.length}/20)</span>}
        </h2>
        <label className="cursor-pointer rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 dark:bg-zinc-100 dark:text-zinc-900">
          {uploading ? "Subiendo…" : "Subir PDF"}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
      </div>

      {message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {message}
        </p>
      )}

      {docs === null ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-zinc-500">Aún no has subido ningún PDF (hasta 10 MB y 50 páginas).</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-medium">{doc.name}</p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className={`rounded px-1.5 py-0.5 font-medium ${STATUS_STYLE[doc.status]}`}>
                    {STATUS_LABEL[doc.status]}
                  </span>
                  {doc.status === "processing" && (
                    <span className="tabular-nums" aria-live="off">
                      ⏱ {formatElapsed(now - Date.parse(doc.created_at))}
                    </span>
                  )}
                  {doc.status !== "processing" && durations[doc.id] !== undefined && (
                    <span className="tabular-nums">en {formatElapsed(durations[doc.id])}</span>
                  )}
                  {doc.pages !== null && <span>{doc.pages} págs.</span>}
                </p>
                {doc.error && <p className="text-xs text-zinc-600 dark:text-zinc-400">{doc.error}</p>}
              </div>
              <button
                type="button"
                onClick={() => void remove(doc)}
                className="shrink-0 text-sm text-red-700 underline dark:text-red-400"
                aria-label={`Borrar ${doc.name}`}
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
