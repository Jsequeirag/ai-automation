-- Asistente RAG · políticas del bucket privado "documents" (T02/T04)
-- Rutas: {user_id}/{document_id}.pdf. Cada usuario solo sube, lee y borra en su carpeta.
-- Idempotente: se puede ejecutar varias veces en Supabase > SQL Editor.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

drop policy if exists "rag documents: subir propios" on storage.objects;
drop policy if exists "rag documents: leer propios" on storage.objects;
drop policy if exists "rag documents: borrar propios" on storage.objects;

create policy "rag documents: subir propios" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "rag documents: leer propios" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "rag documents: borrar propios" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
