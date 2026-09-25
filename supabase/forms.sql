-- =====================================================================
-- KCA website: store every form submission (contact, admissions, tour,
-- teaching, reviews, newsletter). Run once in Supabase → SQL Editor.
-- =====================================================================
create table if not exists public.form_submissions (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  form       text not null,
  page       text,
  email      text,
  data       jsonb not null,
  constraint form_len check (char_length(form) < 200 and char_length(coalesce(email,'')) < 320 and pg_column_size(data) < 20000)
);
alter table public.form_submissions enable row level security;

-- anyone visiting the website may send a form
drop policy if exists "Visitors can submit forms" on public.form_submissions;
create policy "Visitors can submit forms" on public.form_submissions
  for insert to anon, authenticated with check (true);

-- only the Admin and Editors can read / delete them
drop policy if exists "Editors read submissions" on public.form_submissions;
create policy "Editors read submissions" on public.form_submissions
  for select to authenticated using (public.kca_is_editor());
drop policy if exists "Admin deletes submissions" on public.form_submissions;
create policy "Admin deletes submissions" on public.form_submissions
  for delete to authenticated using (public.kca_is_admin());

grant insert on public.form_submissions to anon, authenticated;
grant select, delete on public.form_submissions to authenticated;
