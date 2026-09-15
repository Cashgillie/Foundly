-- ============================================================
-- FOUNDLY — Migration 0003: user accounts, hidden contact info,
-- lost/found workflow changes, suspicious-post reports, bookmarks,
-- and admin user management.
-- ------------------------------------------------------------
-- Run this AFTER 0001_init.sql and 0002_fix_image_clear.sql, the
-- same way (Dashboard → SQL Editor → paste → Run).
--
-- What changes and why — see README.md "What changed in this
-- update" section for the full explanation. Short version:
--
--  1. Real user accounts (Supabase Auth) with a `profiles` table.
--  2. `reports.owner_id` links a report to the account that made it.
--  3. Only "lost" reports can be self-reported by the public now —
--     "found" reports are created by the Foundly team (admin) only.
--  4. Both lost AND found reports are now visible on the public
--     site, but the public can never read the `contact` column
--     directly any more — every public read goes through the new
--     `list_public_reports` / `get_public_report` functions, which
--     never return it. Only the report's owner (via `list_my_reports`)
--     and admins (via the existing admin-only table policy) can see it.
--  5. A `matched_report_id` link + `identify_email_sent_at` timestamp
--     support the "come identify your item" → "confirm handover" →
--     "resolved, notify both parties" workflow.
--  6. `bookmarks` and `suspicious_reports` tables.
--  7. Admin RPCs to list users, see a user's reports, suspend /
--     reactivate / delete an account.
-- ============================================================

-- ─── SMALL HELPER ──────────────────────────────────────────────
-- Used inside every admin-only function below instead of repeating
-- the same `exists(select ...)` check everywhere.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin from public;
grant execute on function public.is_admin to anon, authenticated;

-- ─── REPORTS: new columns ──────────────────────────────────────
alter table public.reports
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists matched_report_id uuid references public.reports(id) on delete set null,
  add column if not exists identify_email_sent_at timestamptz;

create index if not exists reports_owner_id_idx on public.reports (owner_id);

-- Contact is no longer required at the database level — admin-added
-- "found" items may not have a finder's contact on file (e.g. an
-- anonymous drop-off at the office). The RPCs below still enforce
-- "contact required" for public lost reports in application logic.
alter table public.reports alter column contact drop not null;

-- ─── PROFILES ───────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  full_name    text,
  phone        text,
  is_suspended boolean not null default false,
  suspended_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read their own profile; admins can read everyone's.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- No direct insert/update/delete grants — profile creation happens via
-- the trigger below, and edits go through update_my_profile() so a
-- user can never set their own is_suspended flag.
grant select on public.profiles to authenticated;

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any accounts that already existed before this
-- migration ran (e.g. the admin account you created in step 4 of the
-- original setup).
insert into public.profiles (id, email, full_name)
select u.id, u.email, u.raw_user_meta_data ->> 'full_name'
from auth.users u
on conflict (id) do nothing;

-- Let a signed-in user update their own name/phone. Deliberately does
-- NOT accept is_suspended — that can only change via the admin RPCs.
create or replace function public.update_my_profile(p_full_name text, p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;
  update public.profiles
  set full_name = nullif(trim(p_full_name), ''),
      phone     = nullif(trim(p_phone), '')
  where id = auth.uid();
end;
$$;

revoke all on function public.update_my_profile from public;
grant execute on function public.update_my_profile to authenticated;

-- Lets a page check "is my own account currently suspended?" right
-- after signing in, without needing admin rights.
create or replace function public.am_i_suspended()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_suspended from public.profiles where id = auth.uid()), false);
$$;

revoke all on function public.am_i_suspended from public;
grant execute on function public.am_i_suspended to authenticated;

-- ─── BOOKMARKS ──────────────────────────────────────────────────
-- Simple, fully self-scoped table — safe to let signed-in users read
-- and write their own rows directly through RLS, no RPC needed.
create table if not exists public.bookmarks (
  user_id    uuid not null references auth.users (id) on delete cascade,
  report_id  uuid not null references public.reports (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, report_id)
);

