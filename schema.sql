-- ============================================================
-- TheDenKB — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- ============================================================
-- TABLES
-- ============================================================

-- KB Documents (parent record per uploaded file)
create table if not exists public.kb_documents (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  source       text not null,                -- original filename
  file_type    text not null default 'txt',  -- pdf | txt | md
  chunk_count  int  not null default 0,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- KB Chunks (one row per text chunk + its vector embedding)
create table if not exists public.kb_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.kb_documents(id) on delete cascade,
  chunk_index  int  not null,
  content      text not null,
  embedding    vector(384),               -- sentence-transformers/all-MiniLM-L6-v2 produces 384-dim vectors
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz default now()
);

-- WhatsApp Sessions (one per unique phone number)
create table if not exists public.wa_sessions (
  id           uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  created_at   timestamptz default now(),
  last_active  timestamptz default now()
);

-- WhatsApp Messages (full conversation history per session)
create table if not exists public.wa_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.wa_sessions(id) on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  content      text not null,
  created_at   timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Vector similarity index (IVFFlat — good for up to ~1M vectors)
-- lists = sqrt(num_rows) is a good rule of thumb; start with 100
create index if not exists kb_chunks_embedding_idx
  on public.kb_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Speed up chunk lookups by document
create index if not exists kb_chunks_document_id_idx
  on public.kb_chunks (document_id);

-- Speed up message lookups by session
create index if not exists wa_messages_session_id_idx
  on public.wa_messages (session_id, created_at desc);

-- Speed up session lookup by phone number
create index if not exists wa_sessions_phone_idx
  on public.wa_sessions (phone_number);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Vector similarity search — used by the query API route
create or replace function public.match_chunks(
  query_embedding vector(384),
  match_threshold float default 0.65,
  match_count     int   default 5
)
returns table (
  id          uuid,
  document_id uuid,
  content     text,
  source      text,
  title       text,
  similarity  float,
  metadata    jsonb
)
language sql stable
as $$
  select
    c.id,
    c.document_id,
    c.content,
    d.source,
    d.title,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.metadata
  from public.kb_chunks c
  join public.kb_documents d on d.id = c.document_id
  where 1 - (c.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- Auto-update updated_at on kb_documents
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at trigger on kb_documents
drop trigger if exists kb_documents_updated_at on public.kb_documents;
create trigger kb_documents_updated_at
  before update on public.kb_documents
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.kb_documents enable row level security;
alter table public.kb_chunks    enable row level security;
alter table public.wa_sessions  enable row level security;
alter table public.wa_messages  enable row level security;

-- kb_documents: authenticated users can read all; only creator can delete
create policy "Authenticated users can view documents"
  on public.kb_documents for select
  to authenticated
  using (true);

create policy "Authenticated users can insert documents"
  on public.kb_documents for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Creator can delete documents"
  on public.kb_documents for delete
  to authenticated
  using (auth.uid() = created_by);

-- kb_chunks: authenticated users can read; service role manages writes
create policy "Authenticated users can view chunks"
  on public.kb_chunks for select
  to authenticated
  using (true);

-- wa_sessions: service role only (accessed via admin client in API routes)
create policy "Service role manages sessions"
  on public.wa_sessions for all
  to service_role
  using (true)
  with check (true);

-- wa_messages: service role only
create policy "Service role manages messages"
  on public.wa_messages for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- GRANT match_chunks to authenticated + service_role
-- ============================================================
grant execute on function public.match_chunks to authenticated, service_role;

-- ============================================================
-- DONE
-- Run this once. Re-running is safe (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================
