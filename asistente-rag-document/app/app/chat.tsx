"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { ChatUIMessage } from "@/lib/chat-types";
import { AnswerText, CitationPanel, SourceList } from "./citations";

// Chat con respuesta en streaming y citas clicables (T10–T11). El historial guardado llega en T12.

const transport = new DefaultChatTransport<ChatUIMessage>({
  api: "/api/chat",
  // El servidor solo necesita la última pregunta (contrato de plan.md).
  prepareSendMessagesRequest: ({ messages }) => {
    const last = messages[messages.length - 1];
    const message = last?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
    return { body: { conversation_id: null, message } };
  },
});

const seconds = (ms: number) => `${(ms / 1000).toLocaleString("es", { maximumFractionDigits: 1 })} s`;

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat<ChatUIMessage>({ transport });
  const busy = status === "submitted" || status === "streaming";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <section className="mt-8 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Pregunta a tus documentos</h2>

      <ul className="flex flex-col gap-4">
        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          if (m.role === "user") {
            return (
              <li key={m.id} className="self-end rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                {text}
              </li>
            );
          }
          return <AssistantMessage key={m.id} message={m} text={text} />;
        })}
        {status === "submitted" && <li className="text-sm text-zinc-500">Buscando en tus documentos…</li>}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {readableError(error)}
        </p>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej.: ¿Cuánto dura la garantía?"
          maxLength={2000}
          className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Preguntar
        </button>
      </form>
    </section>
  );
}

function AssistantMessage({ message, text }: { message: ChatUIMessage; text: string }) {
  const [openN, setOpenN] = useState<number | null>(null);
  const citations = message.metadata?.citations ?? [];
  const timings = message.metadata?.timings;
  const open = citations.find((c) => c.n === openN);
  const toggle = (n: number) => setOpenN((cur) => (cur === n ? null : n));

  return (
    <li className="flex flex-col gap-2">
      <AnswerText text={text} citations={citations} openN={openN} onToggle={toggle} />
      {open && <CitationPanel key={open.n} citation={open} onClose={() => setOpenN(null)} />}
      {citations.length > 0 && <SourceList citations={citations} openN={openN} onToggle={toggle} />}
      {timings && (
        <p className="text-xs text-zinc-500">
          Primer token {seconds(timings.firstTokenMs)} · búsqueda {seconds(timings.retrievalMs)} · total{" "}
          {seconds(timings.totalMs)}
        </p>
      )}
    </li>
  );
}

/** Los errores HTTP de la API llegan como texto JSON {error}; muestra solo el mensaje. */
function readableError(error: Error) {
  try {
    return (JSON.parse(error.message) as { error?: string }).error ?? error.message;
  } catch {
    return error.message || "Algo salió mal. Inténtalo de nuevo.";
  }
}