alter table public.bookmarks enable row level security;

drop policy if exists "bookmarks_owner_all" on public.bookmarks;
create policy "bookmarks_owner_all"
  on public.bookmarks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, delete on public.bookmarks to authenticated;

-- ─── SUSPICIOUS POST REPORTS ────────────────────────────────────
create table if not exists public.suspicious_reports (
  id               uuid primary key default gen_random_uuid(),
  report_id        uuid not null references public.reports (id) on delete cascade,
  reporter_id      uuid references auth.users (id) on delete set null,
  reporter_contact text,
  reason           text not null,
  details          text,
  status           text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at       timestamptz not null default now()
);

create index if not exists suspicious_reports_status_idx on public.suspicious_reports (status);

alter table public.suspicious_reports enable row level security;
-- No select/insert/update policies at all for anon/authenticated — every
-- access goes through the SECURITY DEFINER functions below, same pattern
-- as edit_tokens in 0001_init.sql.

-- Anyone (signed in or not) can flag a listing as suspicious.
create or replace function public.report_suspicious_post(
  p_report_id uuid, p_reason text, p_details text default null, p_reporter_contact text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.reports where id = p_report_id) then
    raise exception 'That report no longer exists.';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Please choose a reason.';
  end if;

  insert into public.suspicious_reports (report_id, reporter_id, reporter_contact, reason, details)
  values (p_report_id, auth.uid(), nullif(trim(p_reporter_contact), ''), trim(p_reason), nullif(trim(p_details), ''));
end;
$$;

revoke all on function public.report_suspicious_post from public;
grant execute on function public.report_suspicious_post to anon, authenticated;

-- ── ADMIN: suspicious reports ──────────────────────────────────
create or replace function public.admin_list_suspicious_reports()
returns table (
  id uuid, report_id uuid, reporter_contact text, reason text, details text,
  status text, created_at timestamptz,
  report_title text, report_type text, report_status text
)
language sql
security definer
set search_path = public
as $$
  select
    sr.id, sr.report_id, sr.reporter_contact, sr.reason, sr.details,
    sr.status, sr.created_at,
    r.title, r.type, r.status
  from public.suspicious_reports sr
  join public.reports r on r.id = sr.report_id
  where public.is_admin()
  order by sr.created_at desc;
$$;

revoke all on function public.admin_list_suspicious_reports from public;
grant execute on function public.admin_list_suspicious_reports to authenticated;

create or replace function public.admin_update_suspicious_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required.';
  end if;
  if p_status not in ('open', 'reviewed', 'dismissed') then
    raise exception 'Invalid status.';
  end if;
  update public.suspicious_reports set status = p_status where id = p_id;
end;
$$;

revoke all on function public.admin_update_suspicious_status from public;
grant execute on function public.admin_update_suspicious_status to authenticated;

-- ============================================================
-- PUBLIC READS — replace direct table access with column-safe RPCs
-- ============================================================

