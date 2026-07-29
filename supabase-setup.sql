-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).
-- Creates every table/bucket the app needs, turns on realtime sync, and opens
-- up access with the anon key (this is a small private trip app for 5 people
-- sharing one link - not a multi-tenant public product, so permissive
-- policies are the right tradeoff here).
--
-- SAFE TO RE-RUN. Every statement below is idempotent, so if you're not sure
-- whether this ran successfully before (or it partially failed last time),
-- just run the whole thing again - it will not error on things that already
-- exist, and it will re-create any policy that's missing or wrong.

-- 1) One table per feature. Schema-less on purpose (id + jsonb blob) so it
--    matches src/lib/backend/supabaseAdapter.ts without any migrations.
create table if not exists "itineraryEvents" (id text primary key, data jsonb not null);
create table if not exists "expenses"        (id text primary key, data jsonb not null);
create table if not exists "documents"       (id text primary key, data jsonb not null);
create table if not exists "locationPings"   (id text primary key, data jsonb not null);
create table if not exists "checklistItems"  (id text primary key, data jsonb not null);
create table if not exists "galleryPhotos"   (id text primary key, data jsonb not null);
create table if not exists "polls"           (id text primary key, data jsonb not null);

-- 2) Turn on Realtime so live sync works across all phones (Bug: "User B
--    doesn't see User A's location" is usually this step missing or having
--    silently failed on a previous run).
do $$
declare t text;
begin
  foreach t in array array['itineraryEvents','expenses','documents','locationPings','checklistItems','galleryPhotos','polls']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I;', t);
    exception when others then
      raise notice 'Realtime for "%" already enabled or publication missing (safe to ignore): %', t, sqlerrm;
    end;
  end loop;
end $$;

-- 3) RLS + a fully-permissive policy for the anon key on every table
--    (drop-then-create so this is safe to re-run and always ends up correct,
--    even if a previous run half-failed).
do $$
declare t text;
begin
  foreach t in array array['itineraryEvents','expenses','documents','locationPings','checklistItems','galleryPhotos','polls']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "anon full access" on %I;', t);
    execute format('create policy "anon full access" on %I for all to anon using (true) with check (true);', t);
  end loop;
end $$;

-- 4) Storage bucket for photos/documents, matching CloudStorage in
--    supabaseAdapter.ts. If uploads are failing/hanging, the bucket not
--    existing (or these policies being missing) is the #1 suspect.
insert into storage.buckets (id, name, public)
values ('mykonos-files', 'mykonos-files', true)
on conflict (id) do update set public = true;

drop policy if exists "anon read mykonos-files" on storage.objects;
create policy "anon read mykonos-files" on storage.objects
  for select to anon using (bucket_id = 'mykonos-files');

drop policy if exists "anon write mykonos-files" on storage.objects;
create policy "anon write mykonos-files" on storage.objects
  for insert to anon with check (bucket_id = 'mykonos-files');

drop policy if exists "anon update mykonos-files" on storage.objects;
create policy "anon update mykonos-files" on storage.objects
  for update to anon using (bucket_id = 'mykonos-files');

drop policy if exists "anon delete mykonos-files" on storage.objects;
create policy "anon delete mykonos-files" on storage.objects
  for delete to anon using (bucket_id = 'mykonos-files');

-- 5) Quick sanity check - run this block by itself any time to see if
--    everything above actually took effect.
select
  (select count(*) from pg_tables where schemaname = 'public'
     and tablename in ('itineraryEvents','expenses','documents','locationPings','checklistItems','galleryPhotos','polls')) as tables_found_of_7,
  (select count(*) from pg_publication_tables where pubname = 'supabase_realtime'
     and schemaname = 'public'
     and tablename in ('itineraryEvents','expenses','documents','locationPings','checklistItems','galleryPhotos','polls')) as realtime_enabled_of_7,
  (select count(*) from storage.buckets where id = 'mykonos-files') as bucket_exists_0_or_1,
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and policyname like 'anon % mykonos-files') as storage_policies_of_4;
