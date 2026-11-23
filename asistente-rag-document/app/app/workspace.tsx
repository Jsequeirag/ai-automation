"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatUIMessage, ConversationDetail, ConversationSummary } from "@/lib/chat-types";
import { Chat } from "./chat";

// T12: lista de conversaciones + chat de la seleccionada. La conversación abierta va en
// la URL (?c=id) para que al recargar se vuelva a ella con su historial.

type View = {
  /** Clave del <Chat>: cambia al abrir otra conversación o empezar una nueva (no al crearla). */
  key: string;
  id: string | null;
  /** null mientras se carga el historial. */
  messages: ChatUIMessage[] | null;
};

const newView = (): View => ({ key: crypto.randomUUID(), id: null, messages: [] });

function setUrl(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("c", id);
  else url.searchParams.delete("c");
  window.history.replaceState(null, "", url);
}

function toUIMessages(detail: ConversationDetail): ChatUIMessage[] {
  return detail.messages.map((m) => ({
    id: `db-${m.id}`,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
    metadata: m.role === "assistant" ? { citations: m.citations } : undefined,
  }));
}

export function Workspace({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [view, setView] = useState<View>({ key: "inicial", id: null, messages: [] });
  const [error, setError] = useState<string | null>(null);
  const opening = useRef<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/conversations")
      .then((res) => (res.ok ? res.json() : null))
      .then((list: ConversationSummary[] | null) => list && setConversations(list))
      .catch(() => {});
  }, []);

  /** Pide el historial y lo muestra si sigue siendo la conversación que se quiere abrir. */
  const load = useCallback((id: string) => {
    opening.current = id;
    fetch(`/api/conversations/${id}`)
      .then(async (res) => {
        if (opening.current !== id) return; // se abrió otra mientras tanto
        if (!res.ok) throw new Error(res.status === 404 ? "Esa conversación ya no existe." : "");
        const detail = (await res.json()) as ConversationDetail;
        if (opening.current === id) setView({ key: id, id, messages: toUIMessages(detail) });
      })
      .catch((err: Error) => {
        if (opening.current !== id) return;
        setUrl(null);
        setView(newView());
        setError(err.message || "No se pudo cargar la conversación.");
      });
  }, []);

  function open(id: string) {
    setError(null);
    setView({ key: id, id, messages: null });
    setUrl(id);
    load(id);
  }

  function startNew() {
    opening.current = null;
    setError(null);
    setUrl(null);
    setView(newView());
  }

  // Al crearse la conversación con la primera pregunta: misma clave, el chat sigue montado.
  const handleCreated = useCallback((id: string) => {
    setUrl(id);
    setView((v) => ({ ...v, id }));
  }, []);

  // Al entrar: la lista y, si la URL trae ?c=id, esa conversación (así sobrevive a recargar).
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("c");
    if (id) load(id);
    refresh();
  }, [refresh, load]);

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <aside className="flex flex-col gap-3 md:border-r md:border-zinc-200 md:pr-4 md:dark:border-zinc-800">
        <button
          type="button"
          onClick={startNew}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          + Nueva conversación
        </button>
        <nav aria-label="Conversaciones">
          {conversations === null ? (
            <p className="text-sm text-zinc-500">Cargando…</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-zinc-500">Aún no hay conversaciones.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => open(c.id)}
                    aria-current={view.id === c.id ? "page" : undefined}
                    className={`w-full truncate rounded px-2 py-1.5 text-left text-sm ${
                      view.id === c.id
                        ? "bg-zinc-200 font-medium dark:bg-zinc-800"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    }`}
                    title={c.title ?? undefined}
                  >
                    {c.title ?? "Sin título"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>

      <div className="min-w-0">
        {children}
        {error && (
          <p role="alert" className="mt-8 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
        {view.messages === null ? (
          <p className="mt-8 text-sm text-zinc-500">Cargando conversación…</p>
        ) : (
          <Chat
            key={view.key}
            conversationId={view.id}
            initialMessages={view.messages}
            onCreated={handleCreated}
            onAnswered={refresh}
          />
        )}
      </div>
    </div>
  );
}