-- The public feed (both lost and found) with `contact` always
-- stripped out. This is what index.html / lost.html / found.html
-- call now instead of querying the `reports` table directly.
create or replace function public.list_public_reports(p_type text default null)
returns table (
  id uuid, type text, category text, title text, description text,
  location text, status text, created_at timestamptz, updated_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.type, r.category, r.title, r.description, r.location,
         r.status, r.created_at, r.updated_at, r.resolved_at
  from public.reports r
  where r.status = 'active'
    and (p_type is null or r.type = p_type)
  order by r.created_at desc;
$$;

revoke all on function public.list_public_reports from public;
grant execute on function public.list_public_reports to anon, authenticated;

-- A single public item (e.g. for a detail modal / bookmark lookup),
-- still with `contact` stripped. Works for any non-deleted status so a
-- bookmarked-then-resolved item can still be viewed.
create or replace function public.get_public_report(p_id uuid)
returns table (
  id uuid, type text, category text, title text, description text,
  location text, status text, created_at timestamptz, updated_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.type, r.category, r.title, r.description, r.location,
         r.status, r.created_at, r.updated_at, r.resolved_at
  from public.reports r
  where r.id = p_id and r.status <> 'deleted';
$$;

revoke all on function public.get_public_report from public;
grant execute on function public.get_public_report to anon, authenticated;

-- A signed-in user's own reports, every status, WITH contact — it's
-- their own data. Powers the "My Reports" page.
create or replace function public.list_my_reports()
returns table (
  id uuid, type text, category text, title text, description text,
  location text, contact text, status text, created_at timestamptz,
  updated_at timestamptz, resolved_at timestamptz, deleted_at timestamptz,
  matched_report_id uuid, identify_email_sent_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.type, r.category, r.title, r.description, r.location,
         r.contact, r.status, r.created_at, r.updated_at, r.resolved_at,
         r.deleted_at, r.matched_report_id, r.identify_email_sent_at
  from public.reports r
  where r.owner_id = auth.uid()
  order by r.created_at desc;
$$;

revoke all on function public.list_my_reports from public;
grant execute on function public.list_my_reports to authenticated;

-- Token-gated single-report fetch WITH contact — this is what
-- edit.html uses to display the form (the token itself is the proof
-- of ownership, same as the write RPCs below).
create or replace function public.get_report_by_token(p_id uuid, p_token text)
returns table (
  id uuid, type text, category text, title text, description text,
  location text, contact text, status text, created_at timestamptz,
  updated_at timestamptz, resolved_at timestamptz, deleted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
begin
  select report_id into v_report_id from public.edit_tokens where token = p_token;
  if v_report_id is null or v_report_id <> p_id then
    raise exception 'This edit link is invalid or has expired.';
  end if;

  return query
    select r.id, r.type, r.category, r.title, r.description, r.location,
           r.contact, r.status, r.created_at, r.updated_at, r.resolved_at, r.deleted_at
    from public.reports r
    where r.id = p_id;
end;
$$;

revoke all on function public.get_report_by_token from public;
grant execute on function public.get_report_by_token to anon, authenticated;

-- Lock down direct table access now that the RPCs above cover every
-- legitimate public/owner read path. Only admins may still read the
-- raw `reports` table directly (the admin dashboard's existing
-- fetchAllReportsAdmin() call) — enforced by RLS below.
revoke select on public.reports from anon, authenticated;
grant select on public.reports to authenticated;

drop policy if exists "reports_select_active_or_admin" on public.reports;
drop policy if exists "reports_select_admin_only" on public.reports;
create policy "reports_select_admin_only"
  on public.reports for select
  using (public.is_admin());

-- ============================================================
-- WRITES — lost reports are the only thing the public can create
-- ============================================================

-- Old anonymous create_report(with image_url) is replaced — drop it
-- explicitly so there isn't a stale overload left behind.
drop function if exists public.create_report(text, text, text, text, text, text, text);

create or replace function public.create_report(
  p_category text, p_title text, p_description text, p_location text, p_contact text
) returns table (id uuid, edit_token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id    uuid;
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Please log in to report a lost item.';
  end if;
  if coalesce((select is_suspended from public.profiles where id = auth.uid()), false) then
    raise exception 'Your account has been suspended. Contact the Foundly office for help.';
  end if;
  if coalesce(trim(p_title), '') = ''       then raise exception 'title is required'; end if;
  if coalesce(trim(p_category), '') = ''    then raise exception 'category is required'; end if;
  if coalesce(trim(p_description), '') = '' then raise exception 'description is required'; end if;
  if coalesce(trim(p_location), '') = ''    then raise exception 'location is required'; end if;
  if coalesce(trim(p_contact), '') = ''     then raise exception 'contact is required'; end if;

  insert into public.reports (type, category, title, description, location, contact, owner_id)
  values ('lost', trim(p_category), trim(p_title), trim(p_description), trim(p_location), trim(p_contact), auth.uid())
  returning reports.id into v_id;

  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.edit_tokens (token, report_id) values (v_token, v_id);

  return query select v_id, v_token;
end;
$$;

revoke all on function public.create_report from public;
grant execute on function public.create_report to authenticated;

-- ── Token-gated self-service — now blocked once resolved/deleted ──
drop function if exists public.update_report_by_token(uuid, text, jsonb);
create or replace function public.update_report_by_token(
  p_id uuid, p_token text, p_updates jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
  v_status    text;
begin
  select report_id into v_report_id from public.edit_tokens where token = p_token;
  if v_report_id is null or v_report_id <> p_id then
    raise exception 'This edit link is invalid or has expired.';
  end if;

  select status into v_status from public.reports where id = p_id;
  if v_status in ('resolved', 'deleted') then
    raise exception 'This report has already been % — the edit link no longer works.', v_status;
  end if;

  update public.reports set
    category    = coalesce(p_updates->>'category', category),
    title       = coalesce(p_updates->>'title', title),
    description = coalesce(p_updates->>'description', description),
    location    = coalesce(p_updates->>'location', location),
    contact     = coalesce(p_updates->>'contact', contact),
    updated_at  = now()
  where id = p_id;

  if not found then
    raise exception 'Report not found.';
  end if;
end;
$$;

revoke all on function public.update_report_by_token from public;
grant execute on function public.update_report_by_token to anon, authenticated;

create or replace function public.resolve_report_by_token(p_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
  v_status    text;
begin
  select report_id into v_report_id from public.edit_tokens where token = p_token;
  if v_report_id is null or v_report_id <> p_id then
    raise exception 'This edit link is invalid or has expired.';
  end if;

  select status into v_status from public.reports where id = p_id;
  if v_status in ('resolved', 'deleted') then
    raise exception 'This report has already been % — the edit link no longer works.', v_status;
  end if;

  update public.reports
  set status = 'resolved', resolved_at = now(), updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.resolve_report_by_token from public;
grant execute on function public.resolve_report_by_token to anon, authenticated;

create or replace function public.delete_report_by_token(p_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
  v_status    text;
begin
  select report_id into v_report_id from public.edit_tokens where token = p_token;
  if v_report_id is null or v_report_id <> p_id then
    raise exception 'This edit link is invalid or has expired.';
  end if;

  select status into v_status from public.reports where id = p_id;
  if v_status in ('resolved', 'deleted') then
    raise exception 'This report has already been % — the edit link no longer works.', v_status;
  end if;

  update public.reports
  set status = 'deleted', deleted_at = now(), updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.delete_report_by_token from public;
grant execute on function public.delete_report_by_token to anon, authenticated;

-- ── Owner-based self-service (used by the "My Reports" page — no
-- token in the URL needed, being logged in as the owner is enough) ──
create or replace function public.owner_update_report(p_id uuid, p_updates jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner  uuid;
  v_status text;
begin
  select owner_id, status into v_owner, v_status from public.reports where id = p_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'You can only edit your own reports.';
  end if;
  if v_status in ('resolved', 'deleted') then
    raise exception 'This report has already been % and can no longer be edited.', v_status;
  end if;

  update public.reports set
    category    = coalesce(p_updates->>'category', category),
    title       = coalesce(p_updates->>'title', title),
    description = coalesce(p_updates->>'description', description),
    location    = coalesce(p_updates->>'location', location),
    contact     = coalesce(p_updates->>'contact', contact),
    updated_at  = now()
  where id = p_id;
end;
$$;

revoke all on function public.owner_update_report from public;
grant execute on function public.owner_update_report to authenticated;

create or replace function public.owner_resolve_report(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner  uuid;
  v_status text;
begin
  select owner_id, status into v_owner, v_status from public.reports where id = p_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'You can only manage your own reports.';
  end if;
  if v_status in ('resolved', 'deleted') then
    raise exception 'This report has already been %.', v_status;
  end if;

  update public.reports
  set status = 'resolved', resolved_at = now(), updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.owner_resolve_report from public;
grant execute on function public.owner_resolve_report to authenticated;

create or replace function public.owner_delete_report(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner  uuid;
  v_status text;
begin
  select owner_id, status into v_owner, v_status from public.reports where id = p_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'You can only manage your own reports.';
  end if;
  if v_status in ('resolved', 'deleted') then
    raise exception 'This report has already been %.', v_status;
  end if;

  update public.reports
  set status = 'deleted', deleted_at = now(), updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.owner_delete_report from public;
grant execute on function public.owner_delete_report to authenticated;

-- ============================================================
-- ADMIN — creating found items, matching, identify emails, stats,
-- and user management
-- ============================================================

-- Replaces the 0001 admin_create_report: drops the old image_url
-- signature and no longer requires contact (a "found" item logged by
-- the office might not have the finder's contact on file).
drop function if exists public.admin_create_report(text, text, text, text, text, text, text, text);

create or replace function public.admin_create_report(
  p_type text, p_category text, p_title text, p_description text,
  p_location text, p_contact text default null, p_status text default 'active'
) returns table (id uuid, edit_token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id    uuid;
  v_token text;
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required.';
  end if;
  if p_type not in ('lost', 'found') then
    raise exception 'type must be "lost" or "found"';
  end if;
  if p_status not in ('active', 'resolved', 'deleted') then
    raise exception 'Invalid status.';
  end if;
  if p_type = 'lost' and coalesce(trim(p_contact), '') = '' then
    raise exception 'A contact email is required for lost items.';
  end if;

  insert into public.reports (type, category, title, description, location, contact, status)
  values (p_type, trim(p_category), trim(p_title), trim(p_description), trim(p_location), nullif(trim(p_contact), ''), p_status)
  returning reports.id into v_id;

  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.edit_tokens (token, report_id) values (v_token, v_id);

  return query select v_id, v_token;
end;
$$;

revoke all on function public.admin_create_report from public;
grant execute on function public.admin_create_report to authenticated;

-- Replaces the 0002 admin_update_report: drops image_url handling.
create or replace function public.admin_update_report(p_id uuid, p_updates jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required.';
  end if;

  update public.reports set
    type        = coalesce(p_updates->>'type', type),
    category    = coalesce(p_updates->>'category', category),
    title       = coalesce(p_updates->>'title', title),
    description = coalesce(p_updates->>'description', description),
    location    = coalesce(p_updates->>'location', location),
    contact     = case when p_updates ? 'contact' then p_updates->>'contact' else contact end,
    status      = coalesce(p_updates->>'status', status),
    resolved_at = case when p_updates->>'status' = 'resolved' then now() else resolved_at end,
    deleted_at  = case when p_updates->>'status' = 'deleted'  then now() else deleted_at end,
    updated_at  = now()
  where id = p_id;
end;
$$;

revoke all on function public.admin_update_report from public;
grant execute on function public.admin_update_report to authenticated;

-- Link a lost report to the found report the office believes matches
-- it (or pass p_matched_id = null to unlink). Symmetric — both rows
-- point at each other so either side's page can show the link.
create or replace function public.admin_set_match(p_id uuid, p_matched_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_matched uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required.';
  end if;
  if not exists (select 1 from public.reports where id = p_id) then
    raise exception 'Report not found.';
  end if;

  select matched_report_id into v_old_matched from public.reports where id = p_id;
  if v_old_matched is not null then
    update public.reports set matched_report_id = null where id = v_old_matched;
  end if;

  update public.reports set matched_report_id = p_matched_id, updated_at = now() where id = p_id;

  if p_matched_id is not null then
    if not exists (select 1 from public.reports where id = p_matched_id) then
      raise exception 'Matched report not found.';
    end if;
    update public.reports set matched_report_id = p_id, updated_at = now() where id = p_matched_id;
  end if;
end;
$$;

revoke all on function public.admin_set_match from public;
grant execute on function public.admin_set_match to authenticated;

-- Records that the "come identify your item" email was sent, so the
-- dashboard can show it was already done.
create or replace function public.admin_mark_identify_sent(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required.';
  end if;
  update public.reports set identify_email_sent_at = now() where id = p_id;
end;
$$;

revoke all on function public.admin_mark_identify_sent from public;
grant execute on function public.admin_mark_identify_sent to authenticated;

create or replace function public.admin_delete_permanently(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required.';
  end if;
  delete from public.reports where id = p_id;
end;
$$;

revoke all on function public.admin_delete_permanently from public;
grant execute on function public.admin_delete_permanently to authenticated;

-- ── ADMIN: dashboard stats (Total users / reports / lost / found / resolved) ──
create or replace function public.admin_get_stats()
returns table (
  total_users bigint, total_reports bigint, lost_reports bigint,
  found_reports bigint, resolved_reports bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.reports),
    (select count(*) from public.reports where type = 'lost'),
    (select count(*) from public.reports where type = 'found'),
    (select count(*) from public.reports where status = 'resolved')
  where public.is_admin();
$$;

revoke all on function public.admin_get_stats from public;
grant execute on function public.admin_get_stats to authenticated;

-- ── ADMIN: user management ──────────────────────────────────────
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, full_name text, phone text, is_suspended boolean,
  created_at timestamptz, report_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.email, p.full_name, p.phone, p.is_suspended, p.created_at,
         (select count(*) from public.reports r where r.owner_id = p.id) as report_count
  from public.profiles p
  where public.is_admin()
  order by p.created_at desc;
$$;

revoke all on function public.admin_list_users from public;
grant execute on function public.admin_list_users to authenticated;

create or replace function public.admin_get_user_reports(p_user_id uuid)
returns table (
  id uuid, type text, category text, title text, description text,
  location text, contact text, status text, created_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.type, r.category, r.title, r.description, r.location,
         r.contact, r.status, r.created_at, r.resolved_at
  from public.reports r
  where public.is_admin() and r.owner_id = p_user_id
  order by r.created_at desc;
$$;

revoke all on function public.admin_get_user_reports from public;
grant execute on function public.admin_get_user_reports to authenticated;

create or replace function public.admin_suspend_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required.';
  end if;
  update public.profiles set is_suspended = true, suspended_at = now() where id = p_user_id;
end;
$$;

revoke all on function public.admin_suspend_user from public;
grant execute on function public.admin_suspend_user to authenticated;

create or replace function public.admin_reactivate_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required.';
  end if;
  update public.profiles set is_suspended = false, suspended_at = null where id = p_user_id;
end;
$$;

revoke all on function public.admin_reactivate_user from public;
grant execute on function public.admin_reactivate_user to authenticated;

-- Permanently removes an account. Because this function is created by
-- the same role that owns the `auth` schema in Supabase (the role
-- running your migrations, typically `postgres`), a SECURITY DEFINER
-- function is able to delete straight from `auth.users` — no service
-- role key required. Their profile row is removed via ON DELETE CASCADE,
-- and their past reports are KEPT (for department record-keeping) but
-- unlinked, via reports.owner_id ON DELETE SET NULL.
--
-- If your Supabase project ever restricts this (some setups lock down
-- the `auth` schema further), this call will fail with a permissions
-- error — see the README's "Removing accounts" section for the Edge
-- Function fallback that uses the Admin API + service role key instead.
create or replace function public.admin_delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own admin account from here.';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_delete_user_account from public;
grant execute on function public.admin_delete_user_account to authenticated;
