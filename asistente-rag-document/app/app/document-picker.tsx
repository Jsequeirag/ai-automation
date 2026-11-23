"use client";

import { useEffect, useState } from "react";

// T14 (H5): en qué documentos busca la conversación. Ninguno marcado = todos.

type ReadyDoc = { id: string; name: string };

async function fetchReadyDocs(): Promise<ReadyDoc[]> {
  const res = await fetch("/api/documents", { cache: "no-store" });
  if (!res.ok) throw new Error();
  const docs = (await res.json()) as { id: string; name: string; status: string }[];
  return docs.filter((d) => d.status === "ready").map(({ id, name }) => ({ id, name }));
}

export function DocumentPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [docs, setDocs] = useState<ReadyDoc[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = () =>
    fetchReadyDocs()
      .then((list) => {
        setDocs(list);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));

  useEffect(() => {
    load();
  }, []);

  // Solo cuentan los que siguen existiendo y están listos (un documento pudo borrarse).
  const active = docs ? selected.filter((id) => docs.some((d) => d.id === id)) : selected;
  const summary =
    active.length === 0
      ? "todos tus documentos"
      : active.length === 1
        ? (docs?.find((d) => d.id === active[0])?.name ?? "1 documento")
        : `${active.length} documentos`;

  function toggle(id: string) {
    onChange(active.includes(id) ? active.filter((x) => x !== id) : [...active, id]);
  }

  return (
    <details
      className="rounded-lg border border-zinc-200 text-sm dark:border-zinc-700"
      onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && load()}
    >
      <summary className="cursor-pointer select-none px-3 py-2">
        Buscar en: <span className="font-medium">{summary}</span>
      </summary>
      <div className="flex flex-col gap-2 border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
        {loadError && <p className="text-red-700 dark:text-red-400">No se pudieron cargar tus documentos.</p>}
        {docs === null && !loadError && <p className="text-zinc-500">Cargando…</p>}
        {docs?.length === 0 && <p className="text-zinc-500">Aún no tienes documentos listos.</p>}
        {docs && docs.length > 0 && (
          <fieldset disabled={disabled} className="flex flex-col gap-1.5">
            <legend className="sr-only">Documentos en los que buscar</legend>
            {docs.map((d) => (
              <label key={d.id} className="flex items-center gap-2">
                <input type="checkbox" checked={active.includes(d.id)} onChange={() => toggle(d.id)} />
                <span className="truncate">{d.name}</span>
              </label>
            ))}
            <p className="text-xs text-zinc-500">Si no marcas ninguno, se busca en todos.</p>
          </fieldset>
        )}
      </div>
    </details>
  );
}
