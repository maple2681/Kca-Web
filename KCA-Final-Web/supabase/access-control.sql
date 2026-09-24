-- =====================================================================
-- KCA website admin: roles + Allowed Emails
-- Run this in Supabase → SQL Editor AFTER setup.sql. Safe to run again.
--
--   Admin  = yt13501@kca.org.ua only (edits the site + manages the list)
--   Editor = @kca.org.ua emails the Admin adds to "Allowed Emails"
--   Everyone else cannot register, cannot log in, cannot change anything.
-- =====================================================================

-- 1) The Allowed Emails list
create table if not exists public.allowed_emails (
  email    text primary key,
  role     text not null default 'editor',
  added_by text default (auth.jwt() ->> 'email'),
  added_at timestamptz not null default now(),
  constraint allowed_email_format check (email = lower(email) and email ~ '^[^@\s]+@kca\.org\.ua$'),
  constraint allowed_role check (role in ('admin', 'editor')),
  constraint only_one_admin check (role <> 'admin' or email = 'yt13501@kca.org.ua')
);

insert into public.allowed_emails (email, role, added_by)
values ('yt13501@kca.org.ua', 'admin', 'setup')
on conflict (email) do update set role = 'admin';

-- 2) Role helpers (email must also be confirmed = the mailbox exists)
create or replace function public.kca_my_role()
returns text language sql stable security definer set search_path = public as $$
  select a.role from auth.users u
  join public.allowed_emails a on a.email = lower(u.email)
  where u.id = auth.uid() and u.email_confirmed_at is not null;
$$;

create or replace function public.kca_is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select public.kca_my_role() is not null;
$$;

create or replace function public.kca_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.kca_my_role() = 'admin', false);
$$;

grant execute on function public.kca_my_role() to authenticated;

-- 3) Only listed emails can create an account (or change their email to one)
create or replace function public.kca_enforce_domain()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or lower(new.email) !~ '@kca\.org\.ua$' then
    raise exception 'Only @kca.org.ua email addresses can register';
  end if;
  if not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'This email is not on the Allowed Emails list';
  end if;
  return new;
end $$;

drop trigger if exists kca_enforce_domain_insert on auth.users;
create trigger kca_enforce_domain_insert before insert on auth.users
  for each row execute function public.kca_enforce_domain();
drop trigger if exists kca_enforce_domain_update on auth.users;
create trigger kca_enforce_domain_update before update of email on auth.users
  for each row execute function public.kca_enforce_domain();

-- 4) Only the Admin can see / change the list. The Admin row can't be removed.
alter table public.allowed_emails enable row level security;

drop policy if exists "Admin reads allowed emails" on public.allowed_emails;
create policy "Admin reads allowed emails" on public.allowed_emails
  for select to authenticated using (public.kca_is_admin());

drop policy if exists "Admin adds allowed emails" on public.allowed_emails;
create policy "Admin adds allowed emails" on public.allowed_emails
  for insert to authenticated with check (public.kca_is_admin() and role = 'editor');

drop policy if exists "Admin removes allowed emails" on public.allowed_emails;
create policy "Admin removes allowed emails" on public.allowed_emails
  for delete to authenticated using (public.kca_is_admin() and role <> 'admin');

-- 5) Block LOGINS for anyone not on the list (Custom Access Token hook).
--    After running this file, turn it on in:
--    Authentication → Hooks → "Customize Access Token (JWT) Claims" → Postgres → public.kca_access_token_hook
create or replace function public.kca_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  r text;
  claims jsonb := event -> 'claims';
begin
  select role into r from public.allowed_emails where email = lower(claims ->> 'email');
  if r is null then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'This email is not on the Allowed Emails list.'));
  end if;
  claims := jsonb_set(claims, '{kca_role}', to_jsonb(r));
  return jsonb_set(event, '{claims}', claims);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.kca_access_token_hook to supabase_auth_admin;
revoke execute on function public.kca_access_token_hook from authenticated, anon, public;
grant select on public.allowed_emails to supabase_auth_admin;
drop policy if exists "Auth server reads allowed emails" on public.allowed_emails;
create policy "Auth server reads allowed emails" on public.allowed_emails
  for select to supabase_auth_admin using (true);
