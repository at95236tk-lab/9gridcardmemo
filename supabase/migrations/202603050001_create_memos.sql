-- 9gridcardmemo: memo storage table
-- Paste and run this in Supabase SQL Editor.

create table if not exists public.memos (
  id text primary key,
  owner_key text not null,
  name text not null,
  snapshot jsonb not null,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists memos_owner_key_updated_at_idx
  on public.memos (owner_key, updated_at desc);

-- This app currently uses anon key from browser without Supabase Auth.
-- Keep RLS off and grant table access to anon/authenticated roles.
alter table public.memos disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.memos to anon, authenticated;
