# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

A RAG assistant over the user's own PDFs: upload PDFs, chat with them, and every answer cites document and page. The code is still the untouched `create-next-app` scaffold. The design lives in `specs/` (written in Spanish), and that is the source of truth:

- `specs/constitution.md`: five principles that override any task when they conflict (summarized below).
- `specs/spec.md`: scope, user stories H1–H6 with acceptance criteria, non-functional limits.
- `specs/plan.md`: stack, ingestion/query pipelines, SQL data model, API contract, open questions.
- `specs/tasks.md`: tasks T01–T18 in phases. Finish each phase before starting the next, and close each task with its stated check. Mark tasks `[x]` as they are completed.

The diagrams in `specs/img/` still show "Next.js 15", Anthropic directly, and "Voyage u OpenAI"; the text specs and the installed version (16.4) are authoritative.

## Non-negotiable rules (from the constitution)

1. Every answer cites its sources (document + page). No citation, no answer.
2. Never invent: if retrieval finds nothing above the similarity threshold, reply "No lo encuentro en tus documentos" **without calling the LLM** and with no citations.
3. Simplest thing that works: one Next.js app, one database (Supabase Postgres + pgvector). No queues, microservices, agents/tools, or extra frameworks in v1. Ingestion runs inside the upload request.
4. Every data access filters by `user_id` (and RLS on all tables enforces it too).
5. Quality is measured with the fixed eval set (`eval/questions.json` from T08, `npm run eval` from T15), not by eye.

## Planned architecture

- The browser only talks to Next.js. Only `/api` route handlers touch Supabase, Claude, and the embeddings service. API keys stay server-side. The one exception: opening a PDF goes straight to Supabase Storage through a signed URL (10 min) with `#page=n`.
- **Ingestion** (`POST /api/documents`): validate (PDF, ≤ 10 MB, < 20 docs), store the file in the private bucket at `{user_id}/{document_id}.pdf`, insert a `rag_documents` row as `processing`, and respond `201`. The rest runs in `after()`: LangChain `PDFLoader` (keeps page numbers; more than 50 pages means `error`), then `RecursiveCharacterTextSplitter` (~1000 chars, 150 overlap), then batched embeddings into `rag_chunks`, ending as `ready`, `no_text`, or `error` (reason in `rag_documents.error`). The UI polls `GET /api/documents` every 2 s while any document is `processing`.
- **Query** (`POST /api/chat`): rewrite the question with the LLM only when there is history, then call the SQL function `rag_match_chunks` (top 6, filtered by `auth.uid()` and the conversation's `document_ids`, where empty means all; returns similarity). Below the threshold (a tunable constant), reply with the fixed Spanish "No lo encuentro" without the LLM. Otherwise send the chunks numbered [1]…[6] to Claude: cite every claim, use nothing else, answer in the question's language, and say it can't find it if the chunks don't answer. Stream through the Vercel AI SDK (`useChat` + `@ai-sdk/langchain`), with the citations actually used in the text in the message metadata at the end.
- Stack: LangChain.js (`@langchain/core`, `community`, `textsplitters`, `openai`), Supabase Auth with magic link.
- **The LLM goes through OpenRouter** with the official `@openrouter/sdk`, always via [lib/llm.ts](lib/llm.ts) (`complete()` for one-shot calls such as question rewriting, `streamChat()` for answers). It's server-only (`import "server-only"`), with `OPENROUTER_API_KEY` and `LLM_MODEL` (currently `deepseek/deepseek-v4-flash`) from env. Don't hardcode slugs or create other clients. LangChain is only used for PDF loading and splitting.
- **Embeddings are local and free**: Transformers.js with `Xenova/multilingual-e5-small` (384 dims, needs the `query: ` / `passage: ` prefixes). Changing the model means changing `vector(384)` in the table and in `rag_match_chunks`, and re-ingesting.
- **Schema source of truth**: `supabase/migrations/0001_init.sql` (tables, RLS, `rag_match_chunks`). Change the schema with new migration files, not by editing `plan.md`. API routes run on Node (the default; **don't** export `runtime`, since `cacheComponents` rejects it) and use the **user-session** Supabase client from [lib/supabase/server.ts](lib/supabase/server.ts) (`getUser()`, never the service key) so RLS applies.
- `proxy.ts` (Next 16's renamed middleware) refreshes the session and redirects `/app` ↔ `/login`. It excludes `/api` on purpose: proxy buffers bodies up to 10 MB and would truncate uploads. API routes check the session themselves.
- Embeddings run with `intraOpNumThreads ≤ 4` and batches of 8 ([lib/embeddings.ts](lib/embeddings.ts)). With the default threads or batches of 32, ONNX saturated the CPU and ran 4–10× slower.
- Data model: `rag_documents`, `rag_chunks` (HNSW cosine index), `rag_conversations`, `rag_messages` (all with `user_id`; `citations jsonb` stores only `{n, document_id, page, chunk_id}`). Deleting a document cascades to the file and its chunks. Old citations to deleted chunks render as "Fuente borrada". Daily limits are counted from `rag_documents` and `rag_messages`, with no extra table.
- API errors are always `{error: "mensaje en español"}`. Return `429` when a daily limit is exceeded (10 MB per PDF, 20 PDFs, 30 questions/day per user).
- UI text is in Spanish. The assistant answers in the language of the question.

## Commands

- `npm run dev`: dev server at http://localhost:3000 (Turbopack)
- `npm run build`: production build (also type-checks)
- `npm run lint`: ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

No test framework yet. `npm run eval` is planned (T14).

## Stack and configuration notes

- **Next.js 16.4 (App Router) + React 19.3**. Version-specific docs are in `node_modules/next/dist/docs/`. Read them before relying on remembered Next.js APIs.
- `next.config.ts` turns on `cacheComponents: true` (Cache Components / `"use cache"` model; dynamic data access must follow its rules), `partialPrefetching`, and `experimental.agentFeedback`.
- **Tailwind CSS v4**, configured in CSS (`app/globals.css`: `@import "tailwindcss"`, `@theme inline`) and compiled by Turbopack through `@tailwindcss/turbopack`. There is no `tailwind.config.js` and no PostCSS config.
- Route prop types like `LayoutProps<"/">` are generated into `.next/types`. Run `next dev` or `next build` after adding routes.
- The TS path alias `@/*` maps to the repo root.
- `AGENTS.md` is rewritten by `next dev`. Commit its changes and don't strip them.
