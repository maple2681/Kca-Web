-- =====================================================================
-- KCA website admin: database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
-- =====================================================================

-- 1) Only @kca.org.ua addresses can ever create (or switch to) an account
create or replace function public.kca_enforce_domain()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or lower(new.email) !~ '@kca\.org\.ua$' then
    raise exception 'Only @kca.org.ua email addresses can register';
  end if;
  return new;
end $$;

drop trigger if exists kca_enforce_domain_insert on auth.users;
create trigger kca_enforce_domain_insert before insert on auth.users
  for each row execute function public.kca_enforce_domain();

drop trigger if exists kca_enforce_domain_update on auth.users;
create trigger kca_enforce_domain_update before update of email on auth.users
  for each row execute function public.kca_enforce_domain();

-- 2) Who counts as an editor: signed in, @kca.org.ua, and email confirmed
--    (confirming = they clicked the link we emailed, so the mailbox exists)
create or replace function public.kca_is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and lower(u.email) like '%@kca.org.ua'
      and u.email_confirmed_at is not null
  );
$$;

-- 3) Where the website edits are stored
create table if not exists public.site_content (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by text default (auth.jwt() ->> 'email')
);

create or replace function public.kca_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); new.updated_by = auth.jwt() ->> 'email'; return new; end $$;
drop trigger if exists kca_touch on public.site_content;
create trigger kca_touch before insert or update on public.site_content
  for each row execute function public.kca_touch();

alter table public.site_content enable row level security;

drop policy if exists "Anyone can read site content" on public.site_content;
create policy "Anyone can read site content" on public.site_content
  for select to anon, authenticated using (true);

drop policy if exists "Editors can add content" on public.site_content;
create policy "Editors can add content" on public.site_content
  for insert to authenticated with check (public.kca_is_editor());

drop policy if exists "Editors can change content" on public.site_content;
create policy "Editors can change content" on public.site_content
  for update to authenticated using (public.kca_is_editor()) with check (public.kca_is_editor());

drop policy if exists "Editors can remove content" on public.site_content;
create policy "Editors can remove content" on public.site_content
  for delete to authenticated using (public.kca_is_editor());

-- 4) Uploaded photos (public to view, only editors can upload)
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Editors can upload site media" on storage.objects;
create policy "Editors can upload site media" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-media' and public.kca_is_editor());

drop policy if exists "Editors can update site media" on storage.objects;
create policy "Editors can update site media" on storage.objects
  for update to authenticated using (bucket_id = 'site-media' and public.kca_is_editor());

drop policy if exists "Editors can delete site media" on storage.objects;
create policy "Editors can delete site media" on storage.objects
  for delete to authenticated using (bucket_id = 'site-media' and public.kca_is_editor());
