-- ============================================================
-- FOUNDLY — Migration 0004: fix "column reference id is ambiguous"
-- in create_report()
-- ------------------------------------------------------------
-- Run this the same way as the others (Dashboard → SQL Editor →
-- paste → Run). It only replaces one function; nothing else changes
-- and no data is touched.
--
-- Root cause: create_report() is declared as
--   returns table (id uuid, edit_token text)
-- which makes `id` an implicit output column inside the function's
-- own scope — on top of `profiles.id`, the table column. The
-- suspended-account check did `where id = auth.uid()` with no table
-- qualifier, so Postgres couldn't tell which "id" was meant. Fixed
-- below by qualifying it as `profiles.id`.
-- ============================================================

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
  if coalesce((select is_suspended from public.profiles where profiles.id = auth.uid()), false) then
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
