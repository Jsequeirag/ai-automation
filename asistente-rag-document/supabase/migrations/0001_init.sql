-- Asistente RAG · esquema inicial (T02)
-- Todas las tablas llevan el prefijo rag_ para no chocar con otras tablas del mismo proyecto Supabase.
-- Pegar completo en Supabase > SQL Editor y ejecutar una sola vez.
-- El bucket "documents" y sus políticas de Storage ya están creados aparte.

create extension if not exists vector with schema extensions;

-- ─────────────────────────── Tablas ───────────────────────────

create table public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  storage_path text not null,  -- {user_id}/{document_id}.pdf
  pages int,
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'no_text', 'error')),
  error text,  -- motivo en español cuando status = 'error' o 'no_text'
  created_at timestamptz not null default now()
);
create index on public.rag_documents (user_id, created_at desc);

create table public.rag_chunks (
  id bigserial primary key,
  document_id uuid not null references public.rag_documents on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  page int not null,
  content text not null,
  -- 384 = multilingual-e5-small (embeddings locales, gratis).
  -- Si cambias de modelo con la tabla vacía: alter column embedding type extensions.vector(N)
  -- y ajusta también rag_match_chunks.
  embedding extensions.vector(384) not null
);
create index on public.rag_chunks (document_id);
create index on public.rag_chunks using hnsw (embedding extensions.vector_cosine_ops);

create table public.rag_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text,  -- primeras palabras de la primera pregunta
  document_ids uuid[] not null default '{}',  -- vacío = todos
  created_at timestamptz not null default now()
);
create index on public.rag_conversations (user_id, created_at desc);

create table public.rag_messages (
  id bigserial primary key,
  conversation_id uuid not null references public.rag_conversations on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,  -- [{n, document_id, page, chunk_id}]
  created_at timestamptz not null default now()
);
create index on public.rag_messages (conversation_id, id);
create index on public.rag_messages (user_id, created_at) where role = 'user';  -- límite diario

-- ─────────────────────────── RLS ───────────────────────────
-- Cada usuario solo ve y toca sus filas (principio 4 de la constitución).

alter table public.rag_documents     enable row level security;
alter table public.rag_chunks        enable row level security;
alter table public.rag_conversations enable row level security;
alter table public.rag_messages      enable row level security;

create policy "rag_documents: propios" on public.rag_documents
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "rag_chunks: propios" on public.rag_chunks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.rag_documents d
                where d.id = document_id and d.user_id = (select auth.uid()))
  );

create policy "rag_conversations: propias" on public.rag_conversations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "rag_messages: propios" on public.rag_messages
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.rag_conversations c
                where c.id = conversation_id and c.user_id = (select auth.uid()))
  );

-- ─────────────────────────── Búsqueda ───────────────────────────
-- Top N fragmentos del usuario actual, opcionalmente limitados a ciertos documentos.
-- Devuelve la similitud (0..1) para aplicar el umbral en el código.
-- iterative_scan (pgvector >= 0.8) evita que el filtro deje menos resultados de los pedidos.

create or replace function public.rag_match_chunks(
  query_embedding extensions.vector(384),
  doc_ids uuid[] default '{}',
  match_count int default 6
)
returns table (id bigint, document_id uuid, page int, content text, similarity float)
language sql stable
set search_path = public, extensions
set hnsw.iterative_scan = relaxed_order
as $$
  select c.id, c.document_id, c.page, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.rag_chunks c
  where c.user_id = auth.uid()
    and (cardinality(doc_ids) = 0 or c.document_id = any(doc_ids))
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
