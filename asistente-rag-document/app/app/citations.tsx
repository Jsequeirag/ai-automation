"use client";

import { Fragment, useEffect, useState } from "react";
import type { Citation } from "@/lib/chat-types";

// T11: [n] clicable → fragmento exacto + enlace al PDF en su página (H3).
// Si el documento ya no existe, "Fuente borrada" sin fragmento ni enlace.

/** Mismo formato que acepta extractCitations en el servidor: [2], [1][3] y [1, 3]. */
const CITATION_GROUP = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

/** Texto de la respuesta con cada [n] citado convertido en botón. */
export function AnswerText({
  text,
  citations,
  openN,
  onToggle,
}: {
  text: string;
  citations: Citation[];
  openN: number | null;
  onToggle: (n: number) => void;
}) {
  const known = new Set(citations.map((c) => c.n));
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(CITATION_GROUP)) {
    const nums = match[1].split(",").map((s) => Number(s.trim()));
    // Mientras llega el stream aún no hay citas: se deja el texto tal cual.
    if (!nums.every((n) => known.has(n))) continue;
    parts.push(text.slice(last, match.index));
    parts.push(
      <Fragment key={match.index}>
        {nums.map((n) => (
          <CitationButton key={n} n={n} open={openN === n} onClick={() => onToggle(n)} />
        ))}
      </Fragment>,
    );
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return <p className="whitespace-pre-wrap leading-7">{parts}</p>;
}

function CitationButton({ n, open, onClick }: { n: number; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={`Ver fuente ${n}`}
      className={`mx-0.5 rounded px-1 align-baseline text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 ${
        open
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      [{n}]
    </button>
  );
}

/** Lista de fuentes bajo la respuesta; cada una abre el mismo panel que su [n]. */
export function SourceList({
  citations,
  openN,
  onToggle,
}: {
  citations: Citation[];
  openN: number | null;
  onToggle: (n: number) => void;
}) {
  return (
    <ol className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
      {citations.map((c) => (
        <li key={c.n}>
          <button
            type="button"
            onClick={() => onToggle(c.n)}
            aria-expanded={openN === c.n}
            className="text-left hover:underline focus-visible:outline-2"
          >
            [{c.n}] {c.deleted ? "Fuente borrada" : `${c.document}, pág. ${c.page}`}
          </button>
        </li>
      ))}
    </ol>
  );
}

type UrlState = { kind: "loading" } | { kind: "ok"; url: string } | { kind: "deleted" } | { kind: "error" };

/**
 * Panel de una cita. Pide la URL firmada al abrirse (se monta de nuevo en cada apertura,
 * así la URL de 10 min siempre está fresca); un 404 significa que el documento se borró.
 */
export function CitationPanel({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  const [state, setState] = useState<UrlState>(citation.deleted ? { kind: "deleted" } : { kind: "loading" });

  useEffect(() => {
    if (citation.deleted) return; // ya se sabe al cargar el historial: no hay a qué enlazar
    let cancelled = false;
    fetch(`/api/documents/${citation.document_id}/url?page=${citation.page}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) return setState({ kind: "deleted" });
        if (!res.ok) return setState({ kind: "error" });
        const { url } = (await res.json()) as { url: string };
        if (!cancelled) setState({ kind: "ok", url });
      })
      .catch(() => !cancelled && setState({ kind: "error" }));
    return () => {
      cancelled = true;
    };
  }, [citation.deleted, citation.document_id, citation.page]);

  return (
    <aside
      aria-label={`Fuente ${citation.n}`}
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">
          [{citation.n}]{" "}
          {state.kind === "deleted" ? "Fuente borrada" : `${citation.document}, pág. ${citation.page}`}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar fuente"
          className="rounded px-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ✕
        </button>
      </div>

      {state.kind === "loading" && <p className="text-zinc-500">Cargando fuente…</p>}
      {state.kind === "deleted" && (
        <p className="text-zinc-500">El documento de esta cita ya no existe.</p>
      )}
      {(state.kind === "ok" || state.kind === "error") && (
        <>
          <blockquote className="max-h-64 overflow-y-auto whitespace-pre-wrap border-l-2 border-zinc-300 pl-3 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300">
            {citation.snippet}
          </blockquote>
          {state.kind === "ok" ? (
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start font-medium underline underline-offset-2"
            >
              Abrir PDF en la página {citation.page} ↗
            </a>
          ) : (
            <p className="text-red-700 dark:text-red-400">No se pudo obtener el enlace al PDF.</p>
          )}
        </>
      )}
    </aside>
  );
}
