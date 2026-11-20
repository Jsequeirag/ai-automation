import "server-only";
import { OpenRouter } from "@openrouter/sdk";

// Cliente de OpenRouter compartido por las rutas /api. La clave y el modelo
// vienen de variables de entorno solo del servidor (ver .env.example).

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const openrouter = new OpenRouter({
  apiKey: requireEnv("OPENROUTER_API_KEY"),
});

export const LLM_MODEL = requireEnv("LLM_MODEL");

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Respuesta completa, sin streaming (p. ej. para reescribir la pregunta con el historial). */
export async function complete(messages: ChatMessage[], maxTokens = 512): Promise<string> {
  const result = await openrouter.chat.send({
    chatRequest: { model: LLM_MODEL, messages, maxTokens, stream: false },
  });
  const content = result.choices[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

/** Respuesta en streaming: entrega el texto trozo a trozo a medida que llega. */
export async function* streamChat(messages: ChatMessage[], maxTokens = 1024): AsyncGenerator<string> {
  const stream = await openrouter.chat.send({
    chatRequest: { model: LLM_MODEL, messages, maxTokens, stream: true },
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
