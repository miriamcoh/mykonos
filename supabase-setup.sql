-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).
-- Creates every table/bucket the app needs, turns on realtime sync, and opens
-- up access with the anon key (this is a small private trip app for 5 people
-- sharing one link - not a multi-tenant public product, so permissive
-- policies are the right tradeoff here).

-- 1) One table per feature. Schema-less on purpose (id + jsonb blob) so it
--    matches src/lib/backend/supabaseAdapter.ts without any migrations.
create table if not exists "itineraryEvents" (id text primary key, data jsonb not null);
create table if not exists "expenses"        (id text primary key, data jsonb not null);
create table if not exists "documents"       (id text primary key, data jsonb not null);
create table if not exists "locationPings"   (id text primary key, data jsonb not null);
create table if not exists "checklistItems"  (id text primary key, data jsonb not null);
create table if not exists "galleryPhotos"   (id text primary key, data jsonb not null);
create table if not exists "polls"           (id text primary key, data jsonb not null);

-- 2) Turn on Realtime so onSnapshot-style live sync works across all phones.
alter publication supabase_realtime add table
  "itineraryEvents", "expenses", "documents", "locationPings",
  "checklistItems", "galleryPhotos", "polls";

-- 3) Open access for the anon key (no per-user login in this app).
alter table "itineraryEvents" enable row level security;
alter table "expenses"        enable row level security;
alter table "documents"       enable row level security;
alter table "locationPings"   enable row level security;
alter table "checklistItems"  enable row level security;
alter table "galleryPhotos"   enable row level security;
alter table "polls"           enable row level security;

do $$
declare t text;
begin
  foreach t in array array['itineraryEvents','expenses','documents','locationPings','checklistItems','galleryPhotos','polls']
  loop
    execute format('create policy "anon full access" on %I for all to anon using (true) with check (true);', t);
  end loop;
end $$;

-- 4) Storage bucket for photos/documents, matching CloudStorage in supabaseAdapter.ts.
insert into storage.buckets (id, name, public)
values ('mykonos-files', 'mykonos-files', true)
on conflict (id) do nothing;

create policy "anon read mykonos-files" on storage.objects
  for select to anon using (bucket_id = 'mykonos-files');
create policy "anon write mykonos-files" on storage.objects
  for insert to anon with check (bucket_id = 'mykonos-files');
create policy "anon delete mykonos-files" on storage.objects
  for delete to anon using (bucket_id = 'mykonos-files');
